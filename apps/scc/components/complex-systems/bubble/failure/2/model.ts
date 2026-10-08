// A self-evolving bubble raft whose contact graph is a random Apollonian
// network (Andrade et al., PRL 94, 018702 (2005); Zhou, Yan & Wang, PRE 71,
// 046141 (2005)), built as the network's own geometry: a random Apollonian
// packing with a free, growing edge.
//
// Every triangular face of the graph is a gap where three mutually touching
// bubbles meet. A bubble nucleates in such a gap with exactly the size and
// place that touch all three (Descartes' circle theorem in its complex form,
// Lagarias, Mallows & Wilks, Amer. Math. Monthly 109, 338 (2002)), so a wall
// is always a link and a link is always a wall, and the face splits into
// three. Gaps next to a large bubble are many, so large bubbles keep gaining
// neighbours, and sizes follow the packing's power law.
//
// Gas is the network's flow. Every bubble passes gas through each wall it
// shares, leaning toward larger neighbours (lower Laplace pressure), and gas
// dissolved in the liquid is re-supplied evenly:
//   dV_i/dt = λ [ d Σ_j V_j w_ji / W_j + (1 − d) / N − V_i ],
//   w_ij → a_j / Σ_k a_k,  a_j = V_j + floor / N,
// so the stationary volumes are PageRank on the raft's contacts; the gas
// crossing each wall is what its film shows.
//
// The raft also grows at its edge: a bubble settles against two neighbouring
// edge bubbles, touching both, and the gap it closes behind it is filled as
// any other. Node 0 stands for the open water around the raft; edge bubbles
// are linked to it so the edge is a ring of faces too. It is not a bubble.
//
// Bubbles also die. An old bubble that still touches only its first
// neighbours coalesces into the largest of them: their shared wall ruptures,
// its gas pours across, and it is removed, which reopens its gap exactly.

export const MAX_BUBBLES = 896;
export const DEFAULT_BUBBLES = 420;
export const POPULATION_RANGE = [60, MAX_BUBBLES] as const;
export const DEFAULT_DAMPING = 0.85;
export const DAMPING_RANGE = [0.5, 0.97] as const;
/** New bubbles per second. */
export const GROWTH_RANGE = [0, 6] as const;
/** Appeal floor in units of 1/N: small favours large neighbours, large is even. */
export const FLOOR_RANGE = [0.05, 20] as const;
/** Seconds of a coalescence: the wall ruptures, then the gas pours across. */
export const RUPTURE_SECONDS = 0.4;
export const POUR_SECONDS = 0.9;
/** Gaps that would hold a bubble smaller than this share of the raft's bound stay empty. */
export const SMALLEST = 0.0055;
const MIN_AGE = 10;
const RIM = 0;
/** The raft keeps within a disc of this radius (its units). */
const BOUND = 1;

export type Foam = {
  size: number;
  /** Centre (x, z) and radius per node, in units of the raft's bound; node 0 is the open water. */
  readonly x: Float64Array;
  readonly z: Float64Array;
  readonly radius: Float64Array;
  readonly links: number[][];
  readonly weights: number[][];
  /** Faces as node triples, and per face the node across from it (the one it was cut from). */
  cells: number[];
  across: number[];
  /** Gas as a share of all gas (the rim holds none). */
  readonly volume: Float64Array;
  readonly age: Float64Array;
  readonly into: Int32Array;
  readonly merging: Float64Array;
  readonly identity: Float64Array;
  /** Per bubble, the node across the face it was born in (restored when it leaves). */
  readonly origin: Int32Array;
  nextIdentity: number;
  damping: number;
  randomState: number;
};

export type FoamParameters = { growth: number; floor: number; exchange: number; population: number };

export const DEFAULT_PARAMETERS: FoamParameters = { growth: 2, floor: 0.6, exchange: 0.4, population: DEFAULT_BUBBLES };

export type FoamEvent =
  | { kind: "birth"; bubble: number }
  | { kind: "coalesce"; bubble: number; into: number }
  | { kind: "remove"; bubble: number; moved: number };

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

