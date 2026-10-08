// A 2D foam that is its own network (bubble/3). Nodes are bubbles, links
// are the walls they share, and nothing else is assumed: the walls, and so
// the graph, are recomputed every step from the geometry.
//
// Geometry (second version, 2026-10-08: a raft with free faces; the first
// tiled the whole screen as a torus and read as wallpaper). Bubble i is a
// site xᵢ with a weight wᵢ = Rᵢ². It owns the points where its power
// |p − xᵢ|² − wᵢ is negative and the smallest: a power (Laguerre) diagram
// restricted to the union of the discs. A free face is then an arc of the
// bubble's own circle of radius Rᵢ against the outside; a wall between two
// bubbles is the radical line through the two points where their circles
// cross, so walls end exactly where free faces meet. Where three discs fail
// to cover a corner, a small gap is left: liquid. Every cell is computed
// exactly: a square around the disc is clipped by the bisector half-planes
// of overlapping discs, then by the disc itself (arcs split at most 60°).
// Weights follow each cell's target area (a damped Newton step: the area
// Jacobian is a Laplacian on the contact network plus the free faces' own
// term); sites relax toward their centroids (Lloyd, with the weight
// compensated so the cell stays put) and drift gently toward the middle of
// the screen, which holds the raft together the way capillarity holds a
// bubble raft.
//
// Physics. A bubble with a free face has the Laplace pressure of that face,
// 1/R (tension 1, outside pressure 0). Inside the raft, the walls of a cell
// with n sides turn in total by (π/3)(6 − n) when they meet at 120°, so
// pressure solves a Poisson equation on the contact network sourced by the
// topological charge 6 − n, held at 1/R on the free boundary:
//   Σⱼ lᵢⱼ (pᵢ − pⱼ) + Lᶠᵢ (pᵢ − 1/Rᵢ) = (π/3)(6 − nᵢ)·[Lᶠᵢ = 0]
// (Gauss–Seidel, warm-started). The wall i|j is drawn as an arc of
// curvature pᵢ − pⱼ. Gas diffuses through every wall down the pressure
// difference, dAᵢ/dt = −(3κ/π) Σⱼ l*ᵢⱼ (pᵢ − pⱼ): inside, with films of full
// length, this is von Neumann–Mullins dA/dt = κ(n − 6); it conserves gas
// exactly; free faces are sealed. With liquid, a wall conducts fully along
// its film max(0, l − 2r/√3) and at BORDER_PERMEABILITY inside the borders.
// The flux through each wall is kept per edge: the renderer shows it as gas
// budding from the giver into the receiver.
//
// Topology. T1 is the continuous flip of four cells, never scripted. T2: a
// cell whose target reaches MIN_AREA is removed. Coarsening alone ends in a
// few large bubbles, so gas is also blown in at a Plateau border inside the
// raft, where a three-sided cell is born and inflated; a press does the
// same and keeps inflating while held. Targets are renormalised to the
// raft's area each step (injected gas spreads over the whole raft).

export const MAX_CELLS = 3_000;
/** Sides kept per cell (a held bubble can grow large). */
export const MAX_SIDES = 64;
const CLIP_CAPACITY = 96;
/** Edge label of a free face. */
export const FREE = -2;
/** CSS px²: the bubble area the rates are expressed in. */
export const REFERENCE_AREA = 1_100;
/** Share of the screen the raft covers. */
export const RAFT_SHARE = 0.3;
/** A cell whose target area falls below this (px²) vanishes (T2). */
const MIN_AREA = 1.5;
const INFLATE_SECONDS = 1.6;
/** Bubbles of a cluster blown in at the rim get this many REFERENCE_AREAs (log-uniform): small, so hubs grow by feeding on them. */
export const GAS_RANGE: readonly [number, number] = [0.05, 0.4];
/** The first bubble of a cluster is larger: a possible future hub. */
const LEAD_GAS_RANGE: readonly [number, number] = [0.3, 1.2];
/** A cluster blown in at the rim has 5–12 bubbles. */
const CLUSTER_SIZE: readonly [number, number] = [5, 12];
/** Mean seconds between absorptions (a hub draining a large neighbour), and how long one takes. */
const ABSORB_INTERVAL = 25;
const ABSORB_SECONDS = 7;
/** Bubbles larger than this radius (px) count as hubs for absorption. */
const HUB_RADIUS = 60;
/** Sites relax toward their centroids at this rate (1/s). */
const LLOYD_RATE = 8;
/** Sites drift toward the middle at this speed (px/s) at the raft's nominal edge. */
const COHESION = 30;
/** The topological charge 6 − n is followed at this rate (1/s), so a T1 bends walls smoothly. */
const CHARGE_RATE = 6;
const WEIGHT_RELAX = 0.6;
/** No wall or face moves more than about this (px) per step on its cell's account. */
const MAX_WALL_STEP = 0.9;
const PRESSURE_SWEEPS = 6;
const WEIGHT_SWEEPS = 4;
/** Coarsening fades out below this many bubbles. */
const FEW_CELLS: readonly [number, number] = [12, 24];
/** A held bubble stops growing at this share of the raft. */
const MAX_BLOWN_SHARE = 0.2;
/** Border radius (px) per √(φ · mean area): (√3 − π/2) r² per vertex, two vertices per bubble. */
const BORDER_AREA_PER_R2 = 2 * (Math.sqrt(3) - Math.PI / 2);
/** Gas crosses a wall's part inside the Plateau borders at this share of a film's rate. */
const BORDER_PERMEABILITY = 0.25;
/** A free face is split into arcs of at most this angle. */
const ARC_PIECE = Math.PI / 3;

export type FoamParameters = {
  /** κ as a share of REFERENCE_AREA per second: a 5-sided bubble loses that share each second. */
  coarsening: number;
  /** Bubbles nucleated per second per REFERENCE_AREA of raft, ×1000. */
  nucleation: number;
  /** Liquid fraction φ of the foam (0 dry; ≈ .16 is where a 2D foam unjams). */
  liquid: number;
};

export const DEFAULT_PARAMETERS: FoamParameters = { coarsening: 0.05, nucleation: 40, liquid: 0.002 };
export const COARSENING_RANGE: readonly [number, number] = [0, 0.25];
export const NUCLEATION_RANGE: readonly [number, number] = [0, 100];
export const LIQUID_RANGE: readonly [number, number] = [0, 0.2];

