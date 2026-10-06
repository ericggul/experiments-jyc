// Browser-side geometry. Position encodes nothing but the current ties: springs
// along every tie, repulsion between every pair, weak pull toward the centre.
// When ties are rewired the drawing therefore reorganizes; separate components
// drift apart into visible islands.

import type { CoevolvingTie } from "./model";

const GRAVITY = 0.9;
const REPULSION = 0.4;
const SPRING = 2.2;

export type Body = { x: number; y: number; vx: number; vy: number };

export type Frame = { width: number; height: number };

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

/** Opening angle for Barnes–Hut: a group is one body when size < θ · distance. */
const OPENING = 0.75;
/** Voters a leaf holds before it splits. */
const LEAF_SIZE = 6;
const MAX_TREE_DEPTH = 24;

type Tree = {
  left: Float64Array;
  top: Float64Array;
  half: Float64Array;
  mass: Float64Array;
  sumX: Float64Array;
  sumY: Float64Array;
  child: Int32Array;
  head: Int32Array;
  held: Int32Array;
  next: Int32Array;
  stack: Int32Array;
};

let tree: Tree | null = null;

/** Tree storage is kept between frames and only grows. */
function treeFor(count: number): Tree {
  const capacity = count * 4 + 64;
  if (tree && tree.next.length >= count && tree.left.length >= capacity) return tree;
  tree = {
    left: new Float64Array(capacity),
    top: new Float64Array(capacity),
    half: new Float64Array(capacity),
    mass: new Float64Array(capacity),
    sumX: new Float64Array(capacity),
    sumY: new Float64Array(capacity),
    child: new Int32Array(capacity),
    head: new Int32Array(capacity),
    held: new Int32Array(capacity),
    next: new Int32Array(count),
    stack: new Int32Array(MAX_TREE_DEPTH * 4 + 8),
  };
  return tree;
}

/**
 * The same pairwise repulsion as the exact loop, summed with a quadtree:
 * near voters exactly, far groups as one body of their combined mass at their
 * centre of mass. O(n log n) instead of O(n²).
 */
function addTreeRepulsion(
  bodies: readonly Body[],
  forceX: Float64Array,
  forceY: Float64Array,
  repulsion: number,
  softening: number,
) {
  const count = bodies.length;
  const { left, top, half, mass, sumX, sumY, child, head, held, next, stack } = treeFor(count);
  const capacity = left.length;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const body of bodies) {
    if (body.x < minX) minX = body.x;
    if (body.y < minY) minY = body.y;
    if (body.x > maxX) maxX = body.x;
    if (body.y > maxY) maxY = body.y;
  }
  let used = 1;
  const reset = (node: number) => {
    mass[node] = 0;
    sumX[node] = 0;
    sumY[node] = 0;
    child[node] = -1;
    head[node] = -1;
    held[node] = 0;
  };
  reset(0);
  left[0] = minX;
  top[0] = minY;
  half[0] = Math.max(maxX - minX, maxY - minY, 1e-3) / 2 + 1e-3;

  const quadrant = (node: number, x: number, y: number) =>
    child[node]! + (x >= left[node]! + half[node]! ? 1 : 0) + (y >= top[node]! + half[node]! ? 2 : 0);

  const insert = (body: number, start: number, startDepth: number) => {
    const { x, y } = bodies[body]!;
    let node = start;
    let depth = startDepth;
    for (;;) {
      mass[node]! += 1;
      sumX[node]! += x;
      sumY[node]! += y;
      if (child[node]! >= 0) {
        node = quadrant(node, x, y);
        depth += 1;
        continue;
      }
      if (held[node]! < LEAF_SIZE || depth >= MAX_TREE_DEPTH || used + 4 > capacity) {
        next[body] = head[node]!;
        head[node] = body;
        held[node]! += 1;
        return;
      }
      // Split the full leaf and push its residents one level down.
      const resident = head[node]!;
      head[node] = -1;
      held[node] = 0;
      child[node] = used;
      const quarter = half[node]! / 2;
      for (let index = 0; index < 4; index += 1) {
        reset(used + index);
        left[used + index] = left[node]! + (index & 1 ? half[node]! : 0);
        top[used + index] = top[node]! + (index & 2 ? half[node]! : 0);
        half[used + index] = quarter;
      }
      used += 4;
      for (let moving = resident; moving >= 0; ) {
        const following = next[moving]!;
        insert(moving, quadrant(node, bodies[moving]!.x, bodies[moving]!.y), depth + 1);
        moving = following;
      }
      node = quadrant(node, x, y);
      depth += 1;
    }
  };
  for (let body = 0; body < count; body += 1) insert(body, 0, 0);

  const opening = OPENING * OPENING;
  for (let index = 0; index < count; index += 1) {
    const { x, y } = bodies[index]!;
    let fx = 0;
    let fy = 0;
    let size = 0;
    stack[size++] = 0;
    while (size > 0) {
      const node = stack[--size]!;
      const weight = mass[node]!;
      if (weight === 0) continue;
      if (child[node]! < 0) {
        for (let other = head[node]!; other >= 0; other = next[other]!) {
          if (other === index) continue;
          const dx = x - bodies[other]!.x;
          const dy = y - bodies[other]!.y;
          const push = repulsion / (dx * dx + dy * dy + softening);
          fx += dx * push;
          fy += dy * push;
        }
        continue;
      }
      const dx = x - sumX[node]! / weight;
      const dy = y - sumY[node]! / weight;
      const squared = dx * dx + dy * dy;
      const width = half[node]! * 2;
      if (width * width < opening * squared) {
        const push = (weight * repulsion) / (squared + softening);
        fx += dx * push;
        fy += dy * push;
      } else {
        const first = child[node]!;
        stack[size++] = first;
        stack[size++] = first + 1;
        stack[size++] = first + 2;
        stack[size++] = first + 3;
      }
    }
    forceX[index]! += fx;
    forceY[index]! += fy;
  }
}

/**
 * One relaxation step; `delta` in seconds. Exact O(n²) repulsion by default;
 * `approximate` sums it with a Barnes–Hut quadtree instead, for large n.
 */
export function relaxBodies(
  bodies: Body[],
  ties: readonly CoevolvingTie[],
  frame: Frame,
  delta: number,
  approximate = false,
) {
  const count = bodies.length;
  const length = idealLength(frame, count);
  const forceX = new Float64Array(count);
  const forceY = new Float64Array(count);
  const softening = (length * 0.25) ** 2;
  const repulsion = length * length * REPULSION;

  if (approximate) addTreeRepulsion(bodies, forceX, forceY, repulsion, softening);
  else for (let first = 0; first < count; first += 1) {
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

  for (const tie of ties) {
    const a = bodies[tie.a]!;
    const b = bodies[tie.b]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(1e-3, Math.hypot(dx, dy));
    const pull = ((distance - length * 0.62) / distance) * SPRING;
    forceX[tie.a]! += dx * pull;
    forceY[tie.a]! += dy * pull;
    forceX[tie.b]! -= dx * pull;
    forceY[tie.b]! -= dy * pull;
  }

  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  const short = Math.min(frame.width, frame.height);
  const gravityX = GRAVITY * (short / frame.width);
  const gravityY = GRAVITY * (short / frame.height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = length * 6;
  // Voters are held only at the screen's own edges.
  const margin = 0;

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
