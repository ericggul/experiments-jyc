/**
 * One connected arrow that branches without end inside one instruction sign.
 * A stem splits into 305 straight and 306/307 turns at a shared angle; each
 * branch, at its end, splits again into straight, left and right, smaller by
 * the length and width ratios, with no head or gap between. Branches taper from their parent's
 * width to their own, so every split flows like 310's. Only the last level
 * carries the 305 arrowhead.
 *
 * Units follow the archive SVGs (1000-unit face centred on CENTER). The
 * stem, bend radius, shaft and head come from direction/1's construction,
 * copied here so the trials stay independent.
 */

export const CENTER = 500;
const SHAFT = 132;
const STEM = 213;
const RADIUS = 195;
/** Straight run after a bend, and a straight branch's length, at scale 1. */
const RUN = 120;
const STRAIGHT = RADIUS + RUN;
/** Each split's branches are this much shorter, and end this much narrower, than their parent. */
export const LENGTH_RATIO = 0.5;
export const WIDTH_RATIO = 0.5;
const HEAD_LENGTH = 220.48;
const HEAD_HALF_WIDTH = 157.5;
/** Furthest the arrow may reach from the face centre (field radius 470). */
const REACH = 440;
/** 3280 branches; building the outline path costs about a microsecond per point in Chrome. */
export const MAX_LEVELS = 7;
/** Bends are sampled at this angular step at most, and at least this many units apart. */
const BEND_STEP = Math.PI / 36;

/** 305's head, half profile in (lateral, back) units from the tip, for a 132 shaft. */
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

/** Every branch, parents first; the stem is branch 0. Units are face units after fitting. */
export type Arrow = {
  count: number;
  x: Float64Array;
  y: Float64Array;
  /** Heading at the start, clockwise from up. */
  heading: Float64Array;
  /** −1 left, 0 straight, 1 right. */
  side: Int8Array;
  /** Length scale: bend radius and runs. */
  scale: Float64Array;
  /** Shaft width at the start and at the end. */
  from: Float64Array;
  to: Float64Array;
  level: Uint8Array;
  endX: Float64Array;
  endY: Float64Array;
  endHeading: Float64Array;
  /** Distance along the arrow from the stem foot to the branch's start, and its centreline length. */
  start: Float64Array;
  length: Float64Array;
  levels: number;
  /** Longest foot-to-tip distance: growth reaches every tip at this value. */
  reach: number;
};

export function createArrow(levels = MAX_LEVELS): Arrow {
  const capacity = (3 ** (levels + 1) - 1) / 2;
  return {
    count: 0,
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    heading: new Float64Array(capacity),
    side: new Int8Array(capacity),
    scale: new Float64Array(capacity),
    from: new Float64Array(capacity),
    to: new Float64Array(capacity),
    level: new Uint8Array(capacity),
    endX: new Float64Array(capacity),
    endY: new Float64Array(capacity),
    endHeading: new Float64Array(capacity),
    start: new Float64Array(capacity),
    length: new Float64Array(capacity),
    levels: 0,
    reach: 0,
  };
}

function endOf(start: Point, heading: number, side: number, length: number, scale: number, turn: number) {
  if (side === 0) return { end: add(start, unit(heading), length * scale), heading };
  const pivot = add(start, right(heading), side * RADIUS * scale);
  const endHeading = heading + side * turn;
  const bendEnd = add(pivot, right(endHeading), -side * RADIUS * scale);
  return { end: add(bendEnd, unit(endHeading), RUN * scale), heading: endHeading };
}

/**
 * Builds `levels` splits below the stem at turn angle `turn` (radians), then
 * centres the arrow on its bounding box and scales it into the field.
 * The ratios set each split's length scale and end width against its parent.
 */