export type Foam = {
  width: number;
  height: number;
  count: number;
  /** Stable id per cell (moves with the cell when others are removed). */
  id: Int32Array;
  x: Float64Array;
  y: Float64Array;
  /** wᵢ = Rᵢ²: the disc the bubble may fill. */
  weight: Float64Array;
  /** The disc radius the cell was computed with. */
  radius: Float64Array;
  /** Area each cell is driven toward (px²). */
  target: Float64Array;
  /** Area of the computed cell (px²). */
  area: Float64Array;
  /** Centroid of the computed cell (px). */
  cx: Float64Array;
  cy: Float64Array;
  /** Site relative to the centroid at compute time (the free faces' centre). */
  ox: Float64Array;
  oy: Float64Array;
  sides: Int32Array;
  /** Length of free face (px). */
  free: Float64Array;
  /** Smoothed topological charge 6 − n. */
  charge: Float64Array;
  pressure: Float64Array;
  age: Float64Array;
  seed: Float64Array;
  /** Gas still to be blown in (px²) and the rate it comes in at (px²/s). */
  inflate: Float64Array;
  inflateRate: Float64Array;
  /** Per cell × MAX_SIDES: vertices relative to the centroid, CCW; edge k runs from vertex k to k + 1. */
  vx: Float64Array;
  vy: Float64Array;
  /** Per edge: neighbour index (FREE: a free face), its site's displacement, chord length. */
  neighbour: Int32Array;
  dx: Float64Array;
  dy: Float64Array;
  length: Float64Array;
  /** Per edge: film share of the wall, and the gas flowing out through it (px²/s; negative: in). */
  film: Float64Array;
  flux: Float64Array;
  /** A bubble being absorbed: the id it drains into (0: none) and the rate (px²/s). */
  drainInto: Int32Array;
  drainRate: Float64Array;
  /** Neighbour ids at the previous step (for counting T1s). */
  previous: Int32Array;
  previousCount: Int32Array;
  /** Step at which each cell was born. */
  born: Int32Array;
  borderRadius: number;
  /** κ in px²/s at the last step. */
  kappa: number;
  step: number;
  time: number;
  nextId: number;
  random: number;
  nucleationDebt: number;
  /** Seconds until the next absorption: a hub draining a large neighbour. */
  untilAbsorb: number;
  pending: { id: number; x: number; y: number }[];
  events: FoamEvents;
};

export type FoamEvents = {
  t1: number;
  t2: number;
  /** Sides of each vanished cell at its last step, by count. */
  t2Sides: number[];
  nucleated: number;
  clusters: number;
  absorbed: number;
};

const grid = { cols: 1, rows: 1, left: 0, top: 0, size: 1, head: new Int32Array(1), next: new Int32Array(MAX_CELLS) };
// Clip buffers (shared, single-threaded).
const ax = new Float64Array(CLIP_CAPACITY);
const ay = new Float64Array(CLIP_CAPACITY);
const al = new Int32Array(CLIP_CAPACITY);
const bx = new Float64Array(CLIP_CAPACITY);
const by = new Float64Array(CLIP_CAPACITY);
const bl = new Int32Array(CLIP_CAPACITY);
const candidateIndex = new Int32Array(1_024);
const candidateDx = new Float64Array(1_024);
const candidateDy = new Float64Array(1_024);
const nextTarget = new Float64Array(MAX_CELLS);
const weightStep = new Float64Array(MAX_CELLS);
const areaError = new Float64Array(MAX_CELLS);
const jacobian = new Float64Array(MAX_CELLS);

function nextRandom(foam: Foam) {
  let state = foam.random;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  foam.random = state >>> 0 || 1;
  return foam.random / 4_294_967_296;
}

/** The raft's area (px²): a share of the screen. */
export function raftArea(foam: Pick<Foam, "width" | "height">) {
  return RAFT_SHARE * foam.width * foam.height;
}

/** Semi-axes of the ellipse the raft is gathered into (same aspect as the screen). */
function raftAxes(foam: Pick<Foam, "width" | "height">) {
  const aspect = foam.width / foam.height;
  const b = Math.sqrt(raftArea(foam) / (Math.PI * aspect));
  return { a: b * aspect, b };
}

/** The raft starts with this many hubs, holding HUB_SHARE of its area, among small bubbles. */
const HUBS = 7;
const HUB_SHARE = 0.8;
const SMALL = 110;

export function createFoam(width: number, height: number, seed = 0x2545f491): Foam {
  const n = HUBS + SMALL;
  const cells = (length: number) => new Float64Array(MAX_CELLS * length);
  const foam: Foam = {
    width,
    height,
    count: 0,
    id: new Int32Array(MAX_CELLS),
    x: cells(1),
    y: cells(1),
    weight: cells(1),
    radius: cells(1),
    target: cells(1),
    area: cells(1),
    cx: cells(1),
    cy: cells(1),
    ox: cells(1),
    oy: cells(1),
    sides: new Int32Array(MAX_CELLS),
    free: cells(1),
    charge: cells(1),
    pressure: cells(1),
    age: cells(1),
    seed: cells(1),
    inflate: cells(1),
    inflateRate: cells(1),
    vx: cells(MAX_SIDES),
    vy: cells(MAX_SIDES),
    neighbour: new Int32Array(MAX_CELLS * MAX_SIDES).fill(FREE),
    dx: cells(MAX_SIDES),
    dy: cells(MAX_SIDES),
    length: cells(MAX_SIDES),
    film: cells(MAX_SIDES),
    flux: cells(MAX_SIDES),
    previous: new Int32Array(MAX_CELLS * MAX_SIDES),
    previousCount: new Int32Array(MAX_CELLS),
    drainInto: new Int32Array(MAX_CELLS),
    drainRate: cells(1),
    born: new Int32Array(MAX_CELLS),
    borderRadius: 0,
    kappa: 0,
    step: 0,
    time: 0,
    nextId: 1,
    random: seed >>> 0 || 1,
    nucleationDebt: 0,
    untilAbsorb: ABSORB_INTERVAL,
    pending: [],
    events: { t1: 0, t2: 0, t2Sides: [], nucleated: 0, clusters: 0, absorbed: 0 },
  };
  const { a, b } = raftAxes(foam);
  const raft = raftArea(foam);
  // Hub areas log-uniform over a factor of eight; small bubbles share the rest.
  const shares = Array.from({ length: HUBS }, () => 8 ** nextRandom(foam));
  const shareSum = shares.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < n; i += 1) {
    const angle = nextRandom(foam) * Math.PI * 2;
    const distance = Math.sqrt(nextRandom(foam)) * (i < HUBS ? 0.75 : 1);
    foam.x[i] = width / 2 + Math.cos(angle) * distance * a;
    foam.y[i] = height / 2 + Math.sin(angle) * distance * b;
    const area = i < HUBS ? (raft * HUB_SHARE * shares[i]!) / shareSum : (raft * (1 - HUB_SHARE)) / SMALL;
    foam.target[i] = area;
    // Discs a little larger than their share, so they overlap into a foam.
    foam.weight[i] = 1.3 * (area / Math.PI);
    foam.id[i] = foam.nextId++;
    foam.seed[i] = nextRandom(foam);
    // Ages spread so films are at every stage of drainage from the start.
    foam.age[i] = nextRandom(foam) * 40;
    foam.born[i] = -1;
  }
  foam.count = n;
  computeDiagram(foam);
  for (let i = 0; i < n; i += 1) foam.charge[i] = 6 - neighbourCount(foam, i);
  rememberNeighbours(foam);
  return foam;
}

