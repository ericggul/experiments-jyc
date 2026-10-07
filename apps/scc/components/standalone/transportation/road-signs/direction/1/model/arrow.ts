/**
 * The 305–307 instruction-sign arrow, generalised to any exit heading.
 *
 * Units are those of the archive SVGs: a 1000-unit sign face centred on
 * (CENTER, CENTER). 305 (straight), 306 (right) and 307 (left) share one
 * construction: a vertical stem from below, a bend of centreline radius 195,
 * a short straight run and the 305 arrowhead. Here the bend angle is
 * continuous, so 0° reproduces 305, +90° 306, −90° 307 and ±180° a U-turn.
 */

export const CENTER = 500;
/** Shaft width; 305 uses 133, 306/307 use 130. */
const SHAFT = 132;
/** Centreline bend radius of 306/307 (outer 260, inner 130). */
const RADIUS = 195;
/** Stem before the bend in 306/307, and the straight run after it. */
const STEM = 213;
const RUN = 70;
/** 305's shaft length from stem foot to arrowhead base. */
const STRAIGHT = 580;
/** Extra stem for bends beyond 90°, so the foot stays the lowest point. */
const BACKTURN_STEM = 160;
/** Largest distance from the face centre the arrow may reach (305 fits at scale 1). */
const REACH = 408;

/** 305's arrowhead, half profile, tip at origin pointing −y; x is lateral. */
const HEAD_LENGTH = 220.48;
const HEAD_HALF = [
  // [kind, ...points] in (lateral, back) coordinates
  ["L", -153.06, 196.22],
  ["C", -156.05, 200.61, -157.46, 205.56, -157.5, 210.5],
  ["C", -157.54, 218.74, -153.65, 226.9, -146.34, 231.87],
  ["C", -138.54, 237.17, -130.42, 236.23, -120.78, 233.78],
  ["L", -66.5, 220.48],
] as const;

type Point = { x: number; y: number };

const unit = (angle: number): Point => ({ x: Math.sin(angle), y: -Math.cos(angle) });
const right = (angle: number): Point => ({ x: Math.cos(angle), y: Math.sin(angle) });
const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });

export type ArrowShape = {
  /** Shaft centreline, drawn as a butt-capped stroke of `width`. */
  shaft: string;
  /** Filled arrowhead outline. */
  head: string;
  width: number;
};

/**
 * `turn` is the exit heading in radians, clockwise from straight ahead,
 * in (−π, π]. The result is centred on the face and scaled to fit it.
 */
export function arrowFor(turn: number): ArrowShape {
  const bend = Math.abs(turn);
  const side = Math.sign(turn);
  const arc = RADIUS * bend;
  const stem = Math.max(STEM, STRAIGHT - RUN - arc) + BACKTURN_STEM * Math.max(0, bend - Math.PI / 2) / (Math.PI / 2);

  // Raw centreline from the stem foot at the origin.
  const foot: Point = { x: 0, y: 0 };
  const bendStart = add(foot, unit(0), stem);
  const pivot = add(bendStart, right(0), side * RADIUS);
  const bendEnd = side === 0 ? bendStart : add(pivot, right(turn), -side * RADIUS);
  const base = add(bendEnd, unit(turn), RUN + (side === 0 ? STRAIGHT - RUN - stem : 0));
  const tip = add(base, unit(turn), HEAD_LENGTH);

  // Head outline points, both halves, in raw coordinates.
  const forward = unit(turn);
  const lateral = right(turn);
  const local = (v: number, back: number) => add(add(tip, lateral, v), forward, -back);
  const headPoints: Point[][] = HEAD_HALF.map(([, ...xy]) => {
    const points: Point[] = [];
    for (let i = 0; i < xy.length; i += 2) points.push(local(xy[i], xy[i + 1]));
    return points;
  });
  const mirrored: Point[][] = HEAD_HALF.map(([, ...xy]) => {
    const points: Point[] = [];
    for (let i = 0; i < xy.length; i += 2) points.push(local(-xy[i], xy[i + 1]));
    return points;
  });

  // Outline samples for fitting: shaft edges plus the head.
  const samples: Point[] = [tip];
  const half = SHAFT / 2;
  const edge = (p: Point, heading: number) => {
    samples.push(add(p, right(heading), half), add(p, right(heading), -half));
  };
  edge(foot, 0);
  edge(bendStart, 0);
  const steps = Math.ceil(bend / (Math.PI / 24));
  for (let i = 1; i <= steps; i += 1) {
    const heading = (turn * i) / steps;
    edge(add(pivot, right(heading), -side * RADIUS), heading);
  }
  for (const segment of [...headPoints, ...mirrored]) samples.push(...segment);

  const xs = samples.map((p) => p.x);
  const ys = samples.map((p) => p.y);
  const mid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const reach = Math.max(...samples.map((p) => Math.hypot(p.x - mid.x, p.y - mid.y)));
  const scale = Math.min(1, REACH / reach);
  const place = (p: Point) => `${(CENTER + (p.x - mid.x) * scale).toFixed(2)} ${(CENTER + (p.y - mid.y) * scale).toFixed(2)}`;

  // The shaft runs into the head so the joint never shows an antialiasing seam.
  const shaftEnd = add(base, forward, 12);
  const r = (RADIUS * scale).toFixed(2);
  const shaft = side === 0
    ? `M${place(foot)}L${place(shaftEnd)}`
    : `M${place(foot)}L${place(bendStart)}A${r} ${r} 0 0 ${side > 0 ? 1 : 0} ${place(bendEnd)}L${place(shaftEnd)}`;

  const segment = (kind: string, points: Point[]) => `${kind}${points.map(place).join(" ")}`;
  const leftSide = HEAD_HALF.map(([kind], i) => segment(kind, headPoints[i]));
  // Mirror half, walked back from the shaft to the tip: reverse segment order and control points.
  const ends = [tip, ...mirrored.map((points) => points[points.length - 1])];
  const rightSide = HEAD_HALF.map(([kind], i) => {
    const j = HEAD_HALF.length - 1 - i;
    const controls = mirrored[j].slice(0, -1).reverse();
    return segment(kind, [...controls, ends[j]]);
  });
  const head = `M${place(tip)}${leftSide.join("")}L${place(mirrored[mirrored.length - 1][mirrored[mirrored.length - 1].length - 1])}${rightSide.join("")}Z`;

  return { shaft, head, width: SHAFT * scale };
}
