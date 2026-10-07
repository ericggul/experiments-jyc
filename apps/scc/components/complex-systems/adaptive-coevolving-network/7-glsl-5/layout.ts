// Browser-side geometry (7-glsl-3's copy: bodies may carry a presence, so
// small pages repel, collide and link at shorter range and cluster tightly). Springs along links (direction ignored), repulsion
// between every pair, a weak pull toward the centre, and a collision pass so
// rank-sized discs never overlap. Position never feeds back into the model.

export type Body = { x: number; y: number; vx: number; vy: number };
export type Frame = { width: number; height: number };
export type Pair = { readonly from: number; readonly to: number };

/** Weaker than 7-glsl's .9: the watershed spreads over more of the land. */
const GRAVITY = 0.25;
const REPULSION = 0.35;
const SPRING = 1.6;
const GAP = 4;

export function idealLength(frame: Frame, count: number) {
  // 7-glsl: .42 of the area; more here, so the watershed spreads.
  return Math.sqrt((frame.width * frame.height * 2.0) / Math.max(1, count));
}

export function bodyAt(frame: Frame, random: () => number): Body {
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * Math.min(frame.width, frame.height) * 0.3;
  return { x: frame.width / 2 + Math.cos(angle) * distance, y: frame.height / 2 + Math.sin(angle) * distance, vx: 0, vy: 0 };
}

export function rescaleBodies(bodies: Body[], previous: Frame, next: Frame) {
  if (previous.width <= 0 || previous.height <= 0) return;
  const scale = Math.min(next.width / previous.width, next.height / previous.height);
  for (const body of bodies) {
    body.x = next.width / 2 + (body.x - previous.width / 2) * scale;
    body.y = next.height / 2 + (body.y - previous.height / 2) * scale;
  }
}

/** One relaxation step; `radii` are the drawn disc radii. */
/**
 * One relaxation step; `radii` are the drawn disc radii. `presence` (0–1 per
 * body, default 1) scales a body's reach: two bodies repel by the product of
 * their presences, collide with a gap of 1 + 3 × the smaller presence, and a
 * link's rest length shrinks with the mean presence of its ends.
 */
export function relaxBodies(
  bodies: Body[],
  links: readonly Pair[],
  radii: ArrayLike<number>,
  frame: Frame,
  delta: number,
  presence?: ArrayLike<number>,
) {
  const reachOf = (index: number) => (presence ? presence[index]! : 1);
  const count = bodies.length;
  const length = idealLength(frame, count);
  const forceX = new Float64Array(count);
  const forceY = new Float64Array(count);
  const softening = (length * 0.25) ** 2;
  const repulsion = length * length * REPULSION;

  for (let first = 0; first < count; first += 1) {
    const a = bodies[first]!;
    for (let second = first + 1; second < count; second += 1) {
      const b = bodies[second]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const push = (repulsion * reachOf(first) * reachOf(second)) / (dx * dx + dy * dy + softening);
      forceX[first]! += dx * push;
      forceY[first]! += dy * push;
      forceX[second]! -= dx * push;
      forceY[second]! -= dy * push;
    }
  }

  for (const link of links) {
    const a = bodies[link.from]!;
    const b = bodies[link.to]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(1e-3, Math.hypot(dx, dy));
    // Rest length includes both discs, so big pages keep their neighbours at the rim.
    const rest = length * 0.6 * (0.35 + 0.65 * (reachOf(link.from) + reachOf(link.to)) / 2) + radii[link.from]! + radii[link.to]!;
    const pull = ((distance - rest) / distance) * SPRING;
    forceX[link.from]! += dx * pull;
    forceY[link.from]! += dy * pull;
    forceX[link.to]! -= dx * pull;
    forceY[link.to]! -= dy * pull;
  }

  const short = Math.min(frame.width, frame.height);
  const gravityX = GRAVITY * (short / frame.width);
  const gravityY = GRAVITY * (short / frame.height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = length * 6;
  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    body.vx = (body.vx + (forceX[index]! - (body.x - frame.width / 2) * gravityX) * step) * damping;
    body.vy = (body.vy + (forceY[index]! - (body.y - frame.height / 2) * gravityY) * step) * damping;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > maxSpeed) {
      body.vx *= maxSpeed / speed;
      body.vy *= maxSpeed / speed;
    }
    body.x += body.vx * step;
    body.y += body.vy * step;
  }

  // Collision: separate overlapping discs half each way.
  for (let first = 0; first < count; first += 1) {
    const a = bodies[first]!;
    for (let second = first + 1; second < count; second += 1) {
      const b = bodies[second]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1e-3;
      const overlap = radii[first]! + radii[second]! + 1 + (GAP - 1) * Math.min(reachOf(first), reachOf(second)) - distance;
      if (overlap <= 0) continue;
      const shiftX = (dx / distance) * overlap * 0.5;
      const shiftY = (dy / distance) * overlap * 0.5;
      a.x -= shiftX;
      a.y -= shiftY;
      b.x += shiftX;
      b.y += shiftY;
    }
  }

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const r = radii[index]!;
    body.x = Math.min(frame.width - r - 2, Math.max(r + 2, body.x));
    body.y = Math.min(frame.height - r - 2, Math.max(r + 2, body.y));
  }
}