/** Mean area per bubble at the current count. */
export function meanArea(foam: Foam) {
  return raftArea(foam) / Math.max(1, foam.count);
}

function buildGrid(foam: Foam, reach: number) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i < foam.count; i += 1) {
    left = Math.min(left, foam.x[i]!);
    right = Math.max(right, foam.x[i]!);
    top = Math.min(top, foam.y[i]!);
    bottom = Math.max(bottom, foam.y[i]!);
  }
  const size = Math.max(4, reach);
  const cols = Math.max(1, Math.min(512, Math.floor((right - left) / size) + 1));
  const rows = Math.max(1, Math.min(512, Math.floor((bottom - top) / size) + 1));
  if (grid.head.length < cols * rows) grid.head = new Int32Array(cols * rows * 2);
  grid.cols = cols;
  grid.rows = rows;
  grid.left = left;
  grid.top = top;
  grid.size = size;
  grid.head.fill(-1, 0, cols * rows);
  for (let i = 0; i < foam.count; i += 1) {
    const gx = Math.min(cols - 1, Math.floor((foam.x[i]! - left) / size));
    const gy = Math.min(rows - 1, Math.floor((foam.y[i]! - top) / size));
    const at = gy * cols + gx;
    grid.next[i] = grid.head[at]!;
    grid.head[at] = i;
  }
}

/** Area and centroid of a circular segment of a circle of radius R about the origin, from p to q (CCW, angle θ). */
function segment(px: number, py: number, qx: number, qy: number, radius: number, theta: number) {
  const area = 0.5 * radius * radius * (theta - Math.sin(theta));
  if (theta < 1e-4 || area <= 0) return { area: 0, x: 0, y: 0 };
  const distance = (4 * radius * Math.sin(theta / 2) ** 3) / (3 * (theta - Math.sin(theta)));
  const mx = px + qx;
  const my = py + qy;
  const m = Math.hypot(mx, my) || 1;
  return { area, x: (mx / m) * distance, y: (my / m) * distance };
}