export function randomFor(foam: Foam) {
  return () => {
    const [value, next] = nextRandom(foam.randomState);
    foam.randomState = next;
    return value;
  };
}

function link(foam: Foam, a: number, b: number) {
  if (!foam.links[a]!.includes(b)) {
    foam.links[a]!.push(b);
    foam.weights[a]!.push(0);
  }
  if (!foam.links[b]!.includes(a)) {
    foam.links[b]!.push(a);
    foam.weights[b]!.push(0);
  }
}

function append(foam: Foam, x: number, z: number, radius: number) {
  const node = foam.size;
  foam.size += 1;
  foam.links.push([]);
  foam.weights.push([]);
  foam.x[node] = x;
  foam.z[node] = z;
  foam.radius[node] = radius;
  foam.volume[node] = 0;
  foam.age[node] = 0;
  foam.into[node] = -1;
  foam.merging[node] = 0;
  foam.identity[node] = foam.nextIdentity;
  foam.nextIdentity += 1;
  return node;
}

function curvature(foam: Foam, node: number) {
  return 1 / foam.radius[node]!;
}

/**
 * The circle in face (a, b, c) touching all three, away from `opposite`
 * (Descartes, complex form). Returns null if it would be too small.
 */
export function gapCircle(foam: Foam, a: number, b: number, c: number, across: number) {
  // The open water is not a circle; across it, the gap is simply the smaller solution.
  const opposite = across === RIM ? -1 : across;
  const nodes = [a, b, c];
  const k = nodes.map((node) => curvature(foam, node));
  const zx = nodes.map((node) => foam.x[node]!);
  const zy = nodes.map((node) => foam.z[node]!);
  const root = Math.sqrt(Math.max(k[0]! * k[1]! + k[1]! * k[2]! + k[2]! * k[0]!, 0));
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < 3; i += 1) {
    sx += k[i]! * zx[i]!;
    sy += k[i]! * zy[i]!;
  }
  let px = 0;
  let py = 0;
  for (const [i, j] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ] as const) {
    const kk = k[i]! * k[j]!;
    px += kk * (zx[i]! * zx[j]! - zy[i]! * zy[j]!);
    py += kk * (zx[i]! * zy[j]! + zy[i]! * zx[j]!);
  }
  const magnitude = Math.hypot(px, py);
  const rx = Math.sqrt(Math.max((magnitude + px) / 2, 0));
  const ry = (py < 0 ? -1 : 1) * Math.sqrt(Math.max((magnitude - px) / 2, 0));
  let best: { x: number; z: number; radius: number } | null = null;
  let bestError = Infinity;
  // With nothing across the gap, the gap's own circle is the smaller solution.
  for (const kSign of opposite < 0 ? [1] : [1, -1]) {
    const k4 = k[0]! + k[1]! + k[2]! + 2 * kSign * root;
    if (k4 <= 1e-9) continue;
    for (const zSign of [1, -1]) {
      const x = (sx + 2 * zSign * rx) / k4;
      const z = (sy + 2 * zSign * ry) / k4;
      const radius = 1 / k4;
      if (opposite >= 0 && Math.hypot(x - foam.x[opposite]!, z - foam.z[opposite]!) < 0.02 * radius + 1e-6) continue;
      let error = 0;
      for (const node of nodes) {
        const distance = Math.hypot(x - foam.x[node]!, z - foam.z[node]!);
        error += Math.abs(distance - foam.radius[node]! - radius);
      }
      if (error < bestError) {
        bestError = error;
        best = { x, z, radius };
      }
    }
  }
  if (!best || bestError > 2e-3 * (1 + best.radius) || best.radius < SMALLEST) return null;
  return best;
}

function normalise(foam: Foam) {
  let total = 0;
  for (let node = 1; node < foam.size; node += 1) total += foam.volume[node]!;
  if (total > 0) for (let node = 1; node < foam.size; node += 1) foam.volume[node] = foam.volume[node]! / total;
}

/**
 * Where a new bubble would sit at the edge, against edge bubbles a and b
 * (touching both, outside the raft, away from `inside`), with a radius drawn
 * from `u`; null if it would overlap anything or leave the bound.
 */
