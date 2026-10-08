// A living planar network: a triangulated rectangle whose frame is one vertex
// at infinity (OMEGA). With OMEGA the graph is a maximal planar graph (a
// triangulation of the sphere); without it, a triangulated disc whose
// boundary vertices are those adjacent to OMEGA. Every vertex keeps its
// neighbours in counter-clockwise order (a rotation system), so faces,
// flips and contractions are local list edits.
//
// Dynamics (all seeded):
// - growth: planar preferential attachment. A new vertex is inserted into a
//   face chosen with probability ∝ (sum of its corners' degrees)^4, so
//   hubs gather crowds (a Random Apollonian Network would choose faces
//   uniformly); at
//   the frame, a boundary edge is split instead, so the frame grows with
//   the network.
// - flux: a random walk with restart (PageRank on the undirected graph,
//   restart ∝ a drifting fitness per vertex). Each edge carries
//   d·(PR_u/deg_u + PR_v/deg_v), normalised by the mean over edges.
// - film: every edge (= wall) has a film whose thickness drains with the
//   square of its flux and recovers toward 1. When it reaches 0 the wall
//   bursts: the two vertices coalesce (edge contraction); if the
//   contraction would break planarity or the frame, the wall swaps instead
//   (an edge flip, a T1 in the foam).
// - rewiring: edges flip at random with a Metropolis acceptance that
//   favours swapping short walls (two large bubbles pinched by two small
//   ones), balanced degrees and links toward where the flux is.
// - vanishing (T2): a bubble the packing squeezes below visibility loses
//   walls one T1 at a time and disappears when it has three, as small
//   bubbles do in a coarsening foam.

export const OMEGA = 0;
/** Vertex ids, including OMEGA. */
export const CAPACITY = 1_024;
/** Highest degree a vertex may reach (OMEGA excluded). */
export const MAX_DEGREE = 45;
export const DEFAULT_TARGET = 160;
export const TARGET_RANGE = [80, 400] as const;
export const DAMPING = 0.85;
/** Births per second at the target size (up to 4× below it, none at 1.25×). */
const BIRTH_RATE = 0.9;
/** Faces are chosen ∝ (sum of corner degrees)^ATTACHMENT: above 1, the rich get richer faster. */
const ATTACHMENT = 4;
/** Flip proposals per edge per second. */
const FLIP_RATE = 0.018;
/** Weight of degree balance (squared distance from 6) in flip acceptance. */
const BALANCE = 0;
/**
 * Weight of the short-wall (T1) term: log(min(r_a, r_b) / min(r_c, r_d))
 * for edge (a, b) with opposite vertices c, d. A wall between two large
 * bubbles pinched by two small ones is short, and swaps.
 */
const PINCH = 1;
/** Weight of flux gained by a flip in its acceptance. */
const FOLLOW = 0.5;
/** Film drainage per second at the mean flux (∝ flux²) and recovery rate. */
export const DRAIN = 0.017;
export const RECOVER = 0.055;
/** Steps of vanishing (one T1 or the final disappearance) per second, over all small bubbles. */
const VANISH_RATE = 6;
/** Fitness: log-fitness follows an Ornstein–Uhlenbeck drift. */
const FITNESS_SPREAD = 1.4;
const FITNESS_RELAX = 1 / 25;

export type Edge = {
  /** Film thickness of the wall, 1 = fresh, 0 = bursts. */
  film: number;
  /** Flux through the wall relative to the mean over walls. */
  flux: number;
};

export type Network = {
  /** CCW neighbours per vertex id; [] for unused ids. */
  rot: number[][];
  alive: Uint8Array;
  corner: Uint8Array;
  logFitness: Float64Array;
  rank: Float64Array;
  edges: Map<number, Edge>;
  free: number[];
  /** Live vertices other than OMEGA. */
  size: number;
  random: () => number;
  /** Increments on every topological change. */
  version: number;
  meanFlux: number;
  /** Accumulates the vanishing steps due. */
  vanishClock: number;
};

export type NetworkEvent =
  | { kind: "birth"; vertex: number; face: readonly [number, number, number] }
  | { kind: "merge"; kept: number; removed: number }
  | { kind: "vanish"; vertex: number; around: readonly number[] }
  | { kind: "flip"; from: readonly [number, number]; to: readonly [number, number] };

