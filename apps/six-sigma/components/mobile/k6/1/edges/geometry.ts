import type { Edge, Vertex } from "../model/types";

export type LineStyle = "straight" | "cubic" | "cubic-directional";
type Point = Pick<Vertex, "x" | "y">;
type Cubic = { from: Point; control1: Point; control2: Point; to: Point };

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const point = (curve: Cubic, t: number): Point => {
  const a = lerp(curve.from, curve.control1, t);
  const b = lerp(curve.control1, curve.control2, t);
  const c = lerp(curve.control2, curve.to, t);
  return lerp(lerp(a, b, t), lerp(b, c, t), t);
};
const split = (curve: Cubic, t: number): [Cubic, Cubic] => {
  const a = lerp(curve.from, curve.control1, t);
  const b = lerp(curve.control1, curve.control2, t);
  const c = lerp(curve.control2, curve.to, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const f = lerp(d, e, t);
  return [{ from: curve.from, control1: a, control2: d, to: f }, { from: f, control1: e, control2: c, to: curve.to }];
};
const path = (curve: Cubic) => `M ${curve.from.x} ${curve.from.y} C ${curve.control1.x} ${curve.control1.y} ${curve.control2.x} ${curve.control2.y} ${curve.to.x} ${curve.to.y}`;

/** One restrained arc, with curvature reduced for the shortest nested edges. */
export function edgeCurve(edge: Edge, style: LineStyle): Cubic {
  const { from, to } = edge;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (style === "straight" || length < 1e-6) {
    return { from, control1: lerp(from, to, 1 / 3), control2: lerp(from, to, 2 / 3), to };
  }
  const bend = Math.min(16, length * 0.085);
  const normal = { x: -dy / length * bend, y: dx / length * bend };
  const first = lerp(from, to, 1 / 3);
  const second = lerp(from, to, 2 / 3);
  return {
    from,
    control1: { x: first.x + normal.x, y: first.y + normal.y },
    control2: { x: second.x + normal.x, y: second.y + normal.y },
    to,
  };
}

/**
 * Directional edges carry two lanes. Each lane bends to the right of its own
 * travel, so outgoing and returning curves mirror each other across the chord
 * and the whole graph keeps the symmetry of its vertex layout.
 */
export function laneCurves(edge: Edge): [Cubic, Cubic] {
  return [
    edgeCurve(edge, "cubic-directional"),
    edgeCurve({ id: edge.id, from: edge.to, to: edge.from }, "cubic-directional"),
  ];
}

const markPath = (curve: Cubic) => {
  const mark = directionMark(curve);
  return mark ? ` M ${mark.left.x} ${mark.left.y} L ${mark.tip.x} ${mark.tip.y} L ${mark.right.x} ${mark.right.y}` : "";
};

export function edgePath(edge: Edge, style: LineStyle) {
  if (style !== "cubic-directional") return path(edgeCurve(edge, style));
  return laneCurves(edge).map((curve) => path(curve) + markPath(curve)).join(" ");
}

/** Arrow at the lane's midpoint, so both lanes' marks mirror across the chord. */
function directionMark(curve: Cubic) {
  const distance = Math.hypot(curve.to.x - curve.from.x, curve.to.y - curve.from.y);
  if (distance < 1e-6) return null;
  const tip = point(curve, 0.52);
  const before = point(curve, 0.51);
  const dx = tip.x - before.x;
  const dy = tip.y - before.y;
  const tangentLength = Math.hypot(dx, dy);
  const size = Math.min(3, distance * 0.07);
  const tx = dx / tangentLength * size;
  const ty = dy / tangentLength * size;
  const wing = 0.48;
  return {
    tip,
    left: { x: tip.x - tx - ty * wing, y: tip.y - ty + tx * wing },
    right: { x: tip.x - tx + ty * wing, y: tip.y - ty - tx * wing },
  };
}

export function appendEdgeToPath(path2d: Path2D, edge: Edge, style: LineStyle) {
  if (style === "straight") {
    path2d.moveTo(edge.from.x, edge.from.y);
    path2d.lineTo(edge.to.x, edge.to.y);
    return;
  }
  for (const curve of style === "cubic-directional" ? laneCurves(edge) : [edgeCurve(edge, style)]) {
    path2d.moveTo(curve.from.x, curve.from.y);
    path2d.bezierCurveTo(curve.control1.x, curve.control1.y, curve.control2.x, curve.control2.y, curve.to.x, curve.to.y);
    const mark = style === "cubic-directional" ? directionMark(curve) : null;
    if (mark) {
      path2d.moveTo(mark.left.x, mark.left.y);
      path2d.lineTo(mark.tip.x, mark.tip.y);
      path2d.lineTo(mark.right.x, mark.right.y);
    }
  }
}

/** Arc-length table is created only for the at-most-48 active signals. */
export function travelingEdge(edge: Edge, style: LineStyle, reverse: boolean) {
  const original = edgeCurve(edge, style);
  // A directional return travels its own mirrored lane, not the outgoing curve backwards.
  const curve = style === "cubic-directional"
    ? laneCurves(edge)[reverse ? 1 : 0]
    : reverse
    ? { from: original.to, control1: original.control2, control2: original.control1, to: original.from }
    : original;
  const steps = style === "straight" ? 1 : 24;
  const distances = [0];
  let previous = curve.from;
  for (let index = 1; index <= steps; index++) {
    const next = point(curve, index / steps);
    distances.push(distances[index - 1]! + Math.hypot(next.x - previous.x, next.y - previous.y));
    previous = next;
  }
  const length = distances[steps]!;
  function parameterAt(distance: number) {
    if (length < 1e-6) return 0;
    const target = Math.min(length, Math.max(0, distance));
    let low = 0;
    let high = steps;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (distances[middle]! < target) low = middle + 1;
      else high = middle;
    }
    const index = Math.max(1, low);
    const span = distances[index]! - distances[index - 1]!;
    return (index - 1 + (span ? (target - distances[index - 1]!) / span : 0)) / steps;
  }
  return {
    length,
    pointAt: (distance: number) => point(curve, parameterAt(distance)),
    segment: (start: number, end: number) => {
      const fromT = parameterAt(start);
      const toT = parameterAt(end);
      if (toT <= fromT) return "";
      const first = split(curve, toT)[0];
      return path(split(first, fromT / toT)[1]);
    },
  };
}