function edgeCircle(foam: Foam, a: number, b: number, inside: number, u: number) {
  const ra = foam.radius[a]!;
  const rb = foam.radius[b]!;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const radius = Math.max(SMALLEST, (0.18 + 0.85 * u * u * u) * Math.max(ra, rb) * 0.75 ** attempt);
    const ax = foam.x[a]!;
    const az = foam.z[a]!;
    const dx = foam.x[b]! - ax;
    const dz = foam.z[b]! - az;
    const d = Math.hypot(dx, dz);
    const da = ra + radius;
    const db = rb + radius;
    const along = (d * d + da * da - db * db) / (2 * d);
    const across2 = da * da - along * along;
    if (across2 <= 0) continue;
    const across = Math.sqrt(across2);
    const ux = dx / d;
    const uz = dz / d;
    // The side away from the bubble inside this edge.
    const side = inside >= 0 ? -Math.sign((foam.x[inside]! - ax) * -uz + (foam.z[inside]! - az) * ux) || 1 : 1;
    const x = ax + ux * along - uz * across * side;
    const z = az + uz * along + ux * across * side;
    if (Math.hypot(x, z) + radius > BOUND) continue;
    let clear = true;
    for (let node = 1; node < foam.size && clear; node += 1) {
      if (node === a || node === b) continue;
      if (Math.hypot(x - foam.x[node]!, z - foam.z[node]!) < foam.radius[node]! + radius - 1e-9) clear = false;
    }
    if (clear) return { x, z, radius };
  }
  return null;
}

function hasRim(foam: Foam, face: number) {
  return foam.cells[face * 3] === RIM || foam.cells[face * 3 + 1] === RIM || foam.cells[face * 3 + 2] === RIM;
}

/** The inside corner of the face across edge (a, b) from the open water. */
function insideOf(foam: Foam, a: number, b: number) {
  for (let face = 0; face < foam.cells.length / 3; face += 1) {
    const triple = foam.cells.slice(face * 3, face * 3 + 3);
    if (triple.includes(RIM) || !triple.includes(a) || !triple.includes(b)) continue;
    return triple.find((node) => node !== a && node !== b) ?? -1;
  }
  return -1;
}

/** Faces whose gap can hold a bubble (none of its corners leaving, gap large enough), edge faces included. */
function openFaces(foam: Foam) {
  const faces: number[] = [];
  for (let face = 0; face < foam.cells.length / 3; face += 1) {
    const [a, b, c] = foam.cells.slice(face * 3, face * 3 + 3) as [number, number, number];
    if (foam.into[a]! >= 0 || foam.into[b]! >= 0 || foam.into[c]! >= 0) continue;
    if (hasRim(foam, face)) faces.push(face);
    else if (gapCircle(foam, a, b, c, foam.across[face]!)) faces.push(face);
  }
  return faces;
}

/** Nucleates a bubble in face `face` (a gap, or an edge of the raft); null if it does not fit. */
export function nucleate(foam: Foam, face: number, u = 0.5) {
  if (foam.size >= MAX_BUBBLES || face < 0 || face * 3 >= foam.cells.length) return null;
  const [a, b, c] = foam.cells.slice(face * 3, face * 3 + 3) as [number, number, number];
  if ([a, b, c].some((corner) => foam.into[corner]! >= 0)) return null;
  let circle: { x: number; z: number; radius: number } | null;
  if (hasRim(foam, face)) {
    const [p, q] = [a, b, c].filter((node) => node !== RIM) as [number, number];
    circle = edgeCircle(foam, p, q, insideOf(foam, p, q), u);
  } else circle = gapCircle(foam, a, b, c, foam.across[face]!);
  if (!circle) return null;
  const bubble = append(foam, circle.x, circle.z, circle.radius);
  foam.origin[bubble] = foam.across[face]!;
  foam.volume[bubble] = 0.2 / Math.max(1, foam.size);
  link(foam, bubble, a);
  link(foam, bubble, b);
  link(foam, bubble, c);
  foam.cells[face * 3 + 2] = bubble;
  foam.across[face] = c;
  foam.cells.push(b, c, bubble, c, a, bubble);
  foam.across.push(a, b);
  normalise(foam);
  return bubble;
}