export type NetworkParameters = {
  target: number;
  /** Multiplies the fitness drift (how quickly the flux pattern moves). */
  volatility: number;
};

export const DEFAULT_PARAMETERS: NetworkParameters = { target: DEFAULT_TARGET, volatility: 1 };

/** Seeded generator (mulberry32). */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function edgeKey(a: number, b: number) {
  return a < b ? a * CAPACITY + b : b * CAPACITY + a;
}

export function onFrame(net: Network, v: number) {
  return net.rot[v]!.includes(OMEGA);
}

/** Real neighbours (OMEGA excluded). */
export function degree(net: Network, v: number) {
  const list = net.rot[v]!;
  return list.includes(OMEGA) ? list.length - 1 : list.length;
}

function next(net: Network, v: number, w: number) {
  const list = net.rot[v]!;
  return list[(list.indexOf(w) + 1) % list.length]!;
}

function previous(net: Network, v: number, w: number) {
  const list = net.rot[v]!;
  return list[(list.indexOf(w) - 1 + list.length) % list.length]!;
}

function insertAfter(net: Network, v: number, after: number, w: number) {
  const list = net.rot[v]!;
  list.splice(list.indexOf(after) + 1, 0, w);
}

function remove(net: Network, v: number, w: number) {
  const list = net.rot[v]!;
  list.splice(list.indexOf(w), 1);
}

function adjacent(net: Network, a: number, b: number) {
  return net.rot[a]!.includes(b);
}

/** Fewest real neighbours a vertex may keep: interior 3; frame 3 (2 faces); corner 2 (1 face). */
function leastDegree(net: Network, v: number) {
  if (!onFrame(net, v)) return 3;
  return net.corner[v] ? 2 : 3;
}

function allocate(net: Network) {
  const v = net.free.pop();
  if (v === undefined) return null;
  net.alive[v] = 1;
  net.rot[v] = [];
  net.corner[v] = 0;
  net.size += 1;
  return v;
}

function addEdge(net: Network, a: number, b: number, film = 1) {
  if (a === OMEGA || b === OMEGA) return;
  net.edges.set(edgeKey(a, b), { film, flux: 1 });
}

/** Faces (a, b, c), CCW, without OMEGA; each listed once. */
export function faces(net: Network) {
  const result: [number, number, number][] = [];
  for (let v = 1; v < CAPACITY; v += 1) {
    if (!net.alive[v]) continue;
    const list = net.rot[v]!;
    for (let i = 0; i < list.length; i += 1) {
      const w = list[i]!;
      const x = list[(i + 1) % list.length]!;
      if (w === OMEGA || x === OMEGA) continue;
      if (v < w && v < x) result.push([v, w, x]);
    }
  }
  return result;
}

/** Inserts a vertex into the CCW face (a, b, c); a may be OMEGA. */
function insertFace(net: Network, a: number, b: number, c: number) {
  const v = allocate(net);
  if (v === null) return null;
  net.rot[v] = [a, b, c];
  insertAfter(net, a, b, v);
  insertAfter(net, b, c, v);
  insertAfter(net, c, a, v);
  addEdge(net, v, a);
  addEdge(net, v, b);
  addEdge(net, v, c);
  net.rank[v] = 0;
  net.logFitness[v] = (net.random() - 0.5) * FITNESS_SPREAD;
  net.version += 1;
  return v;
}

/** The two vertices opposite edge (a, b): c = next_a(b), d = prev_a(b). */
export function opposite(net: Network, a: number, b: number) {
  return [next(net, a, b), previous(net, a, b)] as const;
}

export function canFlip(net: Network, a: number, b: number) {
  if (a === OMEGA || b === OMEGA || !adjacent(net, a, b)) return false;
  const [c, d] = opposite(net, a, b);
  if (c === OMEGA || d === OMEGA || c === d || adjacent(net, c, d)) return false;
  // A new edge between two frame vertices would be a chord: the packing could not keep the frame straight.
  if (onFrame(net, c) && onFrame(net, d)) return false;
  if (degree(net, a) - 1 < leastDegree(net, a) || degree(net, b) - 1 < leastDegree(net, b)) return false;
  if (degree(net, c) + 1 > MAX_DEGREE || degree(net, d) + 1 > MAX_DEGREE) return false;
  return true;
}

