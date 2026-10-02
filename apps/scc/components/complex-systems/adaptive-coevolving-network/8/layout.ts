// Browser-side geometry. Position encodes nothing but the current catalytic
// links: springs along every link (direction ignored), repulsion between every
// pair, weak pull toward the centre. Species nobody catalyses and who catalyse
// nobody drift to the rim; an autocatalytic set pulls its members together.

const GRAVITY = 0.9;
const REPULSION = 0.4;
const SPRING = 2.2;

export type Body = { x: number; y: number; vx: number; vy: number };

export type Frame = { width: number; height: number };

/** A link j → i as the pair [j, i]. */
export type Link = readonly [number, number];

export function idealLength(frame: Frame, count: number) {
  return Math.sqrt((frame.width * frame.height * 0.42) / Math.max(1, count));
}

export function createBodies(count: number, frame: Frame, seed = 0x2f6b31d9): Body[] {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
  const radius = Math.min(frame.width, frame.height) * 0.32;
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    return {
      x: frame.width / 2 + Math.cos(angle) * distance,
      y: frame.height / 2 + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
    };
  });
}

export function rescaleBodies(bodies: Body[], previous: Frame, next: Frame) {
  if (previous.width <= 0 || previous.height <= 0) return;
  const scale = Math.min(next.width / previous.width, next.height / previous.height);
  for (const body of bodies) {
    body.x = next.width / 2 + (body.x - previous.width / 2) * scale;
    body.y = next.height / 2 + (body.y - previous.height / 2) * scale;
  }
}

/** One relaxation step; `delta` in seconds. O(n²) repulsion is fine at n ≈ 60. */
export function relaxBodies(bodies: Body[], links: readonly Link[], frame: Frame, delta: number) {
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
      const squared = dx * dx + dy * dy + softening;
      const push = repulsion / squared;
      forceX[first]! += dx * push;
      forceY[first]! += dy * push;
      forceX[second]! -= dx * push;
      forceY[second]! -= dy * push;
    }
  }

  for (const [from, to] of links) {
    const a = bodies[from]!;
    const b = bodies[to]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(1e-3, Math.hypot(dx, dy));
    const pull = ((distance - length * 0.62) / distance) * SPRING;
    forceX[from]! += dx * pull;
    forceY[from]! += dy * pull;
    forceX[to]! -= dx * pull;
    forceY[to]! -= dy * pull;
  }

  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  const short = Math.min(frame.width, frame.height);
  const gravityX = GRAVITY * (short / frame.width);
  const gravityY = GRAVITY * (short / frame.height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = length * 6;
  const margin = Math.min(frame.width, frame.height) * 0.05;

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const fx = forceX[index]! - (body.x - centreX) * gravityX;
    const fy = forceY[index]! - (body.y - centreY) * gravityY;
    body.vx = (body.vx + fx * step) * damping;
    body.vy = (body.vy + fy * step) * damping;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > maxSpeed) {
      body.vx *= maxSpeed / speed;
      body.vy *= maxSpeed / speed;
    }
    body.x = Math.min(frame.width - margin, Math.max(margin, body.x + body.vx * step));
    body.y = Math.min(frame.height - margin, Math.max(margin, body.y + body.vy * step));
  }
}