export function createFoam(size = DEFAULT_BUBBLES, seed = 0x2545f491): Foam {
  const foam: Foam = {
    size: 0,
    x: new Float64Array(MAX_BUBBLES + 1),
    z: new Float64Array(MAX_BUBBLES + 1),
    radius: new Float64Array(MAX_BUBBLES + 1),
    links: [],
    weights: [],
    cells: [],
    across: [],
    volume: new Float64Array(MAX_BUBBLES + 1),
    age: new Float64Array(MAX_BUBBLES + 1),
    into: new Int32Array(MAX_BUBBLES + 1).fill(-1),
    merging: new Float64Array(MAX_BUBBLES + 1),
    identity: new Float64Array(MAX_BUBBLES + 1),
    origin: new Int32Array(MAX_BUBBLES + 1).fill(-1),
    nextIdentity: 0,
    damping: DEFAULT_DAMPING,
    randomState: seed >>> 0 || 1,
  };
  const random = randomFor(foam);
  append(foam, 0, 0, 1);
  // Three unequal bubbles touching each other near the middle.
  const r1 = 0.2 + 0.08 * random();
  const r2 = 0.13 + 0.08 * random();
  const r3 = 0.09 + 0.07 * random();
  const turn = random() * Math.PI * 2;
  append(foam, Math.cos(turn) * r1 * 0.6, Math.sin(turn) * r1 * 0.6, r1);
  const x1 = foam.x[1]!;
  const z1 = foam.z[1]!;
  append(foam, x1 - Math.cos(turn) * (r1 + r2), z1 - Math.sin(turn) * (r1 + r2), r2);
  const third = edgeCircle(foam, 1, 2, -1, 0)!;
  append(foam, third.x, third.z, r3 > third.radius ? third.radius : third.radius);
  for (let a = 0; a < 4; a += 1) for (let b = a + 1; b < 4; b += 1) link(foam, a, b);
  // The middle gap, and the edge between each pair and the open water.
  foam.cells.push(1, 2, 3, 0, 1, 2, 0, 2, 3, 0, 3, 1);
  foam.across.push(-1, 3, 1, 2);
  const target = Math.max(4, Math.min(MAX_BUBBLES, size + 1));
  let attempts = 0;
  while (foam.size < target && attempts < 40 * target) {
    attempts += 1;
    const faces = openFaces(foam);
    if (faces.length === 0) break;
    nucleate(foam, faces[Math.floor(random() * faces.length)]!, random());
  }
  for (let node = 1; node < foam.size; node += 1) {
    foam.age[node] = random() * 60;
    foam.volume[node] = 1 / (foam.size - 1);
  }
  for (let step = 0; step < 300; step += 1) exchange(foam, 0.1, { ...DEFAULT_PARAMETERS, exchange: 1 });
  return foam;
}

export function setDamping(foam: Foam, damping: number) {
  foam.damping = Math.min(DAMPING_RANGE[1], Math.max(DAMPING_RANGE[0], damping));
}