export function flip(net: Network, a: number, b: number) {
  const [c, d] = opposite(net, a, b);
  insertAfter(net, c, a, d);
  insertAfter(net, d, b, c);
  remove(net, a, b);
  remove(net, b, a);
  net.edges.delete(edgeKey(a, b));
  addEdge(net, c, d);
  net.version += 1;
  return [c, d] as const;
}

/** Whether contracting edge (u, v) into u keeps a simple triangulation and a straight frame. */
export function canContract(net: Network, u: number, v: number) {
  if (u === OMEGA || v === OMEGA || !adjacent(net, u, v)) return false;
  if (net.corner[u] && net.corner[v]) return false;
  const [c, d] = opposite(net, u, v);
  // Link condition: the two endpoints share exactly the two opposite vertices.
  let shared = 0;
  for (const w of net.rot[u]!) if (net.rot[v]!.includes(w)) shared += 1;
  if (shared !== 2) return false;
  for (const w of [c, d]) {
    if (w === OMEGA) {
      if (net.rot[OMEGA]!.length - 1 < 6) return false;
    } else if (degree(net, w) - 1 < leastDegree(net, w)) return false;
  }
  const merged = new Set([...net.rot[u]!, ...net.rot[v]!]);
  merged.delete(u);
  merged.delete(v);
  merged.delete(OMEGA);
  if (merged.size > MAX_DEGREE) return false;
  const framed = onFrame(net, u) || onFrame(net, v);
  if (framed) {
    // On the frame, the merged vertex may touch only its two frame neighbours (no chord),
    // and must keep two faces unless it is a corner.
    let frameNeighbours = 0;
    for (const w of merged) if (onFrame(net, w)) frameNeighbours += 1;
    if (frameNeighbours !== 2) return false;
    const isCorner = net.corner[u] || net.corner[v];
    if (merged.size < (isCorner ? 2 : 3)) return false;
  } else if (merged.size < 3) return false;
  return true;
}

/** Contracts edge (u, v) into u; v is freed. */
export function contract(net: Network, u: number, v: number) {
  const [c, d] = opposite(net, u, v);
  const around = net.rot[v]!;
  const start = around.indexOf(u);
  // rot(v) from u: u, d, x1 … xk, c.
  const between: number[] = [];
  for (let step = 2; step < around.length - 1; step += 1) between.push(around[(start + step) % around.length]!);
  const list = net.rot[u]!;
  list.splice(list.indexOf(v), 1, ...between);
  for (const x of between) {
    const xs = net.rot[x]!;
    xs[xs.indexOf(v)] = u;
    if (x === OMEGA) continue;
    const old = net.edges.get(edgeKey(v, x));
    net.edges.delete(edgeKey(v, x));
    addEdge(net, u, x, old?.film ?? 1);
  }
  remove(net, c, v);
  remove(net, d, v);
  net.edges.delete(edgeKey(u, v));
  net.edges.delete(edgeKey(v, c));
  net.edges.delete(edgeKey(v, d));
  if (net.corner[v]) net.corner[u] = net.corner[v]!;
  net.rank[u] = net.rank[u]! + net.rank[v]!;
  net.logFitness[u] = Math.max(net.logFitness[u]!, net.logFitness[v]!) - 0.15;
  release(net, v);
}

/** Splits frame edge (b1, b2), where b2 follows b1 counter-clockwise along the frame: the new vertex joins the frame. */
function splitFrame(net: Network, b1: number, b2: number) {
  // Face (OMEGA, b?, b?) CCW: rot(OMEGA) runs clockwise along the frame? Find the order from the rotation.
  const first = next(net, OMEGA, b1) === b2 ? b1 : b2;
  const second = first === b1 ? b2 : b1;
  const x = next(net, second, first);
  if (x === OMEGA || onFrame(net, x)) return null;
  if (degree(net, x) + 1 > MAX_DEGREE) return null;
  const v = insertFace(net, OMEGA, first, second);
  if (v === null) return null;
  flip(net, first, second);
  return v;
}

function frameTarget(size: number) {
  // About as many frame vertices as a staggered lattice of `size` vertices at aspect 1.9 has.
  return Math.max(12, Math.round(0.9 * 2 * (Math.sqrt(size * 1.9 * 0.866) + Math.sqrt(size / (1.9 * 0.866)))));
}

