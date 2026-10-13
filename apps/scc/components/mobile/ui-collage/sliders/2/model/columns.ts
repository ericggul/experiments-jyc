export type Point = { x: number; y: number };

/** The area the columns fill: the whole viewport. */
export type Bounds = { left: number; top: number; right: number; bottom: number };

export type Layout = {
  /** Column width. */
  width: number;
  gap: number;
  /** width + gap (fractional: the columns are stretched to fill the bounds). */
  pitch: number;
  count: number;
  left: number;
  /** Every column runs from `top` (100%) to `bottom` (0%). */
  top: number;
  bottom: number;
};

export type Columns = {
  layout: Layout;
  /** 0–1 per column (1 = top): the value a finger set. */
  target: Float32Array;
  /** What is drawn: a spring following `target` (0–1; 용수철 may briefly overshoot past either end). */
  shown: Float32Array;
  /** Per-second velocity of `shown`. */
  velocity: Float32Array;
};

// Columns of type stand almost solid and fill the bounds edge to edge: as many as fit with a gap of at least ⅛
// the width (≥ 2 px, the painter pads each column by 1 px), then the leftover width is shared out between them.
export function layoutFor(bounds: Bounds, width: number): Layout {
  const minimumGap = Math.max(2, Math.round(width / 8));
  const available = Math.max(0, bounds.right - bounds.left);
  const count = Math.max(1, Math.floor((available + minimumGap) / (width + minimumGap)));
  const gap = count > 1 ? (available - count * width) / (count - 1) : 0;
  return { width, gap, pitch: width + gap, count, left: bounds.left, top: bounds.top, bottom: bounds.bottom };
}

export function columnLeft(layout: Layout, column: number) {
  return layout.left + column * layout.pitch;
}

/** Height on screen of a value. */
export function valueY(layout: Layout, value: number) {
  return layout.bottom - value * (layout.bottom - layout.top);
}

export function valueAt(layout: Layout, y: number) {
  return Math.max(0, Math.min(1, (layout.bottom - y) / Math.max(1e-9, layout.bottom - layout.top)));
}

/** Values start at a flat 50%, an untouched equaliser. */
export function createColumns(bounds: Bounds, width: number): Columns {
  const layout = layoutFor(bounds, width);
  return {
    layout,
    target: new Float32Array(layout.count).fill(0.5),
    shown: new Float32Array(layout.count).fill(0.5),
    velocity: new Float32Array(layout.count),
  };
}

/** New width or bounds: each new column takes the value of the old column nearest its centre, so values stay in place on screen. */
export function relayoutColumns(previous: Columns, bounds: Bounds, width: number): Columns {
  const next = createColumns(bounds, width);
  const old = previous.layout;
  for (let column = 0; column < next.layout.count; column += 1) {
    const centre = columnLeft(next.layout, column) + width / 2;
    const nearest = Math.max(0, Math.min(old.count - 1, Math.round((centre - old.left - old.width / 2) / old.pitch)));
    next.target[column] = previous.target[nearest]!;
    next.shown[column] = previous.shown[nearest]!;
    next.velocity[column] = previous.velocity[nearest]!;
  }
  return next;
}

/** How the drawn column follows the finger: 부드럽게 (critically damped, default) or 용수철 (an underdamped spring). */
export type Follow = "smooth" | "spring";

/** 부드럽게: seconds the drawn column takes to catch up with the finger (the spring's smoothing time). */
export const followTime = 0.06;
/** 용수철: natural frequency (Hz) and damping ratio; ζ = 0.25 overshoots by about 44% of the jump, then rings out in two or three bounces. */
export const springHz = 3.5;
export const springDamping = 0.25;
/** 용수철 is integrated in fixed substeps so it stays stable and identical at any frame rate. */
const springStep = 1 / 240;

