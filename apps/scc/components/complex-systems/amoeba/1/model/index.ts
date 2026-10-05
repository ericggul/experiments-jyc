import { createFood, foodIndex, regrowFood, sampleFood, type Food } from "./food.ts";
import {
  CAPACITY,
  CYST_MASS,
  DIVISION_TICKS,
  HEADING_NOISE,
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
  readonly id: Uint32Array;
  readonly lineage: Uint16Array;
  readonly state: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly previousX: Float32Array;
  readonly previousY: Float32Array;
  readonly heading: Float32Array;
  readonly mass: Float32Array;
  /** Division progress 0→1 while DIVIDING. */
  readonly phase: Float32Array;
  /** Ticks spent as a cyst. */
  readonly dormancy: Uint16Array;
  /** Tick of the last division or placement. */
  readonly born: Uint32Array;
  readonly food: Food;
  readonly parameters: AmoebaParameters;
  readonly random: Random;
  readonly hash: SpatialHash;
};

type SpatialHash = Readonly<{
  size: number;
  start: Int32Array;
  items: Int32Array;
}>;

// Buckets at least as wide as the largest contact distance.
const HASH_SIZE = Math.floor(2 / (NEWBORN_RADIUS * 3.2));
const TAU = Math.PI * 2;

export function radiusOf(mass: number) {
  return NEWBORN_RADIUS * Math.sqrt(Math.max(mass, CYST_MASS));
}

export function createColony(
  seed: number,
  parameters: AmoebaParameters = defaultParameters,
  founders: readonly (readonly [number, number])[] = [[0, 0]],
): Colony {
  const random = createRandom(seed);
  const colony: Colony = {
    count: 0,
    tick: 0,
    nextId: 0,
    nextLineage: 0,
    capacityHits: 0,
    id: new Uint32Array(CAPACITY),
    lineage: new Uint16Array(CAPACITY),
    state: new Uint8Array(CAPACITY),
    x: new Float32Array(CAPACITY),
    y: new Float32Array(CAPACITY),
    previousX: new Float32Array(CAPACITY),
    previousY: new Float32Array(CAPACITY),
    heading: new Float32Array(CAPACITY),
    mass: new Float32Array(CAPACITY),
    phase: new Float32Array(CAPACITY),
    dormancy: new Uint16Array(CAPACITY),
    born: new Uint32Array(CAPACITY),
    food: createFood(random, parameters.foodCapacity),
    parameters,
    random,
    hash: {
      size: HASH_SIZE,
      start: new Int32Array(HASH_SIZE * HASH_SIZE + 1),
      items: new Int32Array(CAPACITY),
    },
  };
  for (const [x, y] of founders) spawnCell(colony, x, y);
  return colony;
}