/** Computes every cell: vertices, walls, free faces, neighbours, areas and centroids. */
export function computeDiagram(foam: Foam) {
  let radiusMax = 0;
  let radiusSum = 0;
  for (let i = 0; i < foam.count; i += 1) {
    const radius = Math.sqrt(Math.max(0, foam.weight[i]!));
    foam.radius[i] = radius;
    radiusMax = Math.max(radiusMax, radius);
    radiusSum += radius;
  }
  buildGrid(foam, (2 * radiusSum) / Math.max(1, foam.count));
  const { cols, rows, left, top, size } = grid;

  for (let i = 0; i < foam.count; i += 1) {
    const xi = foam.x[i]!;
    const yi = foam.y[i]!;
    const wi = foam.weight[i]!;
    const R = foam.radius[i]!;
    const base = i * MAX_SIDES;
    if (R < 1e-3) {
      foam.sides[i] = 0;
      foam.area[i] = 0;
      foam.free[i] = 0;
      foam.cx[i] = xi;
      foam.cy[i] = yi;
      foam.ox[i] = 0;
      foam.oy[i] = 0;
      continue;
    }
    // A square around the disc, clipped by every overlapping disc's bisector.
    const box = R * 1.02;
    let n = 4;
    ax[0] = -box; ay[0] = -box; al[0] = -1;
    ax[1] = box; ay[1] = -box; al[1] = -1;
    ax[2] = box; ay[2] = box; al[2] = -1;
    ax[3] = -box; ay[3] = box; al[3] = -1;
    let candidates = 0;
    const reach = R + radiusMax;
    const gx0 = Math.max(0, Math.floor((xi - reach - left) / size));
    const gx1 = Math.min(cols - 1, Math.floor((xi + reach - left) / size));
    const gy0 = Math.max(0, Math.floor((yi - reach - top) / size));
    const gy1 = Math.min(rows - 1, Math.floor((yi + reach - top) / size));
    for (let gy = gy0; gy <= gy1 && n > 0; gy += 1) {
      for (let gx = gx0; gx <= gx1 && n > 0; gx += 1) {
        for (let j = grid.head[gy * cols + gx]!; j !== -1; j = grid.next[j]!) {
          if (j === i) continue;
          const ddx = foam.x[j]! - xi;
          const ddy = foam.y[j]! - yi;
          const d2 = ddx * ddx + ddy * ddy;
          const rj = foam.radius[j]!;
          if (d2 < 1e-12 || d2 >= (R + rj) * (R + rj) || rj < 1e-3) continue;
          // Half-plane of points closer (in power) to i: v·d ≤ h.
          const h = 0.5 * (d2 + wi - foam.weight[j]!);
          // A bisector beyond the disc cannot cut the cell.
          if (h >= R * Math.sqrt(d2)) continue;
          let outside = false;
          for (let k = 0; k < n; k += 1) {
            if (ax[k]! * ddx + ay[k]! * ddy > h) {
              outside = true;
              break;
            }
          }
          if (!outside || candidates >= candidateIndex.length) continue;
          const label = candidates;
          candidateIndex[candidates] = j;
          candidateDx[candidates] = ddx;
          candidateDy[candidates] = ddy;
          candidates += 1;
          // Sutherland–Hodgman against one half-plane, keeping edge labels.
          let m = 0;
          for (let k = 0; k < n; k += 1) {
            const k1 = k + 1 === n ? 0 : k + 1;
            const sa = ax[k]! * ddx + ay[k]! * ddy - h;
            const sb = ax[k1]! * ddx + ay[k1]! * ddy - h;
            if (sa <= 0) {
              if (m < CLIP_CAPACITY) {
                bx[m] = ax[k]!; by[m] = ay[k]!; bl[m] = al[k]!; m += 1;
              }
              if (sb > 0 && m < CLIP_CAPACITY) {
                const t = sa / (sa - sb);
                bx[m] = ax[k]! + (ax[k1]! - ax[k]!) * t;
                by[m] = ay[k]! + (ay[k1]! - ay[k]!) * t;
                bl[m] = label;
                m += 1;
              }
            } else if (sb <= 0 && m < CLIP_CAPACITY) {
              const t = sa / (sa - sb);
              bx[m] = ax[k]! + (ax[k1]! - ax[k]!) * t;
              by[m] = ay[k]! + (ay[k1]! - ay[k]!) * t;
              bl[m] = al[k]!;
              m += 1;
            }
          }
          n = m;
          for (let k = 0; k < n; k += 1) {
            ax[k] = bx[k]!; ay[k] = by[k]!; al[k] = bl[k]!;
          }
          if (n === 0) break;
        }
      }
    }

    // Then by the disc: parts of edges inside it stay; between leaving and
    // re-entering the disc runs a free face (label FREE, split below).
    const R2 = R * R;
    let m = 0;
    for (let k = 0; k < n && m < CLIP_CAPACITY - 2; k += 1) {
      const k1 = k + 1 === n ? 0 : k + 1;
      const px = ax[k]!;
      const py = ay[k]!;
      const ex = ax[k1]! - px;
      const ey = ay[k1]! - py;
      const inside = px * px + py * py <= R2;
      const A = ex * ex + ey * ey;
      const B = 2 * (px * ex + py * ey);
      const C = px * px + py * py - R2;
      const disc = B * B - 4 * A * C;
      const root = disc > 0 && A > 1e-18 ? Math.sqrt(disc) : 0;
      const t1 = disc > 0 && A > 1e-18 ? (-B - root) / (2 * A) : 2;
      const t2 = disc > 0 && A > 1e-18 ? (-B + root) / (2 * A) : -1;
      if (inside) {
        bx[m] = px; by[m] = py; bl[m] = al[k]!; m += 1;
        if (t2 >= 0 && t2 < 1) {
          bx[m] = px + ex * t2; by[m] = py + ey * t2; bl[m] = FREE; m += 1;
        }
      } else if (t1 >= 0 && t1 < 1) {
        bx[m] = px + ex * t1; by[m] = py + ey * t1; bl[m] = al[k]!; m += 1;
        if (t2 < 1) {
          bx[m] = px + ex * t2; by[m] = py + ey * t2; bl[m] = FREE; m += 1;
        }
      }
    }
    if (m === 0) {
      // Either the disc lies wholly inside the clipped square (a free
      // bubble) or the cell is empty.
      let contains = n > 0;
      for (let k = 0; k < n && contains; k += 1) {
        const k1 = k + 1 === n ? 0 : k + 1;
        const ex = ax[k1]! - ax[k]!;
        const ey = ay[k1]! - ay[k]!;
        // Signed distance of the origin from the edge line, inward positive.
        const distance = (ex * -ay[k]! - ey * -ax[k]!) / (Math.hypot(ex, ey) || 1);
        if (distance < R) contains = false;
      }
      if (contains) {
        for (let k = 0; k < 6; k += 1) {
          bx[k] = R * Math.cos((k * Math.PI) / 3);
          by[k] = R * Math.sin((k * Math.PI) / 3);
          bl[k] = FREE;
        }
        m = 6;
      }
    }
    // Split free faces into pieces of at most ARC_PIECE, into a, then
    // measure the cell: polygon plus circular segments.
    let count = 0;
    for (let k = 0; k < m; k += 1) {
      if (count >= MAX_SIDES) break;
      ax[count] = bx[k]!; ay[count] = by[k]!; al[count] = bl[k]!; count += 1;
      if (bl[k] !== FREE) continue;
      const k1 = k + 1 === m ? 0 : k + 1;
      const a0 = Math.atan2(by[k]!, bx[k]!);
      let span = Math.atan2(by[k1]!, bx[k1]!) - a0;
      while (span <= 1e-9) span += Math.PI * 2;
      const pieces = Math.ceil(span / ARC_PIECE - 1e-9);
      for (let p = 1; p < pieces && count < MAX_SIDES; p += 1) {
        const angle = a0 + (span * p) / pieces;
        ax[count] = R * Math.cos(angle); ay[count] = R * Math.sin(angle); al[count] = FREE; count += 1;
      }
    }
    let area2 = 0;
    let gxSum = 0;
    let gySum = 0;
    let segmentArea = 0;
    let segmentX = 0;
    let segmentY = 0;
    let free = 0;
    for (let k = 0; k < count; k += 1) {
      const k1 = k + 1 === count ? 0 : k + 1;
      const cross = ax[k]! * ay[k1]! - ax[k1]! * ay[k]!;
      area2 += cross;
      gxSum += (ax[k]! + ax[k1]!) * cross;
      gySum += (ay[k]! + ay[k1]!) * cross;
      if (al[k] === FREE) {
        const chord = Math.hypot(ax[k1]! - ax[k]!, ay[k1]! - ay[k]!);
        const theta = 2 * Math.asin(Math.min(1, chord / (2 * R)));
        const piece = segment(ax[k]!, ay[k]!, ax[k1]!, ay[k1]!, R, theta);
        segmentArea += piece.area;
        segmentX += piece.area * piece.x;
        segmentY += piece.area * piece.y;
        free += R * theta;
      }
    }
    const polygon = 0.5 * area2;
    const area = polygon + segmentArea;
    let localX = 0;
    let localY = 0;
    if (area > 1e-9 && count >= 3) {
      localX = ((polygon > 0 ? gxSum / 6 : 0) + segmentX) / area;
      localY = ((polygon > 0 ? gySum / 6 : 0) + segmentY) / area;
    }
    foam.area[i] = count >= 3 ? Math.max(0, area) : 0;
    foam.free[i] = free;
    foam.cx[i] = xi + localX;
    foam.cy[i] = yi + localY;
    foam.ox[i] = -localX;
    foam.oy[i] = -localY;
    let sides = 0;
    for (let k = 0; k < count && sides < MAX_SIDES; k += 1) {
      const k1 = k + 1 === count ? 0 : k + 1;
      const len = Math.hypot(ax[k1]! - ax[k]!, ay[k1]! - ay[k]!);
      if (len < 1e-7 && count > 3) continue;
      const at = base + sides;
      foam.vx[at] = ax[k]! - localX;
      foam.vy[at] = ay[k]! - localY;
      foam.length[at] = len;
      const label = al[k]!;
      if (label >= 0) {
        foam.neighbour[at] = candidateIndex[label]!;
        foam.dx[at] = candidateDx[label]!;
        foam.dy[at] = candidateDy[label]!;
      } else {
        foam.neighbour[at] = FREE;
        foam.dx[at] = 0;
        foam.dy[at] = 0;
      }
      foam.flux[at] = 0;
      sides += 1;
    }
    foam.sides[i] = count >= 3 ? sides : 0;
  }
}

