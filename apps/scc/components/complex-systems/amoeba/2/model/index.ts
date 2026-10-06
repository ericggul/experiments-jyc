import { createFood, foodColumn, foodIndex, foodRow, regrowFood, sampleFood, type Food } from "./food.ts";
import {
  CAPACITY,
  CYST_MASS,
  DIVISION_TICKS,
  HEADING_NOISE,
  MIN_CYCLE_TICKS,
  SPLIT_MIN,
  SPLIT_SEPARATION,
  NEWBORN_RADIUS,
  SENSOR_ANGLE,
  defaultParameters,
  type AmoebaParameters,
} from "./parameters.ts";
import { createRandom, type Random } from "./random.ts";

export * from "./parameters.ts";
export type { Food } from "./food.ts";

export const ACTIVE = 0;
export const DIVIDING = 1;
export const CYST = 2;

/** Struct-of-arrays population; slots [0, count) are live. */
export type Colony = {
  count: number;
  tick: number;
  nextId: number;
  nextLineage: number;
  capacityHits: number;
  readonly halfWidth: number;
  readonly id: Uint32Array;
  readonly lineage: Uint16Array;
  readonly state: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly previousX: Float32Array;
  readonly previousY: Float32Array;
  readonly heading: Float32Array;
  readonly mass: Float32Array;
  /** Inherited body size k; a newborn has mass k². */
  readonly size: Float32Array;
  /** Division progress 0→1 while DIVIDING. */
  readonly phase: Float32Array;
  /** Mass fraction the first half keeps, chosen when division begins. */
  readonly split: Float32Array;
  /** Ticks spent as a cyst. */
  readonly dormancy: Uint16Array;
  /** Tick of the last division or placement. */
  readonly born: Uint32Array;
  /** Set by the contact pass when an active body touches this cyst. */
  readonly touched: Uint8Array;
  readonly food: Food;
  readonly parameters: AmoebaParameters;
  readonly random: Random;
  readonly hash: SpatialHash;
};

type SpatialHash = {
  readonly bucket: number;
  readonly columns: number;
  readonly rows: number;
  readonly start: Int32Array;
  readonly cursor: Int32Array;
  readonly items: Int32Array;
  /** Largest body radius at the last rebuild. */
  largest: number;
};

const TAU = Math.PI * 2;
// Buckets fit a typical small body; large bodies search more buckets.
const BUCKET = NEWBORN_RADIUS * 2.5;
/** Largest contact displacement per tick, in the moved body's radii. */
const MAX_SHOVE = 0.12;

export function radiusOf(mass: number) {
  return NEWBORN_RADIUS * Math.sqrt(Math.max(mass, 1e-3));
}

export function createColony(
  seed: number,
  parameters: AmoebaParameters = defaultParameters,
  founders: readonly (readonly [number, number])[] = [[0, 0]],
  halfWidth = 16 / 9,
): Colony {
  const random = createRandom(seed);
  const columns = Math.ceil((2 * halfWidth) / BUCKET);
  const rows = Math.ceil(2 / BUCKET);
  const colony: Colony = {
    count: 0,
    tick: 0,
    nextId: 0,
    nextLineage: 0,
    capacityHits: 0,
    halfWidth,
    id: new Uint32Array(CAPACITY),
    lineage: new Uint16Array(CAPACITY),
    state: new Uint8Array(CAPACITY),
    x: new Float32Array(CAPACITY),
    y: new Float32Array(CAPACITY),
    previousX: new Float32Array(CAPACITY),
    previousY: new Float32Array(CAPACITY),
    heading: new Float32Array(CAPACITY),
    mass: new Float32Array(CAPACITY),
    size: new Float32Array(CAPACITY),
    phase: new Float32Array(CAPACITY),
    split: new Float32Array(CAPACITY),
    dormancy: new Uint16Array(CAPACITY),
    born: new Uint32Array(CAPACITY),
    touched: new Uint8Array(CAPACITY),
    food: createFood(random, parameters.foodCapacity, halfWidth),
    parameters,
    random,
    hash: {
      bucket: BUCKET,
      columns,
      rows,
      start: new Int32Array(columns * rows + 1),
      cursor: new Int32Array(columns * rows),
      items: new Int32Array(CAPACITY),
      largest: NEWBORN_RADIUS,
    },
  };
  for (const [x, y] of founders) spawnCell(colony, x, y);
  return colony;
}

