/**
 * Three-way instruction arrow: 305 straight, with 306 and 307 branching off
 * the same stem at a shared turn angle. Units follow the archive SVGs: a
 * 1000-unit face centred on (CENTER, CENTER). Standalone copy of the
 * direction/1 construction so the two trials stay independent.
 */

export const CENTER = 500;
const SHAFT = 132;
const RADIUS = 195;
const STEM = 213;
const RUN = 70;
const STRAIGHT = 580;
const REACH = 408;

const HEAD_LENGTH = 220.48;
/** 305's arrowhead, half profile in (lateral, back) units, tip at origin. */
const HEAD_HALF = [
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

type Branch = { shaft: Point[]; arc?: { pivot: Point; side: number }; base: Point; heading: number };

/** The arrowhead outline, as point lists per segment, both halves. */
function headOutline(base: Point, heading: number) {
  const forward = unit(heading);
  const lateral = right(heading);
  const tip = add(base, forward, HEAD_LENGTH);
  const local = (v: number, back: number) => add(add(tip, lateral, v), forward, -back);
  const half = (sign: number) => HEAD_HALF.map(([, ...xy]) => {
    const points: Point[] = [];
    for (let i = 0; i < xy.length; i += 2) points.push(local(sign * xy[i], xy[i + 1]));
    return points;
  });
  return { tip, left: half(1), right: half(-1) };
}

export type ForkShape = {
  /** Three shafts as one path, drawn as a butt-capped stroke of `width`. */
  shafts: string;
  /** Three filled arrowheads as one path. */
  heads: string;
  width: number;
};

/** `turn` is the left/right turn angle in radians, (0, π). */
export function forkFor(turn: number): ForkShape {
  const foot: Point = { x: 0, y: 0 };
  const bendStart = add(foot, unit(0), STEM);
  const branches: Branch[] = [{ shaft: [foot, bendStart], base: add(foot, unit(0), STRAIGHT), heading: 0 }];
  for (const side of [-1, 1]) {
    const heading = side * turn;
    const pivot = add(bendStart, right(0), side * RADIUS);
    const bendEnd = add(pivot, right(heading), -side * RADIUS);
    branches.push({ shaft: [bendStart, bendEnd], arc: { pivot, side }, base: add(bendEnd, unit(heading), RUN), heading });
  }

  const samples: Point[] = [];
  const edge = (p: Point, heading: number) => {
    samples.push(add(p, right(heading), SHAFT / 2), add(p, right(heading), -SHAFT / 2));
  };
  edge(foot, 0);
  edge(bendStart, 0);
  const heads = branches.map((branch) => headOutline(branch.base, branch.heading));
  for (const branch of branches) {
    if (!branch.arc) continue;
    const { pivot, side } = branch.arc;
    const steps = Math.ceil(turn / (Math.PI / 24));
    for (let i = 1; i <= steps; i += 1) {
      const heading = (side * turn * i) / steps;
      edge(add(pivot, right(heading), -side * RADIUS), heading);
    }
  }
  for (const head of heads) {
    samples.push(head.tip);
    for (const segment of [...head.left, ...head.right]) samples.push(...segment);
  }

  const xs = samples.map((p) => p.x);
  const ys = samples.map((p) => p.y);
  const mid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  const reach = Math.max(...samples.map((p) => Math.hypot(p.x - mid.x, p.y - mid.y)));
  const scale = Math.min(1, REACH / reach);
  const place = (p: Point) => `${(CENTER + (p.x - mid.x) * scale).toFixed(2)} ${(CENTER + (p.y - mid.y) * scale).toFixed(2)}`;
  const r = (RADIUS * scale).toFixed(2);

  // Shafts run into their heads so the joints never show an antialiasing seam.
  const shafts = branches.map((branch) => {
    const end = add(branch.base, unit(branch.heading), 12);
    if (!branch.arc) return `M${place(branch.shaft[0])}L${place(end)}`;
    const [start, bendEnd] = branch.shaft;
    return `M${place(start)}A${r} ${r} 0 0 ${branch.arc.side > 0 ? 1 : 0} ${place(bendEnd)}L${place(end)}`;
  }).join("");

  const segment = (kind: string, points: Point[]) => `${kind}${points.map(place).join(" ")}`;
  const headPaths = heads.map(({ tip, left, right: mirrored }) => {
    const leftSide = HEAD_HALF.map(([kind], i) => segment(kind, left[i]));
    const ends = [tip, ...mirrored.map((points) => points[points.length - 1])];
    const rightSide = HEAD_HALF.map(([kind], i) => {
      const j = HEAD_HALF.length - 1 - i;
      return segment(kind, [...mirrored[j].slice(0, -1).reverse(), ends[j]]);
    });
    const attach = mirrored[mirrored.length - 1];
    return `M${place(tip)}${leftSide.join("")}L${place(attach[attach.length - 1])}${rightSide.join("")}Z`;
  }).join("");

  return { shafts, heads: headPaths, width: SHAFT * scale };
}