export function layoutArrow(
  arrow: Arrow, turn: number, levels: number,
  lengthRatio = LENGTH_RATIO, widthRatio = WIDTH_RATIO,
) {
  const depth = Math.max(0, Math.min(levels, MAX_LEVELS));
  arrow.count = 0;
  arrow.levels = depth;

  const push = (start: Point, heading: number, side: number, scale: number, from: number, to: number, level: number) => {
    const i = arrow.count;
    const { end, heading: endHeading } = endOf(start, heading, side, level === 0 ? STEM : STRAIGHT, scale, turn);
    arrow.x[i] = start.x;
    arrow.y[i] = start.y;
    arrow.heading[i] = heading;
    arrow.side[i] = side;
    arrow.scale[i] = scale;
    arrow.from[i] = from;
    arrow.to[i] = to;
    arrow.level[i] = level;
    arrow.endX[i] = end.x;
    arrow.endY[i] = end.y;
    arrow.endHeading[i] = endHeading;
    arrow.count += 1;
  };

  push({ x: 0, y: 0 }, 0, 0, 1, SHAFT, SHAFT, 0);
  let start = 0;
  for (let level = 1; level <= depth; level += 1) {
    const end = arrow.count;
    for (let parent = start; parent < end; parent += 1) {
      // The first split keeps the stem's length scale, as on 310; later ones shrink.
      const scale = level === 1 ? 1 : arrow.scale[parent] * lengthRatio;
      const from = arrow.to[parent];
      const point = { x: arrow.endX[parent], y: arrow.endY[parent] };
      for (const side of [0, -1, 1]) push(point, arrow.endHeading[parent], side, scale, from, from * widthRatio, level);
    }
    start = end;
  }

  // Fit: every start and end with a width margin, and the heads at the leaves.
  const points: number[] = [];
  for (let i = 0; i < arrow.count; i += 1) {
    points.push(arrow.x[i], arrow.y[i], arrow.from[i] / 2);
    if (arrow.level[i] === depth) {
      const head = arrow.to[i] / SHAFT;
      const tip = add({ x: arrow.endX[i], y: arrow.endY[i] }, unit(arrow.endHeading[i]), HEAD_LENGTH * head);
      points.push(tip.x, tip.y, HEAD_HALF_WIDTH * head);
    } else {
      points.push(arrow.endX[i], arrow.endY[i], arrow.to[i] / 2);
    }
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 3) {
    minX = Math.min(minX, points[i] - points[i + 2]);
    maxX = Math.max(maxX, points[i] + points[i + 2]);
    minY = Math.min(minY, points[i + 1] - points[i + 2]);
    maxY = Math.max(maxY, points[i + 1] + points[i + 2]);
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  let farthest = 1;
  for (let i = 0; i < points.length; i += 3) {
    farthest = Math.max(farthest, Math.hypot(points[i] - midX, points[i + 1] - midY) + points[i + 2]);
  }
  const fit = REACH / farthest;
  for (let i = 0; i < arrow.count; i += 1) {
    arrow.x[i] = CENTER + (arrow.x[i] - midX) * fit;
    arrow.y[i] = CENTER + (arrow.y[i] - midY) * fit;
    arrow.endX[i] = CENTER + (arrow.endX[i] - midX) * fit;
    arrow.endY[i] = CENTER + (arrow.endY[i] - midY) * fit;
    arrow.scale[i] *= fit;
    arrow.from[i] *= fit;
    arrow.to[i] *= fit;
  }
  // Branch lengths and start distances; parents come before their children, three to a split.
  arrow.reach = 0;
  for (let i = 0; i < arrow.count; i += 1) {
    const scale = arrow.scale[i];
    const side = arrow.side[i];
    arrow.length[i] = arrow.level[i] === 0
      ? STEM * scale
      : side === 0 ? STRAIGHT * scale : (RADIUS * turn + RUN) * scale;
    arrow.start[i] = i === 0 ? 0 : arrow.start[Math.floor((i - 1) / 3)] + arrow.length[Math.floor((i - 1) / 3)];
    arrow.reach = Math.max(arrow.reach, arrow.start[i] + arrow.length[i]);
  }
  return arrow;
}

/** Minimal path sink, satisfied by Path2D and by an SVG string builder. */
export type PathSink = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(ax: number, ay: number, bx: number, by: number, x: number, y: number): void;
  closePath(): void;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
/** Share of a turning branch's length over which its head grows to full size. */
const SPROUT = 0.45;

/**
 * Writes the arrow as closed outlines of one orientation, for a single
 * nonzero fill: overlaps merge and joints show no seams.
 *
 * `grown` is a distance along the arrow from the stem foot: every tip
 * advances at the same speed, and a split's three branches start the moment
 * their parent ends, leaving along its heading, so their heads take over
 * from the parent's at the same size and fan out as the bends sweep. Growing
 * tips and finished leaves carry heads. Defaults to the whole arrow.
 * `spacing` is the coarsest bend sampling, in face units (about 3 device px).
 */
export function traceArrow(arrow: Arrow, turn: number, sink: PathSink, grown = Infinity, spacing = 0) {
  for (let i = 0; i < arrow.count; i += 1) {
    const level = arrow.level[i];
    const along = Math.min(arrow.length[i], grown - arrow.start[i]);
    if (along <= 0) continue;
    const progress = along / arrow.length[i];
    const growing = grown < arrow.start[i] + arrow.length[i];
    const side = arrow.side[i];
    const heading = arrow.heading[i];
    const scale = arrow.scale[i];
    // Centreline samples with their headings and arc-length positions.
    const centre: Point[] = [{ x: arrow.x[i], y: arrow.y[i] }];
    const headings = [heading];
    const run = (level === 0 ? STEM : side === 0 ? STRAIGHT : RUN) * scale;
    let length = 0;
    const lengths = [0];
    if (side !== 0) {
      const pivot = add(centre[0], right(heading), side * RADIUS * scale);
      const bend = RADIUS * scale * turn;
      const steps = Math.max(1, Math.min(Math.ceil(turn / BEND_STEP), spacing > 0 ? Math.ceil(bend / spacing) : Infinity));
      for (let k = 1; k <= steps; k += 1) {
        const h = heading + (side * turn * k) / steps;
        centre.push(add(pivot, right(h), -side * RADIUS * scale));
        headings.push(h);
        length += bend / steps;
        lengths.push(length);
      }
    }
    const bendEnd = centre[centre.length - 1];
    const runHeading = headings[headings.length - 1];
    centre.push(add(bendEnd, unit(runHeading), run));
    headings.push(runHeading);
    length += run;
    lengths.push(length);

    // A growing branch is cut at its progress along the centreline.
    if (progress < 1) {
      const target = progress * length;
      let k = 1;
      while (k < lengths.length - 1 && lengths[k] < target) k += 1;
      const span = lengths[k] - lengths[k - 1];
      const t = span > 0 ? (target - lengths[k - 1]) / span : 0;
      const cut = add(centre[k - 1], { x: centre[k].x - centre[k - 1].x, y: centre[k].y - centre[k - 1].y }, t);
      const cutHeading = headings[k - 1] + (headings[k] - headings[k - 1]) * t;
      centre.length = k;
      headings.length = k;
      lengths.length = k;
      centre.push(cut);
      headings.push(cutHeading);
      lengths.push(target);
    }

    const width = (k: number) => {
      const t = length > 0 ? lengths[k] / length : 0;
      return (arrow.from[i] + (arrow.to[i] - arrow.from[i]) * t) / 2;
    };
    // Left edge forward, right edge back: the same turning sense as the heads.
    centre.forEach((p, k) => {
      const q = add(p, right(headings[k]), -width(k));
      if (k === 0) sink.moveTo(q.x, q.y);
      else sink.lineTo(q.x, q.y);
    });
    for (let k = centre.length - 1; k >= 0; k -= 1) {
      const q = add(centre[k], right(headings[k]), width(k));
      sink.lineTo(q.x, q.y);
    }
    sink.closePath();

    if (growing || level === arrow.levels) {
      const last = centre.length - 1;
      // The straight branch carries its parent's head on; turning ones grow theirs as they peel away.
      const emerge = side === 0 ? 1 : smooth(Math.min(1, progress / SPROUT));
      traceHead(sink, centre[last], headings[last], ((2 * width(last)) / SHAFT) * emerge);
    }
  }
}

/** 305's head at `base`, sized for a shaft `size` times 132, reaching back into the shaft. */
function traceHead(sink: PathSink, base: Point, heading: number, size: number) {
  const forward = unit(heading);
  const lateral = right(heading);
  const tip = add(base, forward, HEAD_LENGTH * size);
  const at = (v: number, back: number) => add(add(tip, lateral, v * size), forward, -back * size);
  // Tip, down the right side, across the shaft (overlapping it), up the left side.
  const segments = (sign: number) => HEAD_HALF.map(([kind, ...xy]) => {
    const points: Point[] = [];
    for (let k = 0; k < xy.length; k += 2) points.push(at(-sign * xy[k], xy[k + 1]));
    return { kind, points };
  });
  const rightSide = segments(1);
  const leftSide = segments(-1);
  sink.moveTo(tip.x, tip.y);
  for (const { kind, points } of rightSide) {
    if (kind === "L") sink.lineTo(points[0].x, points[0].y);
    else sink.bezierCurveTo(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);
  }
  const tail = HEAD_LENGTH + 12;
  for (const v of [66.5, -66.5]) {
    const q = at(v, tail);
    sink.lineTo(q.x, q.y);
  }
  // Left side walked back toward the tip: reverse each segment.
  const ends = [tip, ...leftSide.map(({ points }) => points[points.length - 1])];
  for (let j = leftSide.length - 1; j >= 0; j -= 1) {
    const { kind, points } = leftSide[j];
    const target = ends[j];
    if (kind === "L") sink.lineTo(target.x, target.y);
    else sink.bezierCurveTo(points[1].x, points[1].y, points[0].x, points[0].y, target.x, target.y);
  }
  sink.closePath();
}