/**
 * A triangulated rectangle of about `initial` vertices in staggered rows
 * (aspect `aspect`), with OMEGA outside the frame; then a minute of the
 * dynamics. The rows give a nearly even packing to start from.
 */
export function createNetwork(seed = 0x4b0e, initial = DEFAULT_TARGET, aspect = 1.93): Network {
  const net: Network = {
    rot: Array.from({ length: CAPACITY }, () => []),
    alive: new Uint8Array(CAPACITY),
    corner: new Uint8Array(CAPACITY),
    logFitness: new Float64Array(CAPACITY),
    rank: new Float64Array(CAPACITY),
    edges: new Map(),
    free: [],
    size: 0,
    random: seededRandom(seed),
    version: 0,
    meanFlux: 1,
    vanishClock: 0,
  };
  for (let v = CAPACITY - 1; v >= 1; v -= 1) net.free.push(v);
  net.alive[OMEGA] = 1;
  const count = Math.min(initial, CAPACITY - 64);
  const columns = Math.max(3, Math.round(Math.sqrt(count * aspect * 0.866)));
  // An odd number of rows: the top row, like the bottom one, is not staggered (a staggered frame row would make a chord).
  const rows = Math.max(3, 2 * Math.round((count / columns - 1) / 2) + 1);
  const grid: number[][] = [];
  const px: number[] = [];
  const py: number[] = [];
  for (let j = 0; j < rows; j += 1) {
    const row: number[] = [];
    // Staggered rows; the first and last vertex of every row sit on the side lines.
    const offset = j % 2 === 1 ? 0.5 : 0;
    const xs = [0];
    for (let i = 0; i < columns - (offset ? 1 : 0); i += 1) xs.push(i + offset);
    xs.push(columns - 1);
    const unique = [...new Set(xs)].sort((a, b) => a - b);
    for (const x of unique) {
      const v = allocate(net)!;
      px[v] = x;
      py[v] = j * 0.866;
      row.push(v);
    }
    grid.push(row);
  }
  const triangles: [number, number, number][] = [];
  for (let j = 0; j + 1 < rows; j += 1) {
    const lower = grid[j]!;
    const upper = grid[j + 1]!;
    let i = 0;
    let k = 0;
    while (i < lower.length - 1 || k < upper.length - 1) {
      // At a tie, the last triangle must join the two row ends through an interior vertex: below the top
      // row (all frame) that is the lower row's, so the upper row advances first.
      const nextLower = i < lower.length - 1 ? px[lower[i + 1]!]! : Infinity;
      const nextUpper = k < upper.length - 1 ? px[upper[k + 1]!]! : Infinity;
      const advanceLower = nextLower < nextUpper || (nextLower === nextUpper && j + 1 !== rows - 1);
      if (advanceLower) {
        triangles.push([lower[i]!, lower[i + 1]!, upper[k]!]);
        i += 1;
      } else {
        triangles.push([lower[i]!, upper[k + 1]!, upper[k]!]);
        k += 1;
      }
    }
  }
  const neighbours = new Map<number, Set<number>>();
  for (const [a, b, c] of triangles) {
    for (const [u, w] of [[a, b], [b, c], [c, a]] as const) {
      if (!neighbours.has(u)) neighbours.set(u, new Set());
      if (!neighbours.has(w)) neighbours.set(w, new Set());
      neighbours.get(u)!.add(w);
      neighbours.get(w)!.add(u);
    }
  }
  // The frame, CCW: bottom row left to right, right ends upward, top row right to left, left ends downward.
  const frame: number[] = [...grid[0]!];
  for (let j = 1; j < rows - 1; j += 1) frame.push(grid[j]![grid[j]!.length - 1]!);
  frame.push(...[...grid[rows - 1]!].reverse());
  for (let j = rows - 2; j >= 1; j -= 1) frame.push(grid[j]![0]!);
  const onRing = new Set(frame);
  for (const [v, set] of neighbours) {
    const sorted = [...set].sort((a, b) => Math.atan2(py[a]! - py[v]!, px[a]! - px[v]!) - Math.atan2(py[b]! - py[v]!, px[b]! - px[v]!));
    if (onRing.has(v)) {
      // Rotate so the list runs from the next frame vertex round the interior to the previous one, then OMEGA.
      const at = frame.indexOf(v);
      const after = frame[(at + 1) % frame.length]!;
      const start = sorted.indexOf(after);
      net.rot[v] = [...sorted.slice(start), ...sorted.slice(0, start), OMEGA];
    } else net.rot[v] = sorted;
    for (const w of set) if (v < w) addEdge(net, v, w);
  }
  net.rot[OMEGA] = [...frame].reverse();
  // Corners carry labels 1–4: bottom-left, bottom-right, top-right, top-left (CCW, y up).
  const top = grid[rows - 1]!;
  net.corner[grid[0]![0]!] = 1;
  net.corner[grid[0]![grid[0]!.length - 1]!] = 2;
  net.corner[top[top.length - 1]!] = 3;
  net.corner[top[0]!] = 4;
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) net.logFitness[v] = (net.random() - 0.5) * FITNESS_SPREAD;
  computeFlux(net, 60);
  const parameters = { ...DEFAULT_PARAMETERS, target: initial };
  for (let step = 0; step < 600; step += 1) stepNetwork(net, 0.1, parameters);
  return net;
}