/** Attention relaxes toward appeal; gas moves along the links (the rim takes no part). */
function exchange(foam: Foam, seconds: number, parameters: FoamParameters) {
  const n = foam.size;
  const floor = parameters.floor / Math.max(1, n - 1);
  const relax = 1 - Math.exp(-2 * seconds);
  const live = (node: number) => node !== RIM && foam.into[node]! < 0;
  for (let node = 1; node < n; node += 1) {
    const links = foam.links[node]!;
    const weights = foam.weights[node]!;
    const into = foam.into[node]!;
    let total = 0;
    for (const other of links) if (live(other)) total += foam.volume[other]! + floor;
    for (let index = 0; index < links.length; index += 1) {
      const other = links[index]!;
      let share = 0;
      if (into >= 0) share = other === into ? 1 : 0;
      else if (live(other) && total > 0) share = (foam.volume[other]! + floor) / total;
      weights[index] = weights[index]! + (share - weights[index]!) * relax;
    }
  }
  const d = foam.damping;
  const inflow = new Float64Array(n);
  for (let node = 1; node < n; node += 1) {
    const weights = foam.weights[node]!;
    let total = 0;
    for (const weight of weights) total += weight;
    if (total <= 1e-12) continue;
    const links = foam.links[node]!;
    const scale = (d * foam.volume[node]!) / total;
    for (let index = 0; index < links.length; index += 1) inflow[links[index]!] = inflow[links[index]!]! + scale * weights[index]!;
  }
  let living = 0;
  for (let node = 1; node < n; node += 1) if (foam.into[node]! < 0) living += 1;
  const rate = Math.min(1, parameters.exchange * seconds);
  for (let node = 1; node < n; node += 1) {
    const supply = foam.into[node]! < 0 ? (1 - d) / Math.max(1, living) : 0;
    foam.volume[node] = Math.max(0, foam.volume[node]! + (inflow[node]! + supply - foam.volume[node]!) * rate);
  }
  normalise(foam);
}

/** Gas a bubble passes to its index-th neighbour per second (share of all gas). */
export function flux(foam: Foam, node: number, index: number) {
  if (node === RIM) return 0;
  const weights = foam.weights[node]!;
  let total = 0;
  for (const weight of weights) total += weight;
  return total > 1e-12 ? (foam.damping * foam.volume[node]! * weights[index]!) / total : 0;
}

function begin(foam: Foam, node: number) {
  let into = -1;
  for (const other of foam.links[node]!) {
    if (other === RIM || foam.into[other]! >= 0) continue;
    if (into < 0 || foam.radius[other]! > foam.radius[into]!) into = other;
  }
  if (into < 0) return null;
  foam.into[node] = into;
  foam.merging[node] = 0;
  return into;
}

/** Removes a coalesced bubble, reopening its gap; the last node moves into its slot. */
function remove(foam: Foam, node: number) {
  const into = foam.into[node]!;
  foam.volume[into] = foam.volume[into]! + foam.volume[node]!;
  const corners: number[] = [];
  const kept: number[] = [];
  const keptAcross: number[] = [];
  const across = foam.origin[node]!;
  for (let face = 0; face < foam.cells.length / 3; face += 1) {
    const triple = foam.cells.slice(face * 3, face * 3 + 3);
    if (triple.includes(node)) {
      for (const corner of triple) if (corner !== node && !corners.includes(corner)) corners.push(corner);
    } else {
      kept.push(...triple);
      keptAcross.push(foam.across[face]!);
    }
  }
  if (corners.length === 3) {
    kept.push(...corners);
    keptAcross.push(across);
  }
  foam.cells = kept;
  foam.across = keptAcross;
  for (const other of foam.links[node]!) {
    const index = foam.links[other]!.indexOf(node);
    if (index >= 0) {
      foam.links[other]!.splice(index, 1);
      foam.weights[other]!.splice(index, 1);
    }
  }
  const last = foam.size - 1;
  if (node !== last) {
    foam.links[node] = foam.links[last]!;
    foam.weights[node] = foam.weights[last]!;
    for (const array of [foam.x, foam.z, foam.radius, foam.volume, foam.age, foam.merging, foam.identity]) array[node] = array[last]!;
    foam.into[node] = foam.into[last]!;
    foam.origin[node] = foam.origin[last]!;
    for (let other = 0; other < last; other += 1) if (foam.origin[other] === last) foam.origin[other] = node;
    for (const other of foam.links[node]!) {
      const list = foam.links[other]!;
      list[list.indexOf(last)] = node;
    }
    for (let other = 0; other < last; other += 1) if (foam.into[other] === last) foam.into[other] = node;
    for (let index = 0; index < foam.cells.length; index += 1) if (foam.cells[index] === last) foam.cells[index] = node;
    for (let index = 0; index < foam.across.length; index += 1) if (foam.across[index] === last) foam.across[index] = node;
  }
  foam.links.pop();
  foam.weights.pop();
  foam.size = last;
  foam.into[last] = -1;
  foam.merging[last] = 0;
  return last;
}