/** A founder's size: heavy-tailed, so most are small and a few are huge. */
export function drawFounderSize(colony: Colony) {
  const p = colony.parameters;
  const u = Math.max(colony.random(), 1e-6);
  return Math.min(p.sizeMax, p.sizeMin * Math.pow(u, -1 / p.sizeTail));
}

function gaussian(random: Random) {
  return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-9))) * Math.cos(TAU * random());
}

/**
 * A half's target size: the parent's, drifted, then bounded by the half's own
 * mass so it is neither already due to divide nor already starving.
 */
function inheritedSize(colony: Colony, parentSize: number, mass: number) {
  const p = colony.parameters;
  const drifted = parentSize * Math.exp(p.sizeDrift * gaussian(colony.random));
  const smallest = Math.sqrt(mass / (0.75 * p.divideMass));
  const largest = Math.sqrt(mass / (1.4 * CYST_MASS));
  return Math.min(p.sizeMax, Math.max(p.sizeMin, Math.min(largest, Math.max(smallest, drifted))));
}

/** Where each half ends up, in the parent's frame: the shader draws the same. */
export function splitGeometry(split: number) {
  const radiusA = Math.sqrt(split);
  const radiusB = Math.sqrt(1 - split);
  const separation = SPLIT_SEPARATION * (radiusA + radiusB);
  // Centre of mass stays put: the heavier half moves less.
  return { radiusA, radiusB, offsetA: -separation * (1 - split), offsetB: separation * split };
}

function addCell(colony: Colony, x: number, y: number, heading: number, mass: number, size: number, lineage: number) {
  const slot = colony.count;
  colony.count += 1;
  colony.id[slot] = colony.nextId;
  colony.nextId += 1;
  colony.lineage[slot] = lineage;
  colony.state[slot] = ACTIVE;
  colony.x[slot] = colony.previousX[slot] = x;
  colony.y[slot] = colony.previousY[slot] = y;
  colony.heading[slot] = heading;
  colony.mass[slot] = mass;
  colony.size[slot] = size;
  colony.phase[slot] = 0;
  colony.split[slot] = 0.5;
  colony.dormancy[slot] = 0;
  colony.born[slot] = colony.tick;
  return slot;
}

/** Distance from (x, y) to the nearest cell edge; Infinity when empty. */
export function clearance(colony: Colony, x: number, y: number) {
  let nearest = Infinity;
  for (let i = 0; i < colony.count; i += 1) {
    const gap = Math.hypot(colony.x[i] - x, colony.y[i] - y) - radiusOf(colony.mass[i]);
    if (gap < nearest) nearest = gap;
  }
  return nearest;
}

export function insideZone(colony: Colony, x: number, y: number, margin: number) {
  return Math.abs(x) <= colony.halfWidth - margin && Math.abs(y) <= 1 - margin;
}

/** Places a founder of a new lineage when the point is free medium. */
export function spawnCell(colony: Colony, x: number, y: number, size = drawFounderSize(colony)) {
  const radius = radiusOf(size * size);
  if (colony.count >= CAPACITY) return false;
  if (!insideZone(colony, x, y, radius)) return false;
  if (clearance(colony, x, y) < radius) return false;
  addCell(colony, x, y, colony.random() * TAU, size * size, size, colony.nextLineage);
  colony.nextLineage += 1;
  return true;
}

/** The emptiest of a few random points in the zone, for keyboard placement. */
export function findEmptyPoint(colony: Colony): readonly [number, number] {
  let best: readonly [number, number] = [0, 0];
  let bestGap = -Infinity;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const point = [(colony.random() * 2 - 1) * colony.halfWidth * 0.94, (colony.random() * 2 - 1) * 0.94] as const;
    const gap = clearance(colony, point[0], point[1]);
    if (gap > bestGap) {
      bestGap = gap;
      best = point;
    }
  }
  return best;
}