function pickWeighted<T>(net: Network, items: readonly T[], weight: (item: T) => number) {
  let total = 0;
  for (const item of items) total += weight(item);
  let at = net.random() * total;
  for (const item of items) {
    at -= weight(item);
    if (at <= 0) return item;
  }
  return items[items.length - 1];
}

/** One birth: into a face (preferential attachment) or, when the frame is short, splitting a frame edge. */
export function grow(net: Network): NetworkEvent | null {
  if (net.free.length === 0) return null;
  const frameSize = net.rot[OMEGA]!.length;
  if (frameSize < frameTarget(net.size)) {
    const frameEdges: [number, number][] = [];
    const ring = net.rot[OMEGA]!;
    for (let i = 0; i < ring.length; i += 1) frameEdges.push([ring[i]!, ring[(i + 1) % ring.length]!]);
    const choice = pickWeighted(net, frameEdges, ([a, b]) => degree(net, a) + degree(net, b));
    if (choice) {
      const v = splitFrame(net, choice[0], choice[1]);
      if (v !== null) return { kind: "birth", vertex: v, face: [OMEGA, choice[0], choice[1]] };
    }
  }
  const list = faces(net).filter(([a, b, c]) => degree(net, a) < MAX_DEGREE && degree(net, b) < MAX_DEGREE && degree(net, c) < MAX_DEGREE);
  const face = pickWeighted(net, list, ([a, b, c]) => (degree(net, a) + degree(net, b) + degree(net, c)) ** ATTACHMENT);
  if (!face) return null;
  const v = insertFace(net, face[0], face[1], face[2]);
  return v === null ? null : { kind: "birth", vertex: v, face };
}

/** Inserts a vertex into a given CCW face (a participant's tap). */
export function growInto(net: Network, face: readonly [number, number, number]): NetworkEvent | null {
  const [a, b, c] = face;
  if (!net.alive[a] || !net.alive[b] || !net.alive[c] || next(net, a, b) !== c) return null;
  if (net.free.length === 0 || degree(net, a) >= MAX_DEGREE || degree(net, b) >= MAX_DEGREE || degree(net, c) >= MAX_DEGREE) return null;
  const v = insertFace(net, a, b, c);
  return v === null ? null : { kind: "birth", vertex: v, face };
}

function fluxOf(net: Network, a: number, b: number) {
  return DAMPING * (net.rank[a]! / Math.max(1, degree(net, a)) + net.rank[b]! / Math.max(1, degree(net, b)));
}

function randomEdge(net: Network) {
  const count = net.edges.size;
  if (count === 0) return null;
  // Edges are keyed; sample a vertex by degree, then one of its neighbours (uniform over edge ends).
  for (let tries = 0; tries < 8; tries += 1) {
    const v = 1 + Math.floor(net.random() * (CAPACITY - 1));
    if (!net.alive[v]) continue;
    const list = net.rot[v]!;
    const w = list[Math.floor(net.random() * list.length)]!;
    if (w !== OMEGA) return [v, w] as const;
  }
  return null;
}