function addCell(colony: Colony, x: number, y: number, heading: number, mass: number, lineage: number) {
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
  colony.phase[slot] = 0;
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

/** Places a founder of a new lineage when the point is free medium. */
export function spawnCell(colony: Colony, x: number, y: number) {
  if (colony.count >= CAPACITY) return false;
  if (Math.hypot(x, y) > 1 - NEWBORN_RADIUS) return false;
  if (clearance(colony, x, y) < NEWBORN_RADIUS) return false;
  addCell(colony, x, y, colony.random() * TAU, 1, colony.nextLineage);
  colony.nextLineage += 1;
  return true;
}

/** The emptiest of a few random points in the dish, for keyboard placement. */
export function findEmptyPoint(colony: Colony): readonly [number, number] {
  let best: readonly [number, number] = [0, 0];
  let bestGap = -Infinity;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const angle = colony.random() * TAU;
    const radius = Math.sqrt(colony.random()) * 0.92;
    const point = [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
    const gap = clearance(colony, point[0], point[1]);
    if (gap > bestGap) {
      bestGap = gap;
      best = point;
    }
  }
  return best;
}

function hashCell(value: number) {
  return Math.min(HASH_SIZE - 1, Math.max(0, Math.floor(((value + 1) / 2) * HASH_SIZE)));
}

function rebuildHash(colony: Colony) {
  const { start, items } = colony.hash;
  start.fill(0);
  for (let i = 0; i < colony.count; i += 1) {
    start[hashCell(colony.y[i]) * HASH_SIZE + hashCell(colony.x[i]) + 1] += 1;
  }
  for (let bucket = 1; bucket < start.length; bucket += 1) start[bucket] += start[bucket - 1];
  const cursor = start.slice(0, -1);
  for (let i = 0; i < colony.count; i += 1) {
    const bucket = hashCell(colony.y[i]) * HASH_SIZE + hashCell(colony.x[i]);
    items[cursor[bucket]] = i;
    cursor[bucket] += 1;
  }
}

/** Whether an active cell touches cell i, using the previous tick's hash. */
function touchesActive(colony: Colony, i: number) {
  const { x, y, mass, state } = colony;
  const { start, items } = colony.hash;
  const column = hashCell(x[i]);
  const row = hashCell(y[i]);
  const reach = radiusOf(mass[i]) * 1.2;
  for (let r = Math.max(0, row - 1); r <= Math.min(HASH_SIZE - 1, row + 1); r += 1) {
    for (let c = Math.max(0, column - 1); c <= Math.min(HASH_SIZE - 1, column + 1); c += 1) {
      const bucket = r * HASH_SIZE + c;
      for (let k = start[bucket]; k < start[bucket + 1]; k += 1) {
        const j = items[k];
        if (j === i || j >= colony.count || state[j] === CYST) continue;
        if (Math.hypot(x[j] - x[i], y[j] - y[i]) < reach + radiusOf(mass[j])) return true;
      }
    }
  }
  return false;
}

function resolveOverlaps(colony: Colony) {
  const { x, y, mass } = colony;
  const { start, items } = colony.hash;
  const push = colony.parameters.push * 0.5;
  for (let i = 0; i < colony.count; i += 1) {
    const column = hashCell(x[i]);
    const row = hashCell(y[i]);
    const ri = radiusOf(mass[i]);
    for (let dy = -1; dy <= 1; dy += 1) {
      const r = row + dy;
      if (r < 0 || r >= HASH_SIZE) continue;
      for (let dx = -1; dx <= 1; dx += 1) {
        const c = column + dx;
        if (c < 0 || c >= HASH_SIZE) continue;
        const bucket = r * HASH_SIZE + c;
        for (let k = start[bucket]; k < start[bucket + 1]; k += 1) {
          const j = items[k];
          if (j <= i) continue;
          const ox = x[j] - x[i];
          const oy = y[j] - y[i];
          const distance = Math.hypot(ox, oy) || 1e-6;
          const overlap = ri + radiusOf(mass[j]) - distance;
          if (overlap <= 0) continue;
          const shift = (overlap * push) / distance;
          x[i] -= ox * shift;
          y[i] -= oy * shift;
          x[j] += ox * shift;
          y[j] += oy * shift;
        }
      }
    }
  }
}

function keepInDish(colony: Colony, i: number) {
  const limit = 1 - radiusOf(colony.mass[i]);
  const distance = Math.hypot(colony.x[i], colony.y[i]);
  if (distance <= limit) return;
  colony.x[i] *= limit / distance;
  colony.y[i] *= limit / distance;
  colony.heading[i] = Math.atan2(-colony.y[i], -colony.x[i]) + (colony.random() - 0.5);
}

function divide(colony: Colony, i: number) {
  const half = colony.mass[i] / 2;
  const axis = colony.heading[i] + Math.PI / 2;
  const offset = radiusOf(half) * 0.9;
  const ax = Math.cos(axis) * offset;
  const ay = Math.sin(axis) * offset;
  const x = colony.x[i];
  const y = colony.y[i];
  colony.state[i] = ACTIVE;
  colony.phase[i] = 0;
  colony.mass[i] = half;
  colony.x[i] = x - ax;
  colony.y[i] = y - ay;
  colony.heading[i] = axis + Math.PI;
  colony.born[i] = colony.tick;
  const daughter = addCell(colony, x + ax, y + ay, axis, half, colony.lineage[i]);
  colony.previousX[daughter] = x;
  colony.previousY[daughter] = y;
}

const columns = ["id", "lineage", "state", "x", "y", "previousX", "previousY", "heading", "mass", "phase", "dormancy", "born"] as const;

/** Removes cysts past their lifetime, keeping slot order (and determinism). */
function dissolveOldCysts(colony: Colony) {
  const lifetime = colony.parameters.cystLifetime;
  let kept = 0;
  for (let i = 0; i < colony.count; i += 1) {
    if (colony.state[i] === CYST && colony.dormancy[i] >= lifetime) continue;
    if (kept !== i) for (const column of columns) colony[column][kept] = colony[column][i];
    kept += 1;
  }
  colony.count = kept;
}

/** One model tick: eat, pay, sense and move, divide, encyst or wake, dissolve, push, regrow. */
export function stepColony(colony: Colony) {
  const { parameters: p, food, random } = colony;
  const { x, y, heading, mass, state, phase } = colony;
  colony.previousX.set(x.subarray(0, colony.count));
  colony.previousY.set(y.subarray(0, colony.count));
  const living = colony.count;

  for (let i = 0; i < living; i += 1) {
    const cell = foodIndex(food, x[i], y[i]);

    if (state[i] === CYST) {
      colony.dormancy[i] = Math.min(65535, colony.dormancy[i] + 1);
      if (
        food.level[cell] > p.wakeThreshold * p.foodCapacity &&
        (random() < p.wakeChance || touchesActive(colony, i))
      ) {
        state[i] = ACTIVE;
        heading[i] = random() * TAU;
      }
      continue;
    }

    const eaten = food.level[cell] * p.eat;
    food.level[cell] -= eaten;
    mass[i] += eaten - p.cost;

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

    if (mass[i] < CYST_MASS) {
      state[i] = CYST;
      mass[i] = CYST_MASS;
      colony.dormancy[i] = 0;
      continue;
    }

    if (mass[i] >= p.divideMass) {
      state[i] = DIVIDING;
      phase[i] = 0;
      continue;
    }

    const reach = radiusOf(mass[i]) * 3;
    const left = sampleFood(food, x[i] + Math.cos(heading[i] + SENSOR_ANGLE) * reach, y[i] + Math.sin(heading[i] + SENSOR_ANGLE) * reach);
    const right = sampleFood(food, x[i] + Math.cos(heading[i] - SENSOR_ANGLE) * reach, y[i] + Math.sin(heading[i] - SENSOR_ANGLE) * reach);
    heading[i] += p.turn * Math.sign(left - right) + HEADING_NOISE * (random() - 0.5);
    x[i] += Math.cos(heading[i]) * p.speed;
    y[i] += Math.sin(heading[i]) * p.speed;
  }

  dissolveOldCysts(colony);
  rebuildHash(colony);
  resolveOverlaps(colony);
  for (let i = 0; i < colony.count; i += 1) keepInDish(colony, i);
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