function bucketColumn(hash: SpatialHash, colony: Colony, x: number) {
  return Math.min(hash.columns - 1, Math.max(0, Math.floor((x + colony.halfWidth) / hash.bucket)));
}

function bucketRow(hash: SpatialHash, y: number) {
  return Math.min(hash.rows - 1, Math.max(0, Math.floor((y + 1) / hash.bucket)));
}

function rebuildHash(colony: Colony) {
  const { hash } = colony;
  const { start, cursor, items, columns } = hash;
  start.fill(0);
  let largest = 0;
  for (let i = 0; i < colony.count; i += 1) {
    start[bucketRow(hash, colony.y[i]) * columns + bucketColumn(hash, colony, colony.x[i]) + 1] += 1;
    largest = Math.max(largest, radiusOf(colony.mass[i]));
  }
  hash.largest = largest;
  for (let bucket = 1; bucket < start.length; bucket += 1) start[bucket] += start[bucket - 1];
  cursor.set(start.subarray(0, cursor.length));
  for (let i = 0; i < colony.count; i += 1) {
    const bucket = bucketRow(hash, colony.y[i]) * columns + bucketColumn(hash, colony, colony.x[i]);
    items[cursor[bucket]] = i;
    cursor[bucket] += 1;
  }
}

/**
 * Each touching pair is resolved once, from the larger body's side, so a
 * search only spans that body's own diameter. Lighter bodies give way more.
 * The same pass marks cysts that an active body touches (within 20 %).
 */
function resolveOverlaps(colony: Colony) {
  const { x, y, mass, hash, state, touched } = colony;
  const { start, items, columns } = hash;
  const push = colony.parameters.push;
  touched.fill(0, 0, colony.count);
  for (let i = 0; i < colony.count; i += 1) {
    const ri = radiusOf(mass[i]);
    const span = Math.ceil((2.2 * ri) / hash.bucket);
    const column = bucketColumn(hash, colony, x[i]);
    const row = bucketRow(hash, y[i]);
    for (let r = Math.max(0, row - span); r <= Math.min(hash.rows - 1, row + span); r += 1) {
      for (let c = Math.max(0, column - span); c <= Math.min(columns - 1, column + span); c += 1) {
        const bucket = r * columns + c;
        for (let k = start[bucket]; k < start[bucket + 1]; k += 1) {
          const j = items[k];
          if (j === i) continue;
          const rj = radiusOf(mass[j]);
          if (rj > ri || (rj === ri && j < i)) continue;
          const ox = x[j] - x[i];
          const oy = y[j] - y[i];
          const distance = Math.hypot(ox, oy) || 1e-6;
          const overlap = ri + rj - distance;
          if (overlap > -0.2 * rj && (state[i] === CYST) !== (state[j] === CYST)) {
            touched[state[i] === CYST ? i : j] = 1;
          }
          if (overlap <= 0) continue;
          // Soft contact: no body is shoved more than a fraction of its own
          // radius per tick, so a giant meeting a tiny body never flings it.
          const share = mass[j] / (mass[i] + mass[j]);
          const moveI = Math.min(overlap * push * share, MAX_SHOVE * ri) / distance;
          const moveJ = Math.min(overlap * push * (1 - share), MAX_SHOVE * rj) / distance;
          x[i] -= ox * moveI;
          y[i] -= oy * moveI;
          x[j] += ox * moveJ;
          y[j] += oy * moveJ;
        }
      }
    }
  }
}

function keepInZone(colony: Colony, i: number) {
  const radius = radiusOf(colony.mass[i]);
  const limitX = Math.max(0, colony.halfWidth - radius);
  const limitY = Math.max(0, 1 - radius);
  let hit = false;
  if (colony.x[i] > limitX || colony.x[i] < -limitX) {
    colony.x[i] = Math.max(-limitX, Math.min(limitX, colony.x[i]));
    colony.heading[i] = Math.PI - colony.heading[i];
    hit = true;
  }
  if (colony.y[i] > limitY || colony.y[i] < -limitY) {
    colony.y[i] = Math.max(-limitY, Math.min(limitY, colony.y[i]));
    colony.heading[i] = -colony.heading[i];
    hit = true;
  }
  if (hit) colony.heading[i] += (colony.random() - 0.5) * 0.6;
}