/** Proposes one flip; Metropolis on wall shortness (with radii), degree balance and flux gained. */
export function proposeFlip(net: Network, radius?: Float64Array): NetworkEvent | null {
  const edge = randomEdge(net);
  if (!edge) return null;
  const [a, b] = edge;
  if (!canFlip(net, a, b)) return null;
  const [c, d] = opposite(net, a, b);
  const da = degree(net, a);
  const db = degree(net, b);
  const dc = degree(net, c);
  const dd = degree(net, d);
  // Change of Σ(deg − 6)².
  const balance = 2 * (dc + dd - da - db) + 4;
  const mean = net.meanFlux || 1;
  const gained = (fluxOf(net, c, d) - fluxOf(net, a, b)) / mean;
  // The smaller of the wall's two bubbles against the smaller of the two that pinch it: a hub's walls to
  // its crowd are not pinched (small on both sides); a wall between larger bubbles squeezed by a small
  // one (a newborn, or a nested speck) is, and swaps so the small one gains a wall.
  const pinch = radius ? Math.log(Math.min(radius[a]!, radius[b]!) / Math.min(radius[c]!, radius[d]!)) : 0;
  const energy = BALANCE * balance - FOLLOW * gained - PINCH * pinch;
  if (energy > 0 && net.random() > Math.exp(-energy)) return null;
  const film = net.edges.get(edgeKey(a, b))?.film ?? 1;
  flip(net, a, b);
  const created = net.edges.get(edgeKey(c, d));
  if (created) created.film = Math.max(0.6, film);
  return { kind: "flip", from: [a, b], to: [c, d] };
}

/** Frees a vertex that no longer has neighbours. */
function release(net: Network, v: number) {
  net.rot[v] = [];
  net.alive[v] = 0;
  net.corner[v] = 0;
  net.rank[v] = 0;
  // Reused last, so a vanished bubble can finish shrinking on screen first.
  net.free.unshift(v);
  net.size -= 1;
  net.version += 1;
}

/**
 * One step of a small bubble's disappearance (T2): while it has more than
 * three walls, its wall with the best-connected neighbour swaps away (T1);
 * with three, it vanishes and its neighbours close over it. On the frame it
 * goes once it touches only its two frame neighbours and one other.
 */
export function vanishStep(net: Network, v: number): NetworkEvent | null {
  if (v === OMEGA || !net.alive[v] || net.corner[v]) return null;
  const framed = onFrame(net, v);
  const real = net.rot[v]!.filter((w) => w !== OMEGA);
  if (real.length > 3) {
    let best = -1;
    for (const w of real) {
      if (framed && onFrame(net, w)) continue;
      if (!canFlip(net, v, w)) continue;
      if (best < 0 || degree(net, w) > degree(net, best)) best = w;
    }
    if (best < 0) return null;
    const to = flip(net, v, best);
    return { kind: "flip", from: [v, best], to };
  }
  if (!framed) {
    for (const w of real) if (degree(net, w) - 1 < leastDegree(net, w)) return null;
    for (const w of real) {
      remove(net, w, v);
      net.edges.delete(edgeKey(v, w));
    }
    release(net, v);
    return { kind: "vanish", vertex: v, around: real };
  }
  // rot(v) = [after, x, before, OMEGA].
  const list = net.rot[v]!;
  const at = list.indexOf(OMEGA);
  const after = list[(at + 1) % 4]!;
  const x = list[(at + 2) % 4]!;
  const before = list[(at + 3) % 4]!;
  if (onFrame(net, x) || adjacent(net, after, before)) return null;
  if (degree(net, x) - 1 < leastDegree(net, x) || net.rot[OMEGA]!.length - 1 < 8) return null;
  const afterList = net.rot[after]!;
  afterList[afterList.indexOf(v)] = before;
  const beforeList = net.rot[before]!;
  beforeList[beforeList.indexOf(v)] = after;
  remove(net, x, v);
  remove(net, OMEGA, v);
  for (const w of [after, x, before]) net.edges.delete(edgeKey(v, w));
  addEdge(net, after, before);
  release(net, v);
  return { kind: "vanish", vertex: v, around: [after, x, before] };
}

const scratch = new Float64Array(CAPACITY);

