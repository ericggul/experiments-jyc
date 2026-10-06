import {
  CYST,
  DIVIDING,
  DIVISION_TICKS,
  TICKS_PER_SECOND,
  radiusOf,
  type Colony,
} from "../model/index.ts";

/**
 * The drawn body of one cell. It follows the model through damped springs so
 * tick steps, collision pushes and state switches never appear as jumps.
 */
export type Body = {
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  radius: number;
  /** 0 → 1 as the cell encysts, back as it wakes. */
  cyst: number;
  /** 0 → 1 as the cell appears; back to 0 when it dissolves. */
  presence: number;
  phase: number;
  age: number;
  born: number;
  lineage: number;
  seed: number;
  mass: number;
  alive: boolean;
};

export type Bodies = {
  readonly byId: Map<number, Body>;
  readonly list: Body[];
};

const POSITION_FREQUENCY = 14;
/** Radians per second; a body never swings faster than this. */
const MAX_TURN_RATE = 2.5;

export function createBodies(): Bodies {
  return { byId: new Map(), list: [] };
}

function approach(value: number, target: number, rate: number, dt: number) {
  return value + (target - value) * (1 - Math.exp(-rate * dt));
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const MAX_STEP = 0.05;

/**
 * Advances every body by `dt` seconds toward the colony at interpolation
 * `alpha`; long gaps (a still frame) settle in sub-steps of up to 2 s.
 */
export function updateBodies(bodies: Bodies, colony: Colony, alpha: number, dt: number) {
  let remaining = Math.min(Math.max(dt, 0), 2);
  do {
    const step = Math.min(remaining, MAX_STEP);
    stepBodies(bodies, colony, alpha, step);
    remaining -= step;
  } while (remaining > 1e-6);
}

function stepBodies(bodies: Bodies, colony: Colony, alpha: number, step: number) {
  for (const body of bodies.list) body.alive = false;

  for (let i = 0; i < colony.count; i += 1) {
    const id = colony.id[i];
    // Halves born this tick already sit where the dividing shape ended.
    const fresh = colony.born[i] >= colony.tick - 1;
    const targetX = fresh ? colony.x[i] : colony.previousX[i] + (colony.x[i] - colony.previousX[i]) * alpha;
    const targetY = fresh ? colony.y[i] : colony.previousY[i] + (colony.y[i] - colony.previousY[i]) * alpha;
    const targetRadius = radiusOf(colony.mass[i]);
    let body = bodies.byId.get(id);

    if (!body) {
      // A daughter starts exactly where the dividing shape drew it; a placed
      // founder grows in from a small presence.
      const fromDivision = colony.previousX[i] !== colony.x[i] || colony.previousY[i] !== colony.y[i];
      body = {
        id,
        x: colony.x[i],
        y: colony.y[i],
        vx: 0,
        vy: 0,
        heading: colony.heading[i],
        radius: targetRadius,
        cyst: colony.state[i] === CYST ? 1 : 0,
        presence: fromDivision ? 1 : 0,
        phase: 0,
        age: 0,
        born: colony.born[i],
        lineage: colony.lineage[i],
        seed: id % 997,
        mass: colony.mass[i],
        alive: true,
      };
      bodies.byId.set(id, body);
      bodies.list.push(body);
    } else if (body.born !== colony.born[i]) {
      // The parent just finished dividing: its half is already drawn here.
      body.born = colony.born[i];
      body.x = colony.x[i];
      body.y = colony.y[i];
      body.vx = body.vy = 0;
      body.radius = targetRadius;
      body.heading = colony.heading[i];
    }

    body.alive = true;
    body.lineage = colony.lineage[i];
    body.mass = colony.mass[i];
    body.age = (colony.tick - colony.born[i] + alpha) / TICKS_PER_SECOND;
    body.phase = colony.state[i] === DIVIDING ? Math.min(1, colony.phase[i] + alpha / DIVISION_TICKS) : 0;

    const w = POSITION_FREQUENCY;
    body.vx += (w * w * (targetX - body.x) - 2 * w * body.vx) * step;
    body.vy += (w * w * (targetY - body.y) - 2 * w * body.vy) * step;
    body.x += body.vx * step;
    body.y += body.vy * step;
    body.radius = approach(body.radius, targetRadius, 8, step);
    const turn = wrapAngle(colony.heading[i] - body.heading) * (1 - Math.exp(-4 * step));
    body.heading += Math.max(-MAX_TURN_RATE * step, Math.min(MAX_TURN_RATE * step, turn));
    body.cyst = approach(body.cyst, colony.state[i] === CYST ? 1 : 0, 2.5, step);
    body.presence = approach(body.presence, 1, 3, step);
  }

  // Dissolved cells fade out in place.
  let kept = 0;
  for (const body of bodies.list) {
    if (!body.alive) {
      body.presence = approach(body.presence, 0, 2, step);
      if (body.presence < 0.02) {
        bodies.byId.delete(body.id);
        continue;
      }
    }
    bodies.list[kept] = body;
    kept += 1;
  }
  bodies.list.length = kept;
}
