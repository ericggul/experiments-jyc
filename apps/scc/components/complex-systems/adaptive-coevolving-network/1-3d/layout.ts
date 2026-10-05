// Browser-side geometry, the 2D force layout of route 1 lifted into a volume.
// Position still encodes nothing but the current ties: springs along every tie,
// repulsion between every pair, a weak pull toward the origin. The force law is
// the same as route 1; it is linear in length, so the layout is computed in
// units of one ideal tie length and the renderer scales it to the view.

import type { CoevolvingTie } from "./model";

const GRAVITY = 0.9;
const REPULSION = 0.4;
const SPRING = 2.2;
/** Rest length of a tie, in ideal lengths (route 1 uses .62 of its ideal length). */
export const TIE_REST = 0.62;

export type Body = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type Point = { x: number; y: number; z: number };

export function createBodies(count: number, seed = 0x2f6b31d9): Body[] {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  const radius = Math.cbrt(count) * 0.9;
  return Array.from({ length: count }, () => {
    // Uniform in a ball: cube-root radius, uniform direction.
    const distance = Math.cbrt(random()) * radius;
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    return {
      x: Math.cos(angle) * ring * distance,
      y: Math.sin(angle) * ring * distance,
      z: z * distance,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });
}

// Reused between frames so the layout allocates nothing per step.
const forces = {
  x: new Float64Array(0),
  y: new Float64Array(0),
  z: new Float64Array(0),
};

/** One relaxation step; `delta` in seconds. O(n²) repulsion, n ≤ 800. */
export function relaxBodies(
  bodies: Body[],
  ties: readonly CoevolvingTie[],
  delta: number,
) {
  const count = bodies.length;
  if (forces.x.length < count) {
    forces.x = new Float64Array(count * 2);
    forces.y = new Float64Array(count * 2);
    forces.z = new Float64Array(count * 2);
  }
  const forceX = forces.x.fill(0, 0, count);
  const forceY = forces.y.fill(0, 0, count);
  const forceZ = forces.z.fill(0, 0, count);
  const softening = 0.25 ** 2;

  for (let first = 0; first < count; first += 1) {
    const a = bodies[first]!;
    let fx = 0;
    let fy = 0;
    let fz = 0;
    for (let second = first + 1; second < count; second += 1) {
      const b = bodies[second]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const push = REPULSION / (dx * dx + dy * dy + dz * dz + softening);
      fx += dx * push;
      fy += dy * push;
      fz += dz * push;
      forceX[second]! -= dx * push;
      forceY[second]! -= dy * push;
      forceZ[second]! -= dz * push;
    }
    forceX[first]! += fx;
    forceY[first]! += fy;
    forceZ[first]! += fz;
  }

  for (const tie of ties) {
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const distance = Math.max(1e-3, Math.hypot(dx, dy, dz));
    const pull = ((distance - TIE_REST) / distance) * SPRING;
    forceX[tie.a]! += dx * pull;
    forceY[tie.a]! += dy * pull;
    forceZ[tie.a]! += dz * pull;
    forceX[tie.b]! -= dx * pull;
    forceY[tie.b]! -= dy * pull;
    forceZ[tie.b]! -= dz * pull;
  }

  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = 6;

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const fx = forceX[index]! - body.x * GRAVITY;
    const fy = forceY[index]! - body.y * GRAVITY;
    const fz = forceZ[index]! - body.z * GRAVITY;
    body.vx = (body.vx + fx * step) * damping;
    body.vy = (body.vy + fy * step) * damping;
    body.vz = (body.vz + fz * step) * damping;
    const speed = Math.hypot(body.vx, body.vy, body.vz);
    if (speed > maxSpeed) {
      body.vx *= maxSpeed / speed;
      body.vy *= maxSpeed / speed;
      body.vz *= maxSpeed / speed;
    }
    body.x += body.vx * step;
    body.y += body.vy * step;
    body.z += body.vz * step;
  }
}

/** Root-mean-square distance from the origin, used to fit the cloud to the view. */
export function spread(bodies: readonly Point[]) {
  if (bodies.length === 0) return 1;
  let sum = 0;
  for (const body of bodies) sum += body.x * body.x + body.y * body.y + body.z * body.z;
  return Math.max(1, Math.sqrt(sum / bodies.length));
}

/** Indices of the `count` bodies closest to `point`. */
export function nearestBodies(bodies: readonly Point[], point: Point, count: number) {
  return bodies
    .map((body, index) => ({
      index,
      distance: Math.hypot(body.x - point.x, body.y - point.y, body.z - point.z),
    }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, count)
    .map((candidate) => candidate.index);
}

/** Indices of bodies within `radius` of `point`. */
export function bodiesWithin(bodies: readonly Point[], point: Point, radius: number) {
  const reached: number[] = [];
  bodies.forEach((body, index) => {
    if (Math.hypot(body.x - point.x, body.y - point.y, body.z - point.z) <= radius) {
      reached.push(index);
    }
  });
  return reached;
}