/** Power-iteration steps of the random walk with restart, then edge flux. */
export function computeFlux(net: Network, iterations: number) {
  const rank = net.rank;
  let fitnessTotal = 0;
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) fitnessTotal += Math.exp(net.logFitness[v]!);
  let total = 0;
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) total += rank[v]!;
  if (total <= 0) for (let v = 1; v < CAPACITY; v += 1) rank[v] = net.alive[v] ? 1 / net.size : 0;
  else if (Math.abs(total - 1) > 1e-9) for (let v = 1; v < CAPACITY; v += 1) rank[v] = rank[v]! / total;
  for (let step = 0; step < iterations; step += 1) {
    scratch.fill(0);
    for (let v = 1; v < CAPACITY; v += 1) {
      if (!net.alive[v]) continue;
      const share = rank[v]! / degree(net, v);
      for (const w of net.rot[v]!) if (w !== OMEGA) scratch[w] = scratch[w]! + share;
    }
    for (let v = 1; v < CAPACITY; v += 1) {
      rank[v] = net.alive[v] ? (1 - DAMPING) * Math.exp(net.logFitness[v]!) / fitnessTotal + DAMPING * scratch[v]! : 0;
    }
  }
  let sum = 0;
  for (const [key, edge] of net.edges) {
    const a = Math.floor(key / CAPACITY);
    const b = key % CAPACITY;
    edge.flux = fluxOf(net, a, b);
    sum += edge.flux;
  }
  net.meanFlux = net.edges.size > 0 ? sum / net.edges.size : 1;
  for (const edge of net.edges.values()) edge.flux /= net.meanFlux;
}

/**
 * Advances the network by `seconds`; returns its topological events.
 * `radius` (packing radii) enables short-wall swaps; `small` marks bubbles
 * the packing has squeezed below visibility, which then vanish (T2).
 */
export function stepNetwork(
  net: Network,
  seconds: number,
  parameters: NetworkParameters,
  radius?: Float64Array,
  small?: Uint8Array,
): NetworkEvent[] {
  const events: NetworkEvent[] = [];
  const random = net.random;
  // Fitness drifts (Ornstein–Uhlenbeck on log-fitness), so the flux pattern wanders.
  const drift = FITNESS_RELAX * parameters.volatility;
  const noise = FITNESS_SPREAD * Math.sqrt(2 * drift * seconds);
  for (let v = 1; v < CAPACITY; v += 1) {
    if (!net.alive[v]) continue;
    const gaussian = Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
    net.logFitness[v] = net.logFitness[v]! * (1 - drift * seconds) + noise * gaussian;
  }
  computeFlux(net, 1);

  // Births, more often below the target size, none above it.
  const deficit = 1 - net.size / parameters.target;
  const births = BIRTH_RATE * Math.min(4, Math.max(0, 1 + 4 * deficit)) * seconds;
  let pending = births;
  while (pending > 0) {
    if (random() < Math.min(1, pending)) {
      const event = grow(net);
      if (event) events.push(event);
    }
    pending -= 1;
  }

  // Rewiring.
  let proposals = FLIP_RATE * net.edges.size * seconds;
  while (proposals > 0) {
    if (random() < Math.min(1, proposals)) {
      const event = proposeFlip(net, radius);
      if (event) events.push(event);
    }
    proposals -= 1;
  }

  // Squeezed bubbles shrink away, one wall at a time.
  if (small) {
    net.vanishClock += seconds * VANISH_RATE;
    for (let v = 1; v < CAPACITY && net.vanishClock >= 1; v += 1) {
      if (!small[v] || !net.alive[v]) continue;
      net.vanishClock -= 1;
      const event = vanishStep(net, v);
      if (event) events.push(event);
    }
    net.vanishClock = Math.min(net.vanishClock, 1);
  }

  // Films drain with their flux; a wall that runs out bursts.
  const floor = net.size < parameters.target * 0.6;
  let burst: [number, number] | null = null;
  for (const [key, edge] of net.edges) {
    edge.film += (RECOVER * (1 - edge.film) - DRAIN * edge.flux * edge.flux) * seconds;
    if (edge.film < 0) {
      edge.film = 0;
      if (!floor && !burst) burst = [Math.floor(key / CAPACITY), key % CAPACITY];
    }
    if (edge.film > 1) edge.film = 1;
  }
  if (burst) {
    const [a, b] = burst;
    // The bubble with more rank keeps its identity.
    const [u, v] = net.rank[a]! >= net.rank[b]! ? [a, b] : [b, a];
    if (canContract(net, u, v)) {
      contract(net, u, v);
      events.push({ kind: "merge", kept: u, removed: v });
    } else if (canContract(net, v, u)) {
      contract(net, v, u);
      events.push({ kind: "merge", kept: v, removed: u });
    } else if (canFlip(net, a, b)) {
      const to = flip(net, a, b);
      events.push({ kind: "flip", from: [a, b], to });
    } else {
      const edge = net.edges.get(edgeKey(a, b));
      if (edge) edge.film = 0.3;
    }
  }
  return events;
}

