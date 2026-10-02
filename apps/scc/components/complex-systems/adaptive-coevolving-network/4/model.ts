// Physarum transport network: a sheet of slime-mould tubes between food
// sources. Flow through the tubes and the thickness of the tubes change each
// other: protoplasm streams along the easiest paths, tubes that carry flow
// thicken, and tubes that carry little thin away, which in turn decides where
// the next flow can go.
//
// Each step one food source is drawn at random to push I₀ into the sheet and
// every other food draws I₀/(F − 1) out (Tero et al. 2010). Pressures p solve
// Kirchhoff's law at every junction,
//   Σⱼ Dᵢⱼ/Lᵢⱼ (pᵢ − pⱼ) = +I₀ at the source, −I₀/(F − 1) at other food, 0 elsewhere,
// the flux through a tube is Qᵢⱼ = Dᵢⱼ/Lᵢⱼ (pᵢ − pⱼ), and every intact tube adapts
//   dDᵢⱼ/dt = f(|Qᵢⱼ|) − γ Dᵢⱼ,   f(Q) = Q^μ / (1 + Q^μ).
// μ < 1 rewards weak flows and keeps many parallel tubes; μ > 1 lets the
// strongest tube starve its neighbours, leaving single paths.
//
// Sources: Tero, Kobayashi & Nakagaki, J. Theor. Biol. 244, 553 (2007);
// Tero et al., Science 327, 439 (2010). The sheet lives in abstract units of
// one mesh spacing; tube lengths come from that geometry, so unlike the force
// layouts of the other routes, position here is part of the model.

export type Tube = {
  readonly id: number;
  readonly a: number;
  readonly b: number;
  /** L: length in mesh spacings. */
  readonly length: number;
  /** D: zero while the tube is cut. */
  conductance: number;
  /** Q from a to b in the latest step. */
  flux: number;
  /**
   * Growth signal f(|Q|) averaged over about one time unit. A tube left alone
   * settles at D = drive / γ, so drive says what the flow is asking for.
   */
  drive: number;
  /** Model time at which a cut tube grows back, or null when intact. */
  cutUntil: number | null;
};

export type Mould = {
  readonly width: number;
  readonly height: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly tubes: Tube[];
  readonly incident: number[][];
  /** Junctions holding food, in the order they were placed. */
  readonly foods: number[];
  readonly pressure: Float64Array;
  randomState: number;
  time: number;
};

export type MouldParameters = {
  /** μ: flux exponent of the adaptation. */
  exponent: number;
  /** γ: decay rate of conductance. */
  decay: number;
  /** I₀: protoplasm pushed in by the source food each step. */
  inflow: number;
};

export type MouldEvent =
  | { kind: "heal"; tube: number }
  | { kind: "die"; tube: number }
  | { kind: "grow"; tube: number };

export type MouldMeasure = {
  /** Tubes thicker than LIVING. */
  living: number;
  /** Summed length of living tubes, in mesh spacings. */
  length: number;
  /** Independent loops among living tubes: edges − nodes + components. */
  loops: number;
  /** Whether every food is joined to every other through living tubes. */
  connected: boolean;
  /** Share of living tubes whose loss alone would separate two foods. */
  fragile: number;
};

export const DEFAULT_JUNCTIONS = 360;
export const MAX_JUNCTIONS = 520;
export const MAX_FOODS = 10;
export const EXPONENT_RANGE = [0.75, 1.5] as const;
export const DEFAULT_PARAMETERS: MouldParameters = { exponent: 1.1, decay: 1, inflow: 1 };
/** Starting food, as fractions of the sheet: four corners of an uneven quadrilateral. */
const STARTING_FOOD = [
  [0.15, 0.25],
  [0.8, 0.2],
  [0.5, 0.8],
  [0.2, 0.75],
] as const;
/** Conductance above which a tube counts as part of the network. */
export const LIVING = 0.05;
/** Intact tubes never thin below this, so a starved region can be recolonised. */
const FLOOR = 0.002;
/** A cut tube grows back after this many time units. */
export const HEAL_TIME = 40;
/** Model time per pressure solve. */
export const MAX_STEP = 0.05;
const DRIVE_MEMORY = 1;
/** Weak leak to ground keeps the system solvable when cuts isolate food. */
const LEAK = 1e-5;
const SOLVER_TOLERANCE = 1e-4;
const SOLVER_ITERATIONS = 400;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(mould: Mould) {
  return () => {
    const [value, next] = nextRandom(mould.randomState);
    mould.randomState = next;
    return value;
  };
}

/**
 * A jittered triangular mesh of about `junctions` points filling a sheet with
 * the given aspect ratio (width ÷ height). Every tube starts at full thickness.
 */
