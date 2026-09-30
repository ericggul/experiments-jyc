import { tokens } from "../style/tokens.ts";
import { allLinks, nodes, type NodeId } from "../model/configurations.ts";

type Point = { x: number; y: number };
export type Cubic = [Point, Point, Point, Point];

const CENTRE = { x: 200, y: 200 };
const place = new Map(nodes.map((node) => [node.id, node]));
const reciprocal = new Set(allLinks.filter(({ from, to }) => allLinks.some((other) => other.from === to && other.to === from)).map(({ id }) => id));

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const pointAt = ([a, b, c, d]: Cubic, t: number) => lerp(lerp(lerp(a, b, t), lerp(b, c, t), t), lerp(lerp(b, c, t), lerp(c, d, t), t), t);

/**
 * Which side a link bends to, as a unit normal. A reciprocal pair bends to the
 * right of its own travel, so the two lanes mirror each other across the
 * chord. A single link bows away from the centre; a link on a line through the
 * centre bows towards the vertical axis. Every rule commutes with the layout's
 * horizontal and vertical mirrors, so the drawing keeps them.
 */
function bendSide(id: string, from: Point, to: Point, ux: number, uy: number) {
  const right = { x: -uy, y: ux };
  if (reciprocal.has(id)) return right;
  const mid = lerp(from, to, 0.5);
  const outward = right.x * (mid.x - CENTRE.x) + right.y * (mid.y - CENTRE.y);
  if (Math.abs(outward) > 1e-6) return outward > 0 ? right : { x: -right.x, y: -right.y };
  const towardAxis = right.x * (CENTRE.x - mid.x);
  if (Math.abs(towardAxis) > 1e-6) return towardAxis > 0 ? right : { x: -right.x, y: -right.y };
  return right;
}

const cache = new Map<string, { curve: Cubic; normal: Point }>();

export function linkCurve(id: string, fromId: NodeId, toId: NodeId) {
  const cached = cache.get(id);
  if (cached) return cached;
  const from = place.get(fromId)!;
  const to = place.get(toId)!;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  const normal = bendSide(id, from, to, ux, uy);
  const bend = Math.min(tokens.link.maxBend, length * tokens.link.bendRatio);
  const control = (t: number) => ({ x: from.x + (to.x - from.x) * t + normal.x * bend, y: from.y + (to.y - from.y) * t + normal.y * bend });
  const c1 = control(1 / 3);
  const c2 = control(2 / 3);
  const trim = tokens.node.radius + tokens.link.clearance;
  const toward = (origin: Point, target: Point) => {
    const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
    return { x: origin.x + (target.x - origin.x) / distance * trim, y: origin.y + (target.y - origin.y) / distance * trim };
  };
  const result = { curve: [toward(from, c1), c1, c2, toward(to, c2)] as Cubic, normal };
  cache.set(id, result);
  return result;
}

const f = (value: number) => value.toFixed(2);

export function linkPath(id: string, from: NodeId, to: NodeId) {
  const [a, b, c, d] = linkCurve(id, from, to).curve;
  return `M ${f(a.x)} ${f(a.y)} C ${f(b.x)} ${f(b.y)} ${f(c.x)} ${f(c.y)} ${f(d.x)} ${f(d.y)}`;
}

/** Midpoint chevron, so a reciprocal pair's marks mirror across the chord too. */
export function arrowPath(id: string, from: NodeId, to: NodeId) {
  const { curve } = linkCurve(id, from, to);
  const tip = pointAt(curve, 0.53);
  const before = pointAt(curve, 0.5);
  const length = Math.hypot(tip.x - before.x, tip.y - before.y);
  const tx = (tip.x - before.x) / length * tokens.link.arrow;
  const ty = (tip.y - before.y) / length * tokens.link.arrow;
  const wing = 0.55;
  return `M ${f(tip.x - tx - ty * wing)} ${f(tip.y - ty + tx * wing)} L ${f(tip.x)} ${f(tip.y)} L ${f(tip.x - tx + ty * wing)} ${f(tip.y - ty - tx * wing)}`;
}

/** Weight labels sit on the outer side of their own curve, as in the figure. */
export function labelPoint(id: string, from: NodeId, to: NodeId) {
  const { curve, normal } = linkCurve(id, from, to);
  const middle = pointAt(curve, 0.5);
  // Labels are wider than tall, so sideways offsets clear half a label's width.
  const offset = tokens.link.labelOffset + Math.abs(normal.x) * tokens.link.labelWidth / 2;
  return { x: middle.x + normal.x * offset, y: middle.y + normal.y * offset };
}