/**
 * Moves each drawn value toward its target. 부드럽게 is a critically damped spring (Game Programming Gems 4's
 * SmoothDamp): it glides there without overshoot, independent of frame rate. 용수철 is a real mass on a spring: it
 * shoots past the finger's height and bounces back before settling. Returns whether any value still moves.
 */
export function followColumns(columns: Columns, seconds: number, follow: Follow = "smooth"): boolean {
  let moving = false;
  if (follow === "spring") {
    const omega = 2 * Math.PI * springHz;
    for (let column = 0; column < columns.shown.length; column += 1) {
      const target = columns.target[column]!;
      let shown = columns.shown[column]!;
      let velocity = columns.velocity[column]!;
      if (Math.abs(shown - target) < 1e-4 && Math.abs(velocity) < 1e-3) {
        columns.shown[column] = target;
        columns.velocity[column] = 0;
        continue;
      }
      for (let left = seconds; left > 1e-9; left -= springStep) {
        const step = Math.min(springStep, left);
        velocity += (omega * omega * (target - shown) - 2 * springDamping * omega * velocity) * step;
        shown += velocity * step;
      }
      columns.shown[column] = shown;
      columns.velocity[column] = velocity;
      moving = true;
    }
    return moving;
  }
  const omega = 2 / followTime;
  const x = omega * seconds;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  for (let column = 0; column < columns.shown.length; column += 1) {
    const target = columns.target[column]!;
    const change = columns.shown[column]! - target;
    const velocity = columns.velocity[column]!;
    if (Math.abs(change) < 1e-4 && Math.abs(velocity) < 1e-3) {
      columns.shown[column] = target;
      columns.velocity[column] = 0;
      continue;
    }
    const pull = (velocity + omega * change) * seconds;
    columns.velocity[column] = (velocity - omega * pull) * decay;
    columns.shown[column] = Math.max(0, Math.min(1, target + (change + pull) * decay));
    moving = true;
  }
  return moving;
}

/** Liang–Barsky: does the segment from → to touch the rectangle? A zero-length segment is a point test. */
export function segmentHitsRect(from: Point, to: Point, left: number, top: number, right: number, bottom: number) {
  let t0 = 0;
  let t1 = 1;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edges: [number, number][] = [
    [-dx, from.x - left],
    [dx, right - from.x],
    [-dy, from.y - top],
    [dy, bottom - from.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** Where up the column the finger is: its current point if that lies in the band, else where the segment crosses the column's centre line. */
function crossingY(from: Point, to: Point, centre: number, left: number, right: number) {
  if (to.x >= left && to.x <= right) return to.y;
  if (from.x !== to.x && (from.x - centre) * (to.x - centre) <= 0) {
    return from.y + ((centre - from.x) / (to.x - from.x)) * (to.y - from.y);
  }
  return from.y;
}

/**
 * Sets every column whose band the finger's segment crosses to the finger's height there, like drawing on a
 * graphic equaliser. A band is the column plus half the gap on each side, so the screen has no dead strips.
 * Calls `moved(column, previous)` for each column it sets; returns how many it set.
 */
export function setAlong(columns: Columns, from: Point, to: Point, moved?: (column: number, previous: number) => void): number {
  const { layout } = columns;
  const half = layout.gap / 2;
  const first = Math.max(0, Math.floor((Math.min(from.x, to.x) - layout.left + half) / layout.pitch));
  const last = Math.min(layout.count - 1, Math.floor((Math.max(from.x, to.x) - layout.left + half) / layout.pitch));
  let count = 0;
  for (let column = first; column <= last; column += 1) {
    const left = columnLeft(layout, column);
    if (!segmentHitsRect(from, to, left - half, layout.top, left + layout.width + half, layout.bottom)) continue;
    const y = crossingY(from, to, left + layout.width / 2, left - half, left + layout.width + half);
    const previous = columns.target[column]!;
    columns.target[column] = valueAt(layout, y);
    moved?.(column, previous);
    count += 1;
  }
  return count;
}