export function createMould(
  junctions = DEFAULT_JUNCTIONS,
  aspect = 1.6,
  seed = 0x5f3759df,
): Mould {
  const rowStep = Math.sqrt(3) / 2;
  // Columns × rows ≈ junctions with column spacing 1 and row spacing √3/2.
  const columns = Math.max(3, Math.round(Math.sqrt((junctions * aspect) / rowStep)));
  const rows = Math.max(3, Math.round(junctions / columns));
  const width = columns - 0.5;
  const height = (rows - 1) * rowStep;
  const count = columns * rows;
  const mould: Mould = {
    width,
    height,
    x: new Float64Array(count),
    y: new Float64Array(count),
    tubes: [],
    incident: Array.from({ length: count }, () => []),
    foods: [],
    pressure: new Float64Array(count),
    randomState: seed >>> 0 || 1,
    time: 0,
  };
  const random = randomFor(mould);
  const index = (row: number, column: number) => row * columns + column;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const node = index(row, column);
      const edge = row === 0 || row === rows - 1 || column === 0 || column === columns - 1;
      const jitter = edge ? 0 : 0.28;
      mould.x[node] = column + (row % 2) * 0.5 + (random() - 0.5) * jitter;
      mould.y[node] = row * rowStep + (random() - 0.5) * jitter;
    }
  }
  const join = (a: number, b: number) => {
    const id = mould.tubes.length;
    const length = Math.hypot(mould.x[a]! - mould.x[b]!, mould.y[a]! - mould.y[b]!);
    mould.tubes.push({ id, a, b, length, conductance: 1, flux: 0, drive: 0, cutUntil: null });
    mould.incident[a]!.push(id);
    mould.incident[b]!.push(id);
  };
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const node = index(row, column);
      if (column + 1 < columns) join(node, index(row, column + 1));
      if (row + 1 >= rows) continue;
      // Odd rows sit half a spacing right, so their lower neighbours shift.
      const shift = row % 2;
      if (column - 1 + shift >= 0) join(node, index(row + 1, column - 1 + shift));
      if (column + shift < columns) join(node, index(row + 1, column + shift));
    }
  }
  return mould;
}

export function junctionCount(mould: Mould) {
  return mould.x.length;
}

/** Nearest junction to a point in sheet units. */
export function nearestJunction(mould: Mould, x: number, y: number) {
  let best = 0;
  let distance = Infinity;
  for (let node = 0; node < mould.x.length; node += 1) {
    const d = (mould.x[node]! - x) ** 2 + (mould.y[node]! - y) ** 2;
    if (d < distance) {
      distance = d;
      best = node;
    }
  }
  return best;
}

/** Places the starting food; on a tall sheet the fractions are read transposed. */
export function seedFood(mould: Mould) {
  const tall = mould.height > mould.width;
  for (const [across, down] of STARTING_FOOD) {
    const [u, v] = tall ? [down, across] : [across, down];
    addFood(mould, nearestJunction(mould, u * mould.width, v * mould.height));
  }
}

/** The junction farthest from every food, for placing food without a pointer. */
export function farthestFromFood(mould: Mould) {
  let best = Math.floor(mould.x.length / 2);
  let reach = -1;
  for (let node = 0; node < mould.x.length; node += 1) {
    let nearest = Infinity;
    for (const food of mould.foods) {
      nearest = Math.min(nearest, (mould.x[node]! - mould.x[food]!) ** 2 + (mould.y[node]! - mould.y[food]!) ** 2);
    }
    // Stay off the rim so the food has a full set of tubes.
    const margin = Math.min(mould.x[node]!, mould.y[node]!, mould.width - mould.x[node]!, mould.height - mould.y[node]!);
    if (margin < 1) continue;
    if (nearest > reach) {
      reach = nearest;
      best = node;
    }
  }
  return best;
}

export function addFood(mould: Mould, junction: number) {
  if (mould.foods.length >= MAX_FOODS || mould.foods.includes(junction)) return false;
  if (junction < 0 || junction >= mould.x.length) return false;
  mould.foods.push(junction);
  return true;
}

export function removeFood(mould: Mould, junction: number) {
  const index = mould.foods.indexOf(junction);
  if (index < 0) return false;
  mould.foods.splice(index, 1);
  return true;
}

/** Moves a food to another junction, keeping its place in the order. */
export function moveFood(mould: Mould, from: number, to: number) {
  const index = mould.foods.indexOf(from);
  if (index < 0 || to < 0 || to >= mould.x.length) return false;
  if (from !== to && mould.foods.includes(to)) return false;
  mould.foods[index] = to;
  return true;
}

