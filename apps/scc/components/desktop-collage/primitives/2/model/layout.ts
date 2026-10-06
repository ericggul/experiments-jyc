import { effective, effectiveCross, type Partner, type Society } from './society.ts';

// Browser-side force layout for one window's society, in that window's page
// pixels. The force law, constants and integration are those of
// complex-systems/adaptive-coevolving-network/1-glsl (layout.ts,
// `relaxBodies`, exact all-pairs branch): springs along ties toward 0.62 of
// the ideal length, softened repulsion between every pair, aspect-scaled
// gravity, velocity integration damped by exp(−6·dt). Added here: people with
// ties into another window feel a pull toward the edge facing it. It never
// affects the model.
//
// Every force is weighted by the society's continuous quantities: a spring by
// its tie's effective strength, repulsion by both people's presence, the pull
// toward another window by the strength of the ties into it. Since those are
// integrated in time, no force ever switches on or off in one step.

const GRAVITY = 0.9;
const REPULSION = 0.4;
const SPRING = 2.2;
/** Pull toward the facing edge, relative to gravity. */
const REACH = 1.6;
/** Speed cap in ideal lengths per second (1-glsl: 6); low enough that nothing is flung. */
const MAX_SPEED = 1.5;

export function idealLength(width: number, height: number, count: number) {
  return Math.sqrt((width * height * 0.42) / Math.max(1, count));
}

const index = new Map<number, number>();
let forceX = new Float64Array(0);
let forceY = new Float64Array(0);
let reachX = new Float64Array(0);
let reachY = new Float64Array(0);
let reachW = new Float64Array(0);

/** One relaxation step of `delta` seconds; `toward(window)` is the unit direction to that window. */
export function relax(society: Society, width: number, height: number, partners: readonly Partner[], toward: (window: number) => { x: number; y: number } | undefined, delta = 1 / 30) {
  const people = [...society.people.values()];
  const count = people.length;
  if (!count) return;
  if (forceX.length < count) {
    const size = count * 2;
    forceX = new Float64Array(size); forceY = new Float64Array(size);
    reachX = new Float64Array(size); reachY = new Float64Array(size); reachW = new Float64Array(size);
  }
  forceX.fill(0, 0, count); forceY.fill(0, 0, count);
  reachX.fill(0, 0, count); reachY.fill(0, 0, count); reachW.fill(0, 0, count);
  index.clear();
  people.forEach((p, i) => index.set(p.id, i));
  // The ideal length follows how many people are present, continuously.
  let present = 0;
  for (const p of people) present += p.presence;
  const length = idealLength(width, height, present);
  const softening = (length * 0.25) ** 2;
  const repulsion = length * length * REPULSION;

  for (let first = 0; first < count; first++) {
    const a = people[first];
    for (let second = first + 1; second < count; second++) {
      const b = people[second];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const push = (repulsion / (dx * dx + dy * dy + softening)) * a.presence * b.presence;
      forceX[first] += dx * push; forceY[first] += dy * push;
      forceX[second] -= dx * push; forceY[second] -= dy * push;
    }
  }
  for (const tie of society.ties.values()) {
    const weight = effective(society, tie);
    if (weight <= 0) continue;
    const i = index.get(tie.a)!;
    const j = index.get(tie.b)!;
    const dx = people[j].x - people[i].x;
    const dy = people[j].y - people[i].y;
    const distance = Math.max(1e-3, Math.hypot(dx, dy));
    const pull = ((distance - length * 0.62) / distance) * SPRING * weight;
    forceX[i] += dx * pull; forceY[i] += dy * pull;
    forceX[j] -= dx * pull; forceY[j] -= dy * pull;
  }
  for (const tie of society.cross.values()) {
    const direction = toward(tie.window);
    const i = index.get(tie.mine);
    if (!direction || i === undefined) continue;
    const weight = effectiveCross(society, tie, partners);
    reachX[i] += direction.x * weight; reachY[i] += direction.y * weight;
    reachW[i] = Math.max(reachW[i], weight);
  }

  const centreX = width / 2;
  const centreY = height / 2;
  const short = Math.min(width, height);
  const gravityX = GRAVITY * (short / width);
  const gravityY = GRAVITY * (short / height);
  const step = Math.min(delta, 1 / 30);
  const damping = Math.exp(-6 * step);
  const maxSpeed = length * MAX_SPEED;
  const margin = length * 0.5;

  for (let i = 0; i < count; i++) {
    const body = people[i];
    let fx = forceX[i] - (body.x - centreX) * gravityX;
    let fy = forceY[i] - (body.y - centreY) * gravityY;
    if (reachW[i] > 0) {
      const norm = Math.hypot(reachX[i], reachY[i]) || 1;
      const targetX = centreX + (reachX[i] / norm) * (width / 2 - margin);
      const targetY = centreY + (reachY[i] / norm) * (height / 2 - margin);
      fx += (targetX - body.x) * GRAVITY * REACH * reachW[i];
      fy += (targetY - body.y) * GRAVITY * REACH * reachW[i];
    }
    body.vx = (body.vx + fx * step) * damping;
    body.vy = (body.vy + fy * step) * damping;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > maxSpeed) { body.vx *= maxSpeed / speed; body.vy *= maxSpeed / speed; }
    // A soft wall: the margin pushes back instead of clamping position, so no one stops dead.
    body.x += body.vx * step;
    body.y += body.vy * step;
    const outX = body.x < margin ? margin - body.x : body.x > width - margin ? width - margin - body.x : 0;
    const outY = body.y < margin ? margin - body.y : body.y > height - margin ? height - margin - body.y : 0;
    body.vx += outX * 8 * step; body.vy += outY * 8 * step;
    body.x = Math.min(width, Math.max(0, body.x));
    body.y = Math.min(height, Math.max(0, body.y));
  }
}