/** Real contacts: walls with a neighbour (the network's links). */
function neighbourCount(foam: Foam, i: number) {
  let count = 0;
  const base = i * MAX_SIDES;
  for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[base + k]! >= 0) count += 1;
  return count;
}

function rememberNeighbours(foam: Foam) {
  for (let i = 0; i < foam.count; i += 1) {
    const base = i * MAX_SIDES;
    let count = 0;
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[base + k]!;
      if (j >= 0) foam.previous[base + count++] = foam.id[j]!;
    }
    foam.previousCount[i] = count;
  }
}

/** Counts links that appeared between two bubbles that both existed a step ago: T1 swaps (and new contacts). */
function countSwaps(foam: Foam) {
  let gained = 0;
  for (let i = 0; i < foam.count; i += 1) {
    if (foam.born[i]! >= foam.step - 1) continue;
    const base = i * MAX_SIDES;
    const known = foam.previousCount[i]!;
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[base + k]!;
      if (j < 0 || foam.id[j]! < foam.id[i]! || foam.born[j]! >= foam.step - 1) continue;
      const other = foam.id[j]!;
      let found = false;
      for (let at = 0; at < known; at += 1) {
        if (foam.previous[base + at] === other) {
          found = true;
          break;
        }
      }
      if (!found) gained += 1;
    }
  }
  return gained;
}

const PER_CELL_F64 = ["x", "y", "weight", "radius", "target", "area", "cx", "cy", "ox", "oy", "free", "charge", "pressure", "age", "seed", "inflate", "inflateRate", "drainRate"] as const;
const PER_EDGE_F64 = ["vx", "vy", "dx", "dy", "length", "film", "flux"] as const;

function moveCell(foam: Foam, from: number, to: number) {
  for (const key of PER_CELL_F64) foam[key][to] = foam[key][from]!;
  foam.id[to] = foam.id[from]!;
  foam.sides[to] = foam.sides[from]!;
  foam.born[to] = foam.born[from]!;
  foam.previousCount[to] = foam.previousCount[from]!;
  foam.drainInto[to] = foam.drainInto[from]!;
  const a = from * MAX_SIDES;
  const b = to * MAX_SIDES;
  for (const key of PER_EDGE_F64) foam[key].copyWithin(b, a, a + MAX_SIDES);
  foam.neighbour.copyWithin(b, a, a + MAX_SIDES);
  foam.previous.copyWithin(b, a, a + MAX_SIDES);
}

function removeCell(foam: Foam, index: number) {
  const last = foam.count - 1;
  if (index !== last) moveCell(foam, last, index);
  foam.count = last;
}

/**
 * Births a three-sided cell at vertex `k` of cell `host`: its site sits in
 * the triangle of the three sites meeting there, and its weight puts the
 * vertex just inside it, so it starts as a tiny triangle in the Plateau
 * border and grows as gas is blown in.
 */
function nucleateAt(foam: Foam, host: number, k: number, gas: number, id = foam.nextId++) {
  if (foam.count >= MAX_CELLS) return -1;
  const sides = foam.sides[host]!;
  if (sides < 3 || k < 0) return -1;
  const base = host * MAX_SIDES;
  const before = base + ((k + sides - 1) % sides);
  const after = base + k;
  if (foam.neighbour[before]! < 0 || foam.neighbour[after]! < 0) return -1;
  const hx = foam.x[host]!;
  const hy = foam.y[host]!;
  // Vertex and the three sites, relative to the host's site.
  const px = foam.vx[base + k]! - foam.ox[host]!;
  const py = foam.vy[base + k]! - foam.oy[host]!;
  const sx = (foam.dx[before]! + foam.dx[after]!) / 3;
  const sy = (foam.dy[before]! + foam.dy[after]!) / 3;
  const power = px * px + py * py - foam.weight[host]!;
  if (power >= 0) return -1;
  const spread = Math.min(Math.hypot(sx, sy), Math.hypot(foam.dx[before]! - sx, foam.dy[before]! - sy), Math.hypot(foam.dx[after]! - sx, foam.dy[after]! - sy));
  const epsilon = 2 * 0.6 * spread;
  const at = foam.count;
  foam.count += 1;
  foam.id[at] = id;
  foam.x[at] = hx + sx;
  foam.y[at] = hy + sy;
  foam.weight[at] = (px - sx) * (px - sx) + (py - sy) * (py - sy) - power + epsilon;
  foam.radius[at] = Math.sqrt(foam.weight[at]!);
  foam.target[at] = 1;
  foam.area[at] = 0;
  foam.cx[at] = foam.x[at]!;
  foam.cy[at] = foam.y[at]!;
  foam.ox[at] = 0;
  foam.oy[at] = 0;
  foam.free[at] = 0;
  foam.sides[at] = 0;
  foam.charge[at] = 3;
  foam.pressure[at] = foam.pressure[host]!;
  foam.age[at] = 0;
  foam.seed[at] = nextRandom(foam);
  foam.inflate[at] = gas;
  foam.inflateRate[at] = gas / INFLATE_SECONDS;
  foam.born[at] = foam.step;
  foam.previousCount[at] = 0;
  foam.events.nucleated += 1;
  return at;
}

