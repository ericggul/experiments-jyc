// Copied from bubble/1 (2026-10-08): the same physical raft layout, here driven by the Apollonian links.
// Browser-side geometry for a raft of soap bubbles (from 7-glsl-3's copy).
// Springs along links (direction ignored), a short-range repulsion, a pull
// toward the centre, and bubble contact (see below). Neighbours are found by
// sweep and prune along x (bubbles of very different sizes mix freely), so a
// step stays cheap at a thousand pages. Position never feeds back into the
// model.

export type Body = { x: number; y: number; vx: number; vy: number };
export type Frame = { width: number; height: number };
export type Pair = { readonly from: number; readonly to: number };

/** Strong enough that the bubbles gather into one raft and press together. */
const GRAVITY = 0.6;
const REPULSION = 0.35;
const SPRING = 0.4;
/** Bubbles within this gap (px) of touching are drawn together, with this stiffness (1/s²), once per step. */
const CAPILLARY_REACH = 10;
const CAPILLARY = 2;
const CONTACT_PASSES = 6;
/** Bodies kept sorted along x between steps (nearly sorted, so an insertion sort is cheap). */
let order: Int32Array = new Int32Array(0);

export function idealLength(frame: Frame, count: number) {
  // 7-glsl: .42 of the area; far less here, so repulsion is short-ranged and
  // the bubbles pack into foam instead of spreading apart.
  return Math.sqrt((frame.width * frame.height * 0.12) / Math.max(1, count));
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
  // Pairs whose discs, widened by the capillary reach, overlap along both
  // axes: exactly the pairs the contacts act on.
  const margin = CAPILLARY_REACH;
  const pairs = (visit: (a: number, b: number) => void) => {
    if (order.length !== count) order = Int32Array.from({ length: count }, (_, index) => index);
    const left = (index: number) => bodies[index]!.x - radii[index]!;
    for (let at = 1; at < count; at += 1) {
      const index = order[at]!;
      const key = left(index);
      let to = at - 1;
      while (to >= 0 && left(order[to]!) > key) {
        order[to + 1] = order[to]!;
        to -= 1;
      }
      order[to + 1] = index;
    }
    for (let at = 0; at < count; at += 1) {
      const index = order[at]!;
      const a = bodies[index]!;
      const ra = radii[index]!;
      const right = a.x + ra + margin;
      for (let after = at + 1; after < count; after += 1) {
        const other = order[after]!;
        const b = bodies[other]!;
        const rb = radii[other]!;
        if (b.x - rb > right) break;
        if (Math.abs(b.y - a.y) > ra + rb + margin) continue;
        visit(index, other);
      }
    }
  };

  // Repulsion between every pair, as before; read into flat arrays so a
  // thousand pages stay cheap.
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const reaches = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    xs[index] = bodies[index]!.x;
    ys[index] = bodies[index]!.y;
    reaches[index] = reachOf(index);
  }
  for (let first = 0; first < count; first += 1) {
    const ax = xs[first]!;
    const ay = ys[first]!;
    const scaled = repulsion * reaches[first]!;
    let fx = 0;
    let fy = 0;
    for (let second = first + 1; second < count; second += 1) {
      const dx = ax - xs[second]!;
      const dy = ay - ys[second]!;
      const push = (scaled * reaches[second]!) / (dx * dx + dy * dy + softening);
      fx += dx * push;
      fy += dy * push;
      forceX[second]! -= dx * push;
      forceY[second]! -= dy * push;
    }
    forceX[first]! += fx;
    forceY[first]! += fy;
  }

  // Capillary attraction: bubbles just short of touching are drawn
  // together by a gentle force, once per step. (Applied as a position
  // correction in every contact pass, it summed over a crowd's many
  // neighbours and collapsed small bubbles onto a single point.)
  pairs((first, second) => {
    const a = bodies[first]!;
    const b = bodies[second]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const ra = radii[first]!;
    const rb = radii[second]!;
    const distance = Math.hypot(dx, dy);
    const rest = Math.max(Math.sqrt(ra * ra + rb * rb - ra * rb), Math.max(ra, rb) + 0.25 * Math.min(ra, rb));
    const gap = distance - rest;
    if (gap <= 0 || distance > ra + rb + CAPILLARY_REACH) return;
    const pull = (CAPILLARY * gap) / distance;
    forceX[first]! += dx * pull;
    forceY[first]! += dy * pull;
    forceX[second]! -= dx * pull;
    forceY[second]! -= dy * pull;
  });

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

  // Contact, as floating soap bubbles: two bubbles of radii r₁, r₂ rest at
  // √(r₁² + r₂² − r₁r₂), where their films meet the shared wall at 120°
  // (at least the larger radius plus a quarter of the smaller, so a small
  // bubble always shows on a large one's surface instead of sinking in);
  // closer, they are pushed apart (capillary attraction, above, draws those
  // a little farther apart together). Resolved a few times per step.
  // The last pass settles only small bubbles against much larger ones, so
  // none is left inside a large bubble at the end of the step.
  for (let pass = 0; pass <= CONTACT_PASSES; pass += 1) {
    const settling = pass === CONTACT_PASSES;
    pairs((first, second) => {
      const a = bodies[first]!;
      const b = bodies[second]!;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      // Two bubbles on the very same spot part along a direction of their own
      // (otherwise there is no direction to push them apart and they stay
      // stacked for good).
      if (Math.abs(dx) + Math.abs(dy) < 1e-3) {
        const angle = (first * 2.399963 + second * 0.618034 * Math.PI) % (Math.PI * 2);
        dx = Math.cos(angle) * 1e-2;
        dy = Math.sin(angle) * 1e-2;
      }
      const ra = radii[first]!;
      const rb = radii[second]!;
      const reach = ra + rb + CAPILLARY_REACH;
      if (Math.abs(dx) > reach || Math.abs(dy) > reach) return;
      const distance = Math.hypot(dx, dy);
      const rest = Math.max(Math.sqrt(ra * ra + rb * rb - ra * rb), Math.max(ra, rb) + 0.25 * Math.min(ra, rb));
      const overlap = rest - distance;
      if (overlap <= 0) return;
      // Bubbles of like size share the correction; against a much larger
      // one (3× or more) a small bubble takes all of it, so a crowd of small
      // bubbles can never push one into a large bubble.
      const ratio = ra / rb;
      if (settling && ratio < 3 && ratio > 1 / 3) return;
      const share = ratio >= 3 ? 0 : ratio <= 1 / 3 ? 1 : 0.5;
      const shiftX = (dx / distance) * overlap;
      const shiftY = (dy / distance) * overlap;
      a.x -= shiftX * share;
      a.y -= shiftY * share;
      b.x += shiftX * (1 - share);
      b.y += shiftY * (1 - share);
      // Pressed together, they stop closing in (an inelastic contact): only
      // the part of their velocities that drives one into the other is taken
      // away, so nothing is set moving and gravity and springs cannot keep
      // pushing a bubble further into another.
      if (overlap > 0) {
        const nx = dx / distance;
        const ny = dy / distance;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing < 0) {
          a.vx += 0.5 * closing * nx;
          a.vy += 0.5 * closing * ny;
          b.vx -= 0.5 * closing * nx;
          b.vy -= 0.5 * closing * ny;
        }
      }
    });
  }

  for (let index = 0; index < count; index += 1) {
    const body = bodies[index]!;
    const r = radii[index]!;
    body.x = Math.min(frame.width - r - 2, Math.max(r + 2, body.x));
    body.y = Math.min(frame.height - r - 2, Math.max(r + 2, body.y));
  }
}