/** Eats over every food square under the body; returns the mass gained. */
function graze(colony: Colony, i: number) {
  const { food } = colony;
  const radius = radiusOf(colony.mass[i]);
  const k2 = colony.size[i] * colony.size[i];
  const cx = colony.x[i];
  const cy = colony.y[i];
  const squareWidth = (2 * food.halfWidth) / food.columns;
  const squareHeight = 2 / food.rows;
  const c0 = foodColumn(food, cx - radius);
  const c1 = foodColumn(food, cx + radius);
  const r0 = foodRow(food, cy - radius);
  const r1 = foodRow(food, cy + radius);
  let under = 0;
  for (let r = r0; r <= r1; r += 1) {
    const sy = -1 + (r + 0.5) * squareHeight;
    for (let c = c0; c <= c1; c += 1) {
      const sx = -food.halfWidth + (c + 0.5) * squareWidth;
      if ((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy) <= radius * radius) under += 1;
    }
  }
  if (under === 0) {
    // A body smaller than a square eats from the square it sits on.
    const index = foodIndex(food, cx, cy);
    const eaten = food.level[index] * Math.min(1, colony.parameters.eat * k2);
    food.level[index] -= eaten;
    return eaten;
  }
  // Intake is mass-proportional; it is drawn evenly from the squares under the body.
  const share = Math.min(1, (colony.parameters.eat * k2) / under);
  let eaten = 0;
  for (let r = r0; r <= r1; r += 1) {
    const sy = -1 + (r + 0.5) * squareHeight;
    for (let c = c0; c <= c1; c += 1) {
      const sx = -food.halfWidth + (c + 0.5) * squareWidth;
      if ((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy) > radius * radius) continue;
      const index = r * food.columns + c;
      const bite = food.level[index] * share;
      food.level[index] -= bite;
      eaten += bite;
    }
  }
  return eaten;
}

/**
 * Mass-conserving, possibly unequal division: the halves keep split and
 * 1 - split of the mass, so every body's size is continuous through division.
 */
function divide(colony: Colony, i: number) {
  const mass = colony.mass[i];
  const split = colony.split[i];
  const radius = radiusOf(mass);
  const geometry = splitGeometry(split);
  const axis = colony.heading[i] + Math.PI / 2;
  const ux = Math.cos(axis);
  const uy = Math.sin(axis);
  const x = colony.x[i];
  const y = colony.y[i];
  const parentSize = colony.size[i];
  const massA = mass * split;
  const massB = mass - massA;
  colony.state[i] = ACTIVE;
  colony.phase[i] = 0;
  colony.mass[i] = massA;
  colony.size[i] = inheritedSize(colony, parentSize, massA);
  colony.x[i] = x + ux * geometry.offsetA * radius;
  colony.y[i] = y + uy * geometry.offsetA * radius;
  colony.heading[i] = axis + Math.PI;
  colony.born[i] = colony.tick;
  const daughter = addCell(
    colony,
    x + ux * geometry.offsetB * radius,
    y + uy * geometry.offsetB * radius,
    axis,
    massB,
    inheritedSize(colony, parentSize, massB),
    colony.lineage[i],
  );
  colony.previousX[daughter] = x;
  colony.previousY[daughter] = y;
}

function columnsOf(colony: Colony) {
  return [
    colony.id, colony.lineage, colony.state, colony.x, colony.y, colony.previousX, colony.previousY,
    colony.heading, colony.mass, colony.size, colony.phase, colony.split, colony.dormancy, colony.born, colony.touched,
  ] as const;
}