/** The cell owning point (x, y): least negative power over nearby sites (−1 outside the raft). */
export function cellAt(foam: Foam, x: number, y: number) {
  let best = -1;
  let bestPower = 0;
  for (let i = 0; i < foam.count; i += 1) {
    const ddx = foam.x[i]! - x;
    const ddy = foam.y[i]! - y;
    const r = foam.radius[i]!;
    if (Math.abs(ddx) > r || Math.abs(ddy) > r) continue;
    const power = ddx * ddx + ddy * ddy - foam.weight[i]!;
    if (power < bestPower) {
      bestPower = power;
      best = i;
    }
  }
  return best;
}

/** The vertex of `cell` nearest (x, y) where three bubbles meet (−1 if none). */
function nearestJunction(foam: Foam, cell: number, x: number, y: number) {
  const base = cell * MAX_SIDES;
  const sides = foam.sides[cell]!;
  const ddx = x - foam.cx[cell]!;
  const ddy = y - foam.cy[cell]!;
  let best = -1;
  let bestDistance = Infinity;
  for (let k = 0; k < sides; k += 1) {
    if (foam.neighbour[base + k]! < 0 || foam.neighbour[base + ((k + sides - 1) % sides)]! < 0) continue;
    const d = (foam.vx[base + k]! - ddx) ** 2 + (foam.vy[base + k]! - ddy) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = k;
    }
  }
  return best;
}

/** Blows a bubble in at the Plateau border nearest (x, y); returns its id. It grows while fed. */
export function blow(foam: Foam, x: number, y: number) {
  const id = foam.nextId++;
  foam.pending.push({ id, x, y });
  return id;
}

/** Keeps blowing gas (px²) into bubble `id`, up to a share of the raft. */
export function feed(foam: Foam, id: number, gas: number) {
  for (let i = 0; i < foam.count; i += 1) {
    if (foam.id[i] !== id) continue;
    const limit = MAX_BLOWN_SHARE * raftArea(foam);
    const room = Math.max(0, limit - foam.target[i]! - foam.inflate[i]!);
    const added = Math.min(room, gas);
    foam.inflate[i] = foam.inflate[i]! + added;
    foam.inflateRate[i] = Math.max(foam.inflateRate[i]!, foam.inflate[i]! / 0.25);
    return true;
  }
  return false;
}

export function resizeFoam(foam: Foam, width: number, height: number) {
  if (width <= 0 || height <= 0 || (width === foam.width && height === foam.height)) return;
  const sx = width / foam.width;
  const sy = height / foam.height;
  const scale = sx * sy;
  for (let i = 0; i < foam.count; i += 1) {
    foam.x[i] = width / 2 + (foam.x[i]! - foam.width / 2) * sx;
    foam.y[i] = height / 2 + (foam.y[i]! - foam.height / 2) * sy;
    foam.target[i] = foam.target[i]! * scale;
    foam.weight[i] = foam.weight[i]! * scale;
    foam.inflate[i] = foam.inflate[i]! * scale;
    foam.inflateRate[i] = foam.inflateRate[i]! * scale;
  }
  foam.width = width;
  foam.height = height;
  computeDiagram(foam);
  rememberNeighbours(foam);
}

export function borderRadiusFor(liquid: number, area: number) {
  return Math.sqrt((Math.max(0, liquid) * area) / BORDER_AREA_PER_R2);
}

/**
 * Blows a cluster in at the rim: from a random direction, the free-faced
 * bubble farthest out that way; a lead bubble and a few small ones are born
 * just outside its free face, each a tiny disc touching it, and inflate.
 */
function rimCluster(foam: Foam) {
  const { a, b } = raftAxes(foam);
  const angle = nextRandom(foam) * Math.PI * 2;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let host = -1;
  let reach = -Infinity;
  for (let i = 0; i < foam.count; i += 1) {
    if (foam.free[i]! <= 0) continue;
    const along = ((foam.cx[i]! - foam.width / 2) / a) * ux + ((foam.cy[i]! - foam.height / 2) / b) * uy;
    if (along > reach) {
      reach = along;
      host = i;
    }
  }
  if (host < 0) return;
  const R = foam.radius[host]!;
  // Out of the host toward the chosen side, along its free face.
  let ox = foam.cx[host]! - foam.width / 2;
  let oy = foam.cy[host]! - foam.height / 2;
  const length = Math.hypot(ox, oy) || 1;
  ox /= length;
  oy /= length;
  const members = CLUSTER_SIZE[0] + Math.floor(nextRandom(foam) * (CLUSTER_SIZE[1] - CLUSTER_SIZE[0] + 1));
  const spread = 0.5 / Math.max(1, R / 20);
  for (let m = 0; m < members && foam.count < MAX_CELLS - 2; m += 1) {
    const turn = (m - (members - 1) / 2) * spread * (0.8 + 0.4 * nextRandom(foam));
    const dx = ox * Math.cos(turn) - oy * Math.sin(turn);
    const dy = ox * Math.sin(turn) + oy * Math.cos(turn);
    const range = m === 0 ? LEAD_GAS_RANGE : GAS_RANGE;
    const gas = REFERENCE_AREA * range[0] * (range[1] / range[0]) ** nextRandom(foam);
    const at = foam.count;
    foam.count += 1;
    foam.id[at] = foam.nextId++;
    foam.x[at] = foam.x[host]! + dx * (R + 1);
    foam.y[at] = foam.y[host]! + dy * (R + 1);
    foam.weight[at] = 4;
    foam.radius[at] = 2;
    foam.target[at] = Math.PI * 4;
    foam.area[at] = 0;
    foam.cx[at] = foam.x[at]!;
    foam.cy[at] = foam.y[at]!;
    foam.ox[at] = 0;
    foam.oy[at] = 0;
    foam.free[at] = 0;
    foam.sides[at] = 0;
    foam.charge[at] = 0;
    foam.pressure[at] = 0.5;
    foam.age[at] = 0;
    foam.seed[at] = nextRandom(foam);
    foam.inflate[at] = gas;
    foam.inflateRate[at] = gas / (2 * INFLATE_SECONDS);
    foam.born[at] = foam.step;
    foam.previousCount[at] = 0;
    foam.drainInto[at] = 0;
    foam.drainRate[at] = 0;
    foam.events.nucleated += 1;
  }
  foam.events.clusters += 1;
}

