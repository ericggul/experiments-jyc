import { tokens } from "../style/tokens.ts";

export type Point = { x: number; y: number };
export type Cubic = [Point, Point, Point, Point];

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const pointAt = ([a, b, c, d]: Cubic, t: number) => lerp(lerp(lerp(a, b, t), lerp(b, c, t), t), lerp(lerp(b, c, t), lerp(c, d, t), t), t);

/**
 * Which side a link bends to, as a unit normal. A reciprocal pair bends to the
 * right of its own travel, so the two lanes mirror each other across the
 * chord. A single link bows away from the centre; a link on a line through the
 * centre bows towards the vertical axis. Every rule commutes with mirrors
 * through the centre, so a symmetric layout stays symmetric.
 */
function bendSide(from: Point, to: Point, reciprocal: boolean, centre: Point) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const right = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
  if (reciprocal) return right;
  const mid = lerp(from, to, 0.5);
  const flip = { x: -right.x, y: -right.y };
  const outward = right.x * (mid.x - centre.x) + right.y * (mid.y - centre.y);
  if (Math.abs(outward) > 1e-6) return outward > 0 ? right : flip;
  const towardAxis = right.x * (centre.x - mid.x);
  if (Math.abs(towardAxis) > 1e-6) return towardAxis > 0 ? right : flip;
  return right;
}

type Options = { reciprocal: boolean; centre: Point; fromRadius: number; toRadius: number };

/** A cubic between two node rings, trimmed by the same clearance at both ends. */
export function curveBetween(from: Point, to: Point, { reciprocal, centre, fromRadius, toRadius }: Options) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = bendSide(from, to, reciprocal, centre);
  const bend = Math.min(tokens.link.maxBend, length * tokens.link.bendRatio);
  const control = (t: number) => ({ x: from.x + (to.x - from.x) * t + normal.x * bend, y: from.y + (to.y - from.y) * t + normal.y * bend });
  const c1 = control(1 / 3);
  const c2 = control(2 / 3);
  const toward = (origin: Point, target: Point, trim: number) => {
    const distance = Math.hypot(target.x - origin.x, target.y - origin.y) || 1;
    return { x: origin.x + (target.x - origin.x) / distance * trim, y: origin.y + (target.y - origin.y) / distance * trim };
  };
  const curve: Cubic = [
    toward(from, c1, fromRadius + tokens.link.clearance), c1, c2, toward(to, c2, toRadius + tokens.link.clearance),
  ];
  return { curve, normal };
}

const f = (value: number) => value.toFixed(2);

export const cubicPath = ([a, b, c, d]: Cubic) => `M ${f(a.x)} ${f(a.y)} C ${f(b.x)} ${f(b.y)} ${f(c.x)} ${f(c.y)} ${f(d.x)} ${f(d.y)}`;

/** Midpoint chevron, so a reciprocal pair's marks mirror across the chord too. */
export function chevronPath(curve: Cubic, size: number = tokens.link.arrow) {
  const tip = pointAt(curve, 0.53);
  const before = pointAt(curve, 0.5);
  const length = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const tx = (tip.x - before.x) / length * size;
  const ty = (tip.y - before.y) / length * size;
  const wing = 0.55;
  return `M ${f(tip.x - tx - ty * wing)} ${f(tip.y - ty + tx * wing)} L ${f(tip.x)} ${f(tip.y)} L ${f(tip.x - tx + ty * wing)} ${f(tip.y - ty - tx * wing)}`;
}