/** Severs a tube; it carries nothing until it grows back after HEAL_TIME. */
export function cutTube(mould: Mould, tube: number) {
  const target = mould.tubes[tube];
  if (!target || target.cutUntil !== null) return false;
  target.conductance = 0;
  target.flux = 0;
  target.drive = 0;
  target.cutUntil = mould.time + HEAL_TIME;
  return true;
}

/** The thickest intact tube that does not touch food, or null. */
export function busiestTube(mould: Mould) {
  let best: Tube | null = null;
  for (const tube of mould.tubes) {
    if (tube.cutUntil !== null || mould.foods.includes(tube.a) || mould.foods.includes(tube.b)) continue;
    if (!best || tube.conductance > best.conductance) best = tube;
  }
  return best;
}

/** Intact tubes crossed by a stroke `reach` spacings to either side, square across a tube. */
export function strokeAcross(mould: Mould, tube: Tube, reach = 1.6) {
  const mx = (mould.x[tube.a]! + mould.x[tube.b]!) / 2;
  const my = (mould.y[tube.a]! + mould.y[tube.b]!) / 2;
  const dx = (mould.x[tube.b]! - mould.x[tube.a]!) / tube.length;
  const dy = (mould.y[tube.b]! - mould.y[tube.a]!) / tube.length;
  return tubesCrossing(mould, mx - dy * reach, my + dx * reach, mx + dy * reach, my - dx * reach);
}