function indexOf(foam: Foam, id: number) {
  for (let i = 0; i < foam.count; i += 1) if (foam.id[i] === id) return i;
  return -1;
}

/**
 * Now and then a hub absorbs a large neighbour: of the walls between two
 * hubs, the one with the steepest pressure drop; the smaller bubble drains
 * into the larger over ABSORB_SECONDS (its gas flows through that wall, and
 * is drawn there), then vanishes.
 */
function absorb(foam: Foam, dt: number) {
  for (let i = 0; i < foam.count; i += 1) {
    const into = foam.drainInto[i]!;
    if (into === 0) continue;
    const j = indexOf(foam, into);
    if (j < 0) {
      foam.drainInto[i] = 0;
      continue;
    }
    const gas = Math.min(foam.target[i]!, foam.drainRate[i]! * dt);
    foam.target[i] = foam.target[i]! - gas;
    foam.target[j] = foam.target[j]! + gas;
    // Shown on the wall between them.
    const base = i * MAX_SIDES;
    for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[base + k] === j) foam.flux[base + k] = foam.flux[base + k]! + foam.drainRate[i]!;
    const other = j * MAX_SIDES;
    for (let k = 0; k < foam.sides[j]!; k += 1) if (foam.neighbour[other + k] === i) foam.flux[other + k] = foam.flux[other + k]! - foam.drainRate[i]!;
  }
  foam.untilAbsorb -= dt;
  if (foam.untilAbsorb > 0) return;
  foam.untilAbsorb = ABSORB_INTERVAL * (0.5 + nextRandom(foam));
  let hubs = 0;
  for (let i = 0; i < foam.count; i += 1) if (foam.radius[i]! > HUB_RADIUS && foam.area[i]! > Math.PI * HUB_RADIUS * HUB_RADIUS * 0.6) hubs += 1;
  if (hubs <= 3) return;
  let best = -1;
  let bestInto = -1;
  let steepest = 0;
  for (let i = 0; i < foam.count; i += 1) {
    if (foam.drainInto[i] !== 0 || foam.area[i]! < Math.PI * HUB_RADIUS * HUB_RADIUS * 0.6) continue;
    const base = i * MAX_SIDES;
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[base + k]!;
      if (j < 0 || foam.area[j]! <= foam.area[i]! || foam.drainInto[j] !== 0) continue;
      const drop = (foam.pressure[i]! - foam.pressure[j]!) * foam.length[base + k]!;
      if (drop > steepest) {
        steepest = drop;
        best = i;
        bestInto = j;
      }
    }
  }
  if (best < 0) return;
  foam.drainInto[best] = foam.id[bestInto]!;
  foam.drainRate[best] = foam.target[best]! / ABSORB_SECONDS;
  foam.events.absorbed += 1;
}