/**
 * Removes cysts past their lifetime, keeping slot order (and determinism).
 * Surviving runs move with native copyWithin, so a mass dissolution costs a
 * few memory moves instead of a per-slot, per-column copy.
 */
function dissolveOldCysts(colony: Colony) {
  const lifetime = colony.parameters.cystLifetime;
  const { state, dormancy, count } = colony;
  let first = 0;
  while (first < count && !(state[first] === CYST && dormancy[first] >= lifetime)) first += 1;
  if (first === count) return;
  const columns = columnsOf(colony);
  let kept = first;
  let i = first;
  while (i < count) {
    if (state[i] === CYST && dormancy[i] >= lifetime) {
      i += 1;
      continue;
    }
    let end = i;
    while (end < count && !(state[end] === CYST && dormancy[end] >= lifetime)) end += 1;
    for (const column of columns) column.copyWithin(kept, i, end);
    kept += end - i;
    i = end;
  }
  colony.count = kept;
}

/** One model tick: eat, pay, sense and move, divide, encyst or wake, dissolve, push, regrow. */
export function stepColony(colony: Colony) {
  const { parameters: p, food, random } = colony;
  const { x, y, heading, mass, size, state, phase } = colony;
  colony.previousX.set(x);
  colony.previousY.set(y);
  const living = colony.count;

  for (let i = 0; i < living; i += 1) {
    const k2 = size[i] * size[i];

    if (state[i] === CYST) {
      colony.dormancy[i] = Math.min(65535, colony.dormancy[i] + 1);
      if (
        food.level[foodIndex(food, x[i], y[i])] > p.wakeThreshold * p.foodCapacity &&
        (random() < p.wakeChance || colony.touched[i] === 1)
      ) {
        state[i] = ACTIVE;
        heading[i] = random() * TAU;
      }
      continue;
    }

    mass[i] += graze(colony, i) - p.cost * k2;

    if (state[i] === DIVIDING) {
      phase[i] += 1 / DIVISION_TICKS;
      if (phase[i] >= 1) {
        if (colony.count < CAPACITY) divide(colony, i);
        else {
          state[i] = ACTIVE;
          phase[i] = 0;
          colony.capacityHits += 1;
        }
      }
      continue;
    }

    if (mass[i] < CYST_MASS * k2) {
      state[i] = CYST;
      colony.dormancy[i] = 0;
      continue;
    }

    if (mass[i] >= p.divideMass * k2 && colony.tick - colony.born[i] >= MIN_CYCLE_TICKS) {
      state[i] = DIVIDING;
      phase[i] = 0;
      colony.split[i] = Math.min(1 - SPLIT_MIN, Math.max(SPLIT_MIN, 0.5 + p.splitSpread * gaussian(random)));
      continue;
    }

    const reach = radiusOf(mass[i]) * 3;
    const left = sampleFood(food, x[i] + Math.cos(heading[i] + SENSOR_ANGLE) * reach, y[i] + Math.sin(heading[i] + SENSOR_ANGLE) * reach);
    const right = sampleFood(food, x[i] + Math.cos(heading[i] - SENSOR_ANGLE) * reach, y[i] + Math.sin(heading[i] - SENSOR_ANGLE) * reach);
    heading[i] += p.turn * Math.sign(left - right) + HEADING_NOISE * (random() - 0.5);
    const speed = p.speed * Math.pow(size[i], -p.sizeDrag);
    x[i] += Math.cos(heading[i]) * speed;
    y[i] += Math.sin(heading[i]) * speed;
  }

  dissolveOldCysts(colony);
  rebuildHash(colony);
  resolveOverlaps(colony);
  for (let i = 0; i < colony.count; i += 1) keepInZone(colony, i);
  regrowFood(food, p.regrow);
  colony.tick += 1;
}

export function census(colony: Colony) {
  let active = 0;
  let dividing = 0;
  let cyst = 0;
  for (let i = 0; i < colony.count; i += 1) {
    if (colony.state[i] === CYST) cyst += 1;
    else if (colony.state[i] === DIVIDING) dividing += 1;
    else active += 1;
  }
  return { active, dividing, cyst, total: colony.count };
}