/** Ids of intact tubes crossing the segment (x1, y1)–(x2, y2), in sheet units. */
export function tubesCrossing(mould: Mould, x1: number, y1: number, x2: number, y2: number) {
  const crossed: number[] = [];
  const side = (ax: number, ay: number, bx: number, by: number, px: number, py: number) =>
    (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  for (const tube of mould.tubes) {
    if (tube.cutUntil !== null) continue;
    const ax = mould.x[tube.a]!;
    const ay = mould.y[tube.a]!;
    const bx = mould.x[tube.b]!;
    const by = mould.y[tube.b]!;
    const s1 = side(x1, y1, x2, y2, ax, ay);
    const s2 = side(x1, y1, x2, y2, bx, by);
    const s3 = side(ax, ay, bx, by, x1, y1);
    const s4 = side(ax, ay, bx, by, x2, y2);
    if (s1 * s2 < 0 && s3 * s4 < 0) crossed.push(tube.id);
  }
  return crossed;
}

/**
 * Solves (L + leak) p = b by Jacobi-preconditioned conjugate gradient, warm
 * started from the previous pressures. Returns the iterations used.
 */
function solvePressure(mould: Mould, injection: Float64Array, scratch: SolverScratch) {
  const count = mould.x.length;
  const { diagonal, residual, direction, product, preconditioned } = scratch;
  const p = mould.pressure;
  const tubes = mould.tubes;
  diagonal.fill(LEAK);
  for (const tube of tubes) {
    const g = tube.conductance / tube.length;
    diagonal[tube.a]! += g;
    diagonal[tube.b]! += g;
  }
  const multiply = (vector: Float64Array, out: Float64Array) => {
    for (let node = 0; node < count; node += 1) out[node] = LEAK * vector[node]!;
    for (const tube of tubes) {
      const g = tube.conductance / tube.length;
      if (g === 0) continue;
      const difference = g * (vector[tube.a]! - vector[tube.b]!);
      out[tube.a]! += difference;
      out[tube.b]! -= difference;
    }
  };
  multiply(p, product);
  let norm = 0;
  for (let node = 0; node < count; node += 1) {
    residual[node] = injection[node]! - product[node]!;
    norm += injection[node]! ** 2;
  }
  const target = SOLVER_TOLERANCE ** 2 * Math.max(norm, 1e-12);
  let rz = 0;
  for (let node = 0; node < count; node += 1) {
    preconditioned[node] = residual[node]! / diagonal[node]!;
    direction[node] = preconditioned[node]!;
    rz += residual[node]! * preconditioned[node]!;
  }
  let iteration = 0;
  for (; iteration < SOLVER_ITERATIONS; iteration += 1) {
    let rr = 0;
    for (let node = 0; node < count; node += 1) rr += residual[node]! ** 2;
    if (rr <= target) break;
    multiply(direction, product);
    let denominator = 0;
    for (let node = 0; node < count; node += 1) denominator += direction[node]! * product[node]!;
    if (denominator <= 0) break;
    const alpha = rz / denominator;
    let nextRz = 0;
    for (let node = 0; node < count; node += 1) {
      p[node]! += alpha * direction[node]!;
      residual[node]! -= alpha * product[node]!;
      preconditioned[node] = residual[node]! / diagonal[node]!;
      nextRz += residual[node]! * preconditioned[node]!;
    }
    const beta = nextRz / rz;
    rz = nextRz;
    for (let node = 0; node < count; node += 1) {
      direction[node] = preconditioned[node]! + beta * direction[node]!;
    }
  }
  return iteration;
}

type SolverScratch = Record<
  "injection" | "diagonal" | "residual" | "direction" | "product" | "preconditioned",
  Float64Array
>;

const scratchByMould = new WeakMap<Mould, SolverScratch>();

function scratchFor(mould: Mould) {
  let scratch = scratchByMould.get(mould);
  if (!scratch) {
    const count = mould.x.length;
    scratch = {
      injection: new Float64Array(count),
      diagonal: new Float64Array(count),
      residual: new Float64Array(count),
      direction: new Float64Array(count),
      product: new Float64Array(count),
      preconditioned: new Float64Array(count),
    };
    scratchByMould.set(mould, scratch);
  }
  return scratch;
}

/** Advances by `duration` in steps of at most MAX_STEP; returns tube changes. */
export function stepMould(mould: Mould, duration: number, parameters: MouldParameters): MouldEvent[] {
  const random = randomFor(mould);
  const scratch = scratchFor(mould);
  const events: MouldEvent[] = [];
  const { exponent, decay, inflow } = parameters;
  let remaining = Math.max(0, duration);
  while (remaining > 1e-9) {
    const delta = Math.min(MAX_STEP, remaining);
    remaining -= delta;
    mould.time += delta;

    for (const tube of mould.tubes) {
      if (tube.cutUntil === null || tube.cutUntil > mould.time) continue;
      tube.cutUntil = null;
      tube.conductance = FLOOR;
      events.push({ kind: "heal", tube: tube.id });
    }

    const foods = mould.foods;
    const injection = scratch.injection;
    injection.fill(0);
    if (foods.length >= 2) {
      const source = foods[Math.min(foods.length - 1, Math.floor(random() * foods.length))]!;
      for (const food of foods) injection[food] = food === source ? inflow : -inflow / (foods.length - 1);
      solvePressure(mould, injection, scratch);
    } else {
      mould.pressure.fill(0);
    }

    const memory = 1 - Math.exp(-delta / DRIVE_MEMORY);
    for (const tube of mould.tubes) {
      if (tube.cutUntil !== null) continue;
      const flux = foods.length >= 2
        ? (tube.conductance / tube.length) * (mould.pressure[tube.a]! - mould.pressure[tube.b]!)
        : 0;
      const strength = Math.abs(flux) ** exponent;
      const before = tube.conductance;
      const signal = strength / (1 + strength);
      const growth = signal - decay * before;
      tube.conductance = Math.max(FLOOR, before + delta * growth);
      tube.flux = flux;
      tube.drive += (signal - tube.drive) * memory;
      if (before >= LIVING && tube.conductance < LIVING) events.push({ kind: "die", tube: tube.id });
      else if (before < LIVING && tube.conductance >= LIVING) events.push({ kind: "grow", tube: tube.id });
    }
  }
  return events;
}

function find(parent: Int32Array, node: number) {
  let root = node;
  while (parent[root] !== root) root = parent[root]!;
  while (parent[node] !== root) {
    const next = parent[node]!;
    parent[node] = root;
    node = next;
  }
  return root;
}

function foodsJoined(mould: Mould, living: readonly Tube[], skip: number) {
  const parent = new Int32Array(mould.x.length);
  for (let node = 0; node < parent.length; node += 1) parent[node] = node;
  for (const tube of living) {
    if (tube.id === skip) continue;
    parent[find(parent, tube.a)] = find(parent, tube.b);
  }
  const root = find(parent, mould.foods[0]!);
  return mould.foods.every((food) => find(parent, food) === root);
}

export function measureMould(mould: Mould): MouldMeasure {
  const living = mould.tubes.filter((tube) => tube.cutUntil === null && tube.conductance >= LIVING);
  const parent = new Int32Array(mould.x.length);
  for (let node = 0; node < parent.length; node += 1) parent[node] = node;
  const touched = new Set<number>();
  let length = 0;
  let loops = 0;
  for (const tube of living) {
    length += tube.length;
    touched.add(tube.a);
    touched.add(tube.b);
    const a = find(parent, tube.a);
    const b = find(parent, tube.b);
    if (a === b) loops += 1;
    else parent[a] = b;
  }
  if (mould.foods.length < 2) return { living: living.length, length, loops, connected: true, fragile: 0 };
  const connected = foodsJoined(mould, living, -1);
  let fragile = 0;
  if (connected) {
    for (const tube of living) if (!foodsJoined(mould, living, tube.id)) fragile += 1;
  }
  return {
    living: living.length,
    length,
    loops,
    connected,
    fragile: living.length === 0 ? 0 : fragile / living.length,
  };
}
