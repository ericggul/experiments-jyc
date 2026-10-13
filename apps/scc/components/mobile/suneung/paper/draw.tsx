import type { CSSProperties, ReactNode } from "react";
import styles from "./draw.module.css";
import paper from "./paper.module.css";
import type { PaperFont } from "./types";

// DOM drawing primitives for diagrams on the sheet. Coordinates are sheet
// points inside the figure box; strokes are divs, areas are clip-path polygons.

export type Point = readonly [x: number, y: number];

type Stroke = { width?: number; dash?: "dashed" | "dotted"; color?: string };

export function Segment({ from, to, width = 0.6, dash, color }: { from: Point; to: Point } & Stroke) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <div
      className={styles.segment}
      style={{
        left: from[0],
        top: from[1] - width / 2,
        width: length,
        borderTopWidth: width,
        borderTopStyle: dash,
        borderTopColor: color,
        transform: `rotate(${angle}rad)`,
      }}
    />
  );
}

/** Points joined by straight segments; pass dense samples for curves. */
export function Polyline({ points, ...stroke }: { points: readonly Point[] } & Stroke) {
  return (
    <>
      {points.slice(1).map((to, index) => (
        <Segment key={`${points[index][0]},${points[index][1]}`} from={points[index]} to={to} {...stroke} />
      ))}
    </>
  );
}

/** Samples y = f(x) from x0 to x1 into a polyline, mapped by `toSheet`. */
export function sample(f: (x: number) => number, x0: number, x1: number, steps: number, toSheet: (x: number, y: number) => Point) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / steps;
    return toSheet(x, f(x));
  });
}

export function Ellipse({
  cx,
  cy,
  rx,
  ry,
  width = 0.6,
  dash,
  fill,
  style,
}: { cx: number; cy: number; rx: number; ry: number; fill?: string; style?: CSSProperties } & Stroke) {
  return (
    <div
      className={styles.ellipse}
      style={{
        left: cx - rx - width / 2,
        top: cy - ry - width / 2,
        width: 2 * rx + width,
        height: 2 * ry + width,
        borderWidth: width,
        borderStyle: dash ?? "solid",
        background: fill,
        ...style,
      }}
    />
  );
}

/** A filled polygon (shading, translucent faces). */
export function Area({ points, fill }: { points: readonly Point[]; fill: string }) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const polygon = points.map(([x, y]) => `${x - left}px ${y - top}px`).join(", ");
  return (
    <div
      className={styles.area}
      style={{ left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top, background: fill, clipPath: `polygon(${polygon})` }}
    />
  );
}

const fontClass: Partial<Record<PaperFont, string>> = { m: paper.m, mb: paper.mb, g: paper.g, gb: paper.gb, e: paper.e, ei: paper.ei };

/** Text whose baseline-left sits at (x, y). */
export function Label({ x, y, size, font = "e", children }: { x: number; y: number; size: number; font?: PaperFont; children: ReactNode }) {
  return (
    <span className={`${styles.label} ${fontClass[font]}`} style={{ left: x, top: y, fontSize: size }}>
      <span style={{ position: "relative", top: "-0.33em" }}>{children}</span>
    </span>
  );
}
