/**
 * Edge fractal: a glyph is a set of traces, and every edge of a trace is itself the glyph, laid along
 * that edge from its anchor `a` to its anchor `b`. Repeating this, the whole glyph is traced by
 * glyphs, which are traced by smaller glyphs. Only the finest level is drawn.
 */
import type { Glyph } from "./glyphs";

type Point = readonly [number, number];
/** An edge from (ax, ay) to (bx, by). */
export type Edge = { ax: number; ay: number; bx: number; by: number };

export const FILL = 0.92;
export const MAX_GLYPHS = 30000;
/** The finest glyphs keep at least this anchor span in CSS px. */
export const MIN_SPAN_PX = 5;

/** Similarity taking the glyph's a → b onto the edge, as a DOMMatrix-style [a, b, c, d, e, f]. */
export function edgeMatrix(glyph: Glyph, { ax, ay, bx, by }: Edge) {
  const [gax, gay] = glyph.a;
  const gx = glyph.b[0] - gax;
  const gy = glyph.b[1] - gay;
  const ex = bx - ax;
  const ey = by - ay;
  const norm = gx * gx + gy * gy;
  // Complex quotient (edge / glyph span): rotation and scale.
  const cos = (ex * gx + ey * gy) / norm;
  const sin = (ey * gx - ex * gy) / norm;
  return [cos, sin, -sin, cos, ax - cos * gax + sin * gay, ay - sin * gax - cos * gay] as const;
}

function apply(matrix: ReturnType<typeof edgeMatrix>, [x, y]: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

function children(glyph: Glyph, edge: Edge): Edge[] {
  const matrix = edgeMatrix(glyph, edge);
  const edges: Edge[] = [];
  for (const trace of glyph.traces) {
    for (let index = 0; index + 1 < trace.length; index += 1) {
      const [ax, ay] = apply(matrix, trace[index]!);
      const [bx, by] = apply(matrix, trace[index + 1]!);
      edges.push({ ax, ay, bx, by });
    }
  }
  return edges;
}

/**
 * The finest edges, upright and centred in the width × height area starting at `top`. The root edge is
 * the glyph's own a → b in its 24-unit box, so the first level is the glyph as drawn. Levels are added
 * whole while their glyphs keep MIN_SPAN_PX and the count stays within MAX_GLYPHS.
 */
export function layoutEdges(glyph: Glyph, width: number, height: number, top = 0) {
  const span = Math.hypot(glyph.b[0] - glyph.a[0], glyph.b[1] - glyph.a[1]);
  const perEdge = children(glyph, { ax: glyph.a[0], ay: glyph.a[1], bx: glyph.b[0], by: glyph.b[1] });
  const ratio = perEdge.reduce((sum, { ax, ay, bx, by }) => sum + Math.hypot(bx - ax, by - ay), 0) / perEdge.length / span;
  // Glyphs on the first level reach about half a box beyond the traces; deeper levels stay inside that.
  const margin = 12 * ratio;
  const xs = perEdge.flatMap(({ ax, bx }) => [ax, bx]);
  const ys = perEdge.flatMap(({ ay, by }) => [ay, by]);
  const x0 = Math.min(...xs) - margin;
  const x1 = Math.max(...xs) + margin;
  const y0 = Math.min(...ys) - margin;
  const y1 = Math.max(...ys) + margin;
  const scale = FILL * Math.min(width / (x1 - x0), height / (y1 - y0));
  const offsetX = width / 2 - ((x0 + x1) / 2) * scale;
  const offsetY = top + height / 2 - ((y0 + y1) / 2) * scale;

  let edges: Edge[] = [{ ax: offsetX + glyph.a[0] * scale, ay: offsetY + glyph.a[1] * scale, bx: offsetX + glyph.b[0] * scale, by: offsetY + glyph.b[1] * scale }];
  let childSpan = span * scale * ratio;
  while (childSpan >= MIN_SPAN_PX && edges.length * perEdge.length <= MAX_GLYPHS) {
    edges = edges.flatMap((edge) => children(glyph, edge));
    childSpan *= ratio;
  }
  return { edges, unit: (childSpan / ratio / span) };
}