/** One step of `dt` seconds. */
export function stepFoam(foam: Foam, dt: number, parameters: FoamParameters) {
  const raft = raftArea(foam);
  foam.step += 1;
  foam.time += dt;

  // 1. Cells whose area ran out vanish (T2).
  for (let i = foam.count - 1; i >= 0; i -= 1) {
    const vanished = foam.target[i]! < MIN_AREA && foam.inflate[i]! <= 0;
    const lost = foam.sides[i] === 0 && foam.inflate[i]! <= 0 && foam.born[i]! < foam.step - 30 && foam.target[i]! < 0.05 * meanArea(foam);
    if (!vanished && !lost) continue;
    foam.events.t2 += 1;
    const n = neighbourCount(foam, i);
    foam.events.t2Sides[n] = (foam.events.t2Sides[n] ?? 0) + 1;
    removeCell(foam, i);
  }
  // 2. The diagram, and so the network.
  computeDiagram(foam);
  foam.events.t1 += countSwaps(foam);
  rememberNeighbours(foam);

  // 3. Pressure: topological charge inside, Laplace 1/R on free faces.
  const count = foam.count;
  const follow = 1 - Math.exp(-CHARGE_RATE * dt);
  for (let i = 0; i < count; i += 1) {
    const n = neighbourCount(foam, i);
    foam.charge[i] = foam.charge[i]! + (6 - n - foam.charge[i]!) * follow;
  }
  for (let sweep = 0; sweep < PRESSURE_SWEEPS; sweep += 1) {
    for (let i = 0; i < count; i += 1) {
      const base = i * MAX_SIDES;
      let sum = 0;
      let total = 0;
      for (let k = 0; k < foam.sides[i]!; k += 1) {
        const j = foam.neighbour[base + k]!;
        if (j < 0) continue;
        const l = foam.length[base + k]!;
        sum += l * foam.pressure[j]!;
        total += l;
      }
      const free = foam.free[i]!;
      if (free > 0) {
        sum += free / Math.max(foam.radius[i]!, 1);
        total += free;
      } else {
        sum += (Math.PI / 3) * foam.charge[i]!;
      }
      if (total > 1e-9) foam.pressure[i] = sum / total;
    }
  }

  // 4. Gas through walls (von Neumann–Mullins inside a dry raft); blowing; ageing.
  const mean = meanArea(foam);
  const border = borderRadiusFor(parameters.liquid, mean);
  foam.borderRadius = border;
  const lost = (2 * border) / Math.sqrt(3);
  const few = Math.min(1, Math.max(0, (count - FEW_CELLS[0]) / (FEW_CELLS[1] - FEW_CELLS[0])));
  const kappa = parameters.coarsening * REFERENCE_AREA * few;
  foam.kappa = kappa;
  const conductance = (3 * kappa) / Math.PI;
  for (let i = 0; i < count; i += 1) {
    const base = i * MAX_SIDES;
    let flux = 0;
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[base + k]!;
      const length = foam.length[base + k]!;
      if (j < 0) {
        foam.film[base + k] = 0;
        foam.flux[base + k] = 0;
        continue;
      }
      const film = Math.max(0, length - lost);
      foam.film[base + k] = length > 1e-9 ? film / length : 0;
      const out = conductance * (film + BORDER_PERMEABILITY * (length - film)) * (foam.pressure[i]! - foam.pressure[j]!);
      foam.flux[base + k] = out;
      flux += out;
    }
    let next = foam.target[i]! - flux * dt;
    if (foam.inflate[i]! > 0) {
      const gas = Math.min(foam.inflate[i]!, foam.inflateRate[i]! * dt);
      foam.inflate[i] = foam.inflate[i]! - gas;
      next += gas;
    }
    nextTarget[i] = Math.max(0, next);
    foam.age[i] = foam.age[i]! + dt;
  }
  let total = 0;
  for (let i = 0; i < count; i += 1) total += nextTarget[i]!;
  const normal = total > 0 ? raft / total : 1;
  for (let i = 0; i < count; i += 1) foam.target[i] = nextTarget[i]! * normal;

  // 5. New bubbles, blown in by hand or nucleated, each in the Plateau
  //    border nearest its point, on the diagram just computed.
  for (const blown of foam.pending.splice(0)) {
    const host = cellAt(foam, blown.x, blown.y);
    if (host < 0) continue;
    nucleateAt(foam, host, nearestJunction(foam, host, blown.x, blown.y), 0.5 * REFERENCE_AREA, blown.id);
  }
  // Clusters are blown in at the raft's rim, where they press in and feed
  // the bubbles they touch.
  const meanCluster = (CLUSTER_SIZE[0] + CLUSTER_SIZE[1]) / 2;
  foam.nucleationDebt += ((parameters.nucleation / 1_000) * (raft / REFERENCE_AREA) * dt) / meanCluster;
  while (foam.nucleationDebt >= 1) {
    foam.nucleationDebt -= 1;
    if (foam.count >= MAX_CELLS - 20) continue;
    rimCluster(foam);
  }
  absorb(foam, dt);

  // 6. Weights toward the targets: a damped Newton step. ∂Aᵢ/∂wⱼ = −lᵢⱼ/2dᵢⱼ
  //    on walls, and a free face adds Lᶠ/2R to ∂Aᵢ/∂wᵢ; solved by a few
  //    Gauss–Seidel sweeps with the area error limited to what the cell's
  //    boundary sweeps moving MAX_WALL_STEP.
  for (let i = 0; i < count; i += 1) {
    const base = i * MAX_SIDES;
    let perimeter = foam.free[i]!;
    let diagonal = foam.free[i]! / (2 * Math.max(foam.radius[i]!, 1e-3));
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      if (foam.neighbour[base + k]! < 0) continue;
      perimeter += foam.length[base + k]!;
      diagonal += foam.length[base + k]! / (2 * Math.hypot(foam.dx[base + k]!, foam.dy[base + k]!));
    }
    const reach = MAX_WALL_STEP * perimeter;
    areaError[i] = Math.max(-reach, Math.min(reach, WEIGHT_RELAX * (foam.target[i]! - foam.area[i]!)));
    jacobian[i] = diagonal;
    weightStep[i] = 0;
  }
  for (let sweep = 0; sweep < WEIGHT_SWEEPS; sweep += 1) {
    for (let i = 0; i < count; i += 1) {
      if (jacobian[i]! <= 1e-9) continue;
      const base = i * MAX_SIDES;
      let sum = 0;
      for (let k = 0; k < foam.sides[i]!; k += 1) {
        const j = foam.neighbour[base + k]!;
        if (j < 0) continue;
        sum += (foam.length[base + k]! / (2 * Math.hypot(foam.dx[base + k]!, foam.dy[base + k]!))) * weightStep[j]!;
      }
      weightStep[i] = (areaError[i]! + sum) / jacobian[i]!;
    }
  }
  for (let i = 0; i < count; i += 1) {
    // An empty cell (no walls this step) regrows its disc by MAX_WALL_STEP.
    if (jacobian[i]! <= 1e-9) {
      const radius = Math.sqrt(Math.max(foam.weight[i]!, 0));
      weightStep[i] = foam.target[i]! > foam.area[i]! ? 2 * MAX_WALL_STEP * radius + MAX_WALL_STEP * MAX_WALL_STEP : 0;
    }
  }

  // 7. Sites: toward the centroid (power at the centroid kept), and a
  //    gentle drift toward the middle that holds the raft together.
  const lloyd = 1 - Math.exp(-LLOYD_RATE * dt);
  const { a: axisA, b: axisB } = raftAxes(foam);
  const middleX = foam.width / 2;
  const middleY = foam.height / 2;
  const nominal = Math.sqrt(axisA * axisB);
  for (let i = 0; i < count; i += 1) {
    let w = foam.weight[i]! + weightStep[i]!;
    if (foam.sides[i]! > 0) {
      const offX = foam.cx[i]! - foam.x[i]!;
      const offY = foam.cy[i]! - foam.y[i]!;
      w -= (1 - (1 - lloyd) ** 2) * (offX * offX + offY * offY);
      foam.x[i] = foam.x[i]! + offX * lloyd;
      foam.y[i] = foam.y[i]! + offY * lloyd;
    }
    const ex = (foam.x[i]! - middleX) * (axisB / axisA);
    const ey = (foam.y[i]! - middleY) * (axisA / axisB);
    foam.x[i] = foam.x[i]! - (COHESION * dt * ex) / nominal;
    foam.y[i] = foam.y[i]! - (COHESION * dt * ey) / nominal;
    foam.weight[i] = Math.max(1, w);
  }
  return foam.events;
}