/** Checks the rotation system: symmetric, every CCW corner a face, a straight frame. Returns problems. */
export function validate(net: Network) {
  const problems: string[] = [];
  let count = 0;
  for (let v = 0; v < CAPACITY; v += 1) {
    if (!net.alive[v]) {
      if (net.rot[v]!.length) problems.push(`dead ${v} has neighbours`);
      continue;
    }
    if (v !== OMEGA) count += 1;
    const list = net.rot[v]!;
    if (new Set(list).size !== list.length) problems.push(`${v} repeats a neighbour`);
    for (let i = 0; i < list.length; i += 1) {
      const w = list[i]!;
      const x = list[(i + 1) % list.length]!;
      if (!net.alive[w]) problems.push(`${v} lists dead ${w}`);
      if (!net.rot[w]!.includes(v)) problems.push(`${v}–${w} not symmetric`);
      // (v, w, x) must be a CCW face: in rot(w), next(x) = v.
      if (next(net, w, x) !== v) problems.push(`corner ${v}:${w},${x} is not a face`);
      if (v !== OMEGA && w !== OMEGA && !net.edges.has(edgeKey(v, w))) problems.push(`edge ${v}–${w} has no film`);
    }
    if (v === OMEGA) continue;
    const framed = list.includes(OMEGA);
    if (degree(net, v) < leastDegree(net, v)) problems.push(`${v} degree ${degree(net, v)} too low`);
    if (degree(net, v) > MAX_DEGREE) problems.push(`${v} degree ${degree(net, v)} too high`);
    if (framed) {
      let frameNeighbours = 0;
      for (const w of list) if (w !== OMEGA && net.rot[w]!.includes(OMEGA)) frameNeighbours += 1;
      if (frameNeighbours !== 2) problems.push(`frame vertex ${v} has a chord`);
    } else if (net.corner[v]) problems.push(`corner ${v} left the frame`);
  }
  if (count !== net.size) problems.push(`size ${net.size} but ${count} live`);
  const labels = [];
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v] && net.corner[v]) labels.push(net.corner[v]);
  if (labels.sort().join() !== "1,2,3,4") problems.push(`corners ${labels.join()}`);
  // Corners appear in label order along the frame.
  const order = frameCycle(net).filter((v) => net.corner[v]).map((v) => net.corner[v]);
  if (order.join() !== "1,2,3,4") problems.push(`corner order ${order.join()}`);
  // Euler: a triangulation of the sphere has E = 3V − 6.
  let ends = 0;
  for (let v = 0; v < CAPACITY; v += 1) if (net.alive[v]) ends += net.rot[v]!.length;
  if (ends / 2 !== 3 * (net.size + 1) - 6) problems.push(`E ${ends / 2} ≠ 3V − 6`);
  return problems;
}

/** Frame vertices in CCW order (y up), starting at corner 1. */
export function frameCycle(net: Network) {
  const ring = [...net.rot[OMEGA]!].reverse();
  const start = ring.findIndex((v) => net.corner[v] === 1);
  return [...ring.slice(start), ...ring.slice(0, start)];
}

/**
 * Moves one corner one step forward (CCW) along the frame. `wider` lengthens
 * the bottom and top sides (corner 2 or 4 moves); otherwise corner 3 or 1
 * moves and the left and right sides lengthen. `which` alternates the two.
 */
export function shiftCorner(net: Network, wider: boolean, which: number) {
  const cycle = frameCycle(net);
  const label = wider ? (which % 2 === 0 ? 2 : 4) : which % 2 === 0 ? 3 : 1;
  const from = cycle.findIndex((v) => net.corner[v] === label);
  if (from < 0) return false;
  const v = cycle[from]!;
  const w = cycle[(from + 1) % cycle.length]!;
  if (net.corner[w]) return false;
  // The vertex that stops being a corner must keep two faces.
  if (degree(net, v) < 3) return false;
  net.corner[v] = 0;
  net.corner[w] = label;
  net.version += 1;
  return true;
}