/** Bubbles that may leave: old, three links, in exactly three faces (nothing born beside them). */
function removableBubbles(foam: Foam) {
  const faces = new Int32Array(foam.size);
  for (const node of foam.cells) faces[node] = faces[node]! + 1;
  const out: number[] = [];
  for (let node = 4; node < foam.size; node += 1) {
    if (foam.into[node]! >= 0 || foam.age[node]! < MIN_AGE || foam.links[node]!.length !== 3 || faces[node] !== 3) continue;
    out.push(node);
  }
  return out;
}

/** Advances the raft by `seconds`. */
export function stepFoam(foam: Foam, seconds: number, parameters: FoamParameters, pending = { value: 0 }): FoamEvent[] {
  const events: FoamEvent[] = [];
  if (seconds <= 0) return events;
  const random = randomFor(foam);
  for (let node = 1; node < foam.size; node += 1) foam.age[node] = foam.age[node]! + seconds;
  exchange(foam, seconds, parameters);

  pending.value += parameters.growth * seconds;
  while (pending.value >= 1) {
    pending.value -= 1;
    const faces = openFaces(foam);
    if (faces.length === 0) break;
    const bubble = nucleate(foam, faces[Math.floor(random() * faces.length)]!, random());
    if (bubble !== null) events.push({ kind: "birth", bubble });
  }

  const surplus = foam.size - 1 - parameters.population;
  let active = 0;
  for (let node = 1; node < foam.size; node += 1) if (foam.into[node]! >= 0) active += 1;
  const rate = parameters.growth * (0.55 + 0.45 * Math.tanh(surplus / 20)) + Math.max(0, surplus) * 0.05;
  if (active < 8 && random() < 1 - Math.exp(-rate * seconds)) {
    const candidates = removableBubbles(foam);
    let total = 0;
    for (const node of candidates) total += foam.age[node]! ** 2;
    let cursor = random() * total;
    for (const node of candidates) {
      cursor -= foam.age[node]! ** 2;
      if (cursor > 0) continue;
      const into = begin(foam, node);
      if (into !== null) events.push({ kind: "coalesce", bubble: node, into });
      break;
    }
  }

  for (let node = foam.size - 1; node >= 1; node -= 1) {
    if (foam.into[node]! < 0) continue;
    foam.merging[node] = foam.merging[node]! + seconds;
    const into = foam.into[node]!;
    if (foam.merging[node]! > RUPTURE_SECONDS) {
      const pour = Math.min(1, seconds / Math.max(1e-3, RUPTURE_SECONDS + POUR_SECONDS - foam.merging[node]!));
      const moved = foam.volume[node]! * pour;
      foam.volume[node] = foam.volume[node]! - moved;
      foam.volume[into] = foam.volume[into]! + moved;
    }
    if (foam.merging[node]! >= RUPTURE_SECONDS + POUR_SECONDS) {
      const moved = remove(foam, node);
      events.push({ kind: "remove", bubble: node, moved });
    }
  }
  return events;
}

/** The open face (gap or edge) whose new bubble would lie nearest to (x, z). */
export function faceNear(foam: Foam, x: number, z: number) {
  let best = -1;
  let bestDistance = Infinity;
  for (const face of openFaces(foam)) {
    const [a, b, c] = foam.cells.slice(face * 3, face * 3 + 3) as [number, number, number];
    let circle: { x: number; z: number; radius: number } | null;
    if (hasRim(foam, face)) {
      const [p, q] = [a, b, c].filter((node) => node !== RIM) as [number, number];
      circle = edgeCircle(foam, p, q, insideOf(foam, p, q), 0.5);
    } else circle = gapCircle(foam, a, b, c, foam.across[face]!);
    if (!circle) continue;
    const distance = Math.hypot(circle.x - x, circle.z - z) - circle.radius;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = face;
    }
  }
  return best;
}

export function largest(foam: Foam) {
  let best = 1;
  for (let node = 2; node < foam.size; node += 1) if (foam.radius[node]! > foam.radius[best]!) best = node;
  return best;
}
