import { maximumReach } from "./looks.ts";

export type Point = { x: number; y: number };
export type Insets = { top: number; right: number; bottom: number; left: number };

export type Layout = {
  /** Slider (column) width in CSS px. */
  width: number;
  gap: number;
  pitch: number;
  columns: number;
  rows: number;
  /** Left edge of the first column; whole pixels. */
  left: number;
  /** Top edge of the first row; whole pixels. Every look's track starts exactly here. */
  top: number;
  /** Height of one slider in whole pixels; every look's track ends exactly at top + height. */
  height: number;
  rowGap: number;
  rowPitch: number;
  /** Distance from each end of a slider to the thumb centre at 0% and 100%. */
  inset: number;
};

export type Sliders = {
  layout: Layout;
  /** 0–1 per slider (1 = top), set by the finger. */
  target: Float32Array;
  /** 0–1 per slider, what is drawn; eases toward target. */
  shown: Float32Array;
  /** Shown value when the current ease began. */
  from: Float32Array;
  /** Seconds into the current ease; at `easeSeconds` or more the slider is still. */
  elapsed: Float32Array;
};

export const initialValue = 0.5;
/** A thumb glides to a new value over 100 ms with an ease-out. */
export const easeSeconds = 0.1;

export const densities = [1, 1.5, 2] as const;
export type Density = (typeof densities)[number];

/** Even widths keep every column centre on a whole pixel. */
const even = (value: number) => Math.max(2, 2 * Math.floor(value / 2));

/**
 * `width` is the column width at normal density; denser settings narrow both the column and the
 * gap so that about 1.5× or 2× as many columns fit. Every vertical edge is a whole pixel.
 */
export function layoutFor(viewWidth: number, viewHeight: number, baseWidth: number, density: number, rows: number, insets: Insets): Layout {
  const baseGap = Math.max(4, Math.round(baseWidth * 0.35));
  const width = density === 1 ? baseWidth : even(baseWidth / density);
  const gap = density === 1 ? baseGap : Math.max(2, Math.round(baseGap / density));
  const pitch = width + gap;
  const available = Math.max(width, viewWidth - insets.left - insets.right);
  const columns = Math.max(1, Math.floor((available + gap) / pitch));
  const span = columns * width + (columns - 1) * gap;
  // One travel inset for every look: the largest thumb reach plus a pixel for snapping.
  const inset = Math.ceil(maximumReach * width + 1);
  const rowGap = rows > 1 ? Math.max(16, Math.round(width * 1.2)) : 0;
  const availableHeight = Math.max(0, Math.floor(viewHeight - insets.top - insets.bottom));
  const height = Math.max(inset * 2 + 4, Math.floor((availableHeight - (rows - 1) * rowGap) / rows));
  const block = rows * height + (rows - 1) * rowGap;
  return {
    width,
    gap,
    pitch,
    columns,
    rows,
    left: Math.round(insets.left + (available - span) / 2),
    top: Math.round(insets.top + (availableHeight - block) / 2),
    height,
    rowGap,
    rowPitch: height + rowGap,
    inset,
  };
}

export function sliderLeft(layout: Layout, index: number) {
  return layout.left + (index % layout.columns) * layout.pitch;
}

export function sliderTop(layout: Layout, index: number) {
  return layout.top + Math.floor(index / layout.columns) * layout.rowPitch;
}

/** Thumb centre for a value on a slider whose top edge is `top`. */
export function thumbY(layout: Layout, top: number, value: number) {
  return top + layout.height - layout.inset - value * (layout.height - 2 * layout.inset);
}

export function valueAt(layout: Layout, top: number, y: number) {
  const travel = layout.height - 2 * layout.inset;
  return Math.max(0, Math.min(1, (top + layout.height - layout.inset - y) / travel));
}

export function createSliders(layout: Layout, value = initialValue): Sliders {
  const count = layout.columns * layout.rows;
  return {
    layout,
    target: new Float32Array(count).fill(value),
    shown: new Float32Array(count).fill(value),
    from: new Float32Array(count).fill(value),
    elapsed: new Float32Array(count).fill(easeSeconds),
  };
}

/**
 * Keeps each value at its place on screen: a new column takes the old column nearest its centre, a
 * row beyond the old stack takes the old bottom row's value.
 */
export function relayoutSliders(previous: Sliders, layout: Layout): Sliders {
  const next = createSliders(layout);
  const old = previous.layout;
  for (let column = 0; column < layout.columns; column += 1) {
    const centre = layout.left + column * layout.pitch + layout.width / 2;
    const source = Math.max(0, Math.min(old.columns - 1, Math.round((centre - old.left - old.width / 2) / old.pitch)));
    for (let row = 0; row < layout.rows; row += 1) {
      const value = previous.target[Math.min(row, old.rows - 1) * old.columns + source]!;
      const index = row * layout.columns + column;
      next.target[index] = value;
      next.shown[index] = value;
      next.from[index] = value;
    }
  }
  return next;
}

/** Liang–Barsky clip of the segment to a rectangle; returns [t0, t1] or null. */
function clip(from: Point, to: Point, x0: number, x1: number, y0: number, y1: number): [number, number] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, from.x - x0],
    [dx, x1 - from.x],
    [-dy, from.y - y0],
    [dy, y1 - from.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}

/**
 * Sets every slider the finger's segment crosses to the finger's height at the crossing. A slider's
 * hit area is its column plus half the gaps around it; outer columns and rows reach the screen edge.
 * Where the segment ends on a slider the end point wins, otherwise the height where it crosses the
 * column centre. Calls `changed` for each slider whose target moved; returns how many moved.
 */
export function setAlong(sliders: Sliders, from: Point, to: Point, changed?: (index: number, previous: number) => void): number {
  const { layout } = sliders;
  const { columns, rows, pitch, rowPitch, gap, rowGap, width, height } = layout;
  const firstColumn = Math.max(0, Math.floor((Math.min(from.x, to.x) - layout.left + gap / 2) / pitch));
  const lastColumn = Math.min(columns - 1, Math.floor((Math.max(from.x, to.x) - layout.left + gap / 2) / pitch));
  const firstRow = Math.max(0, Math.floor((Math.min(from.y, to.y) - layout.top + rowGap / 2) / rowPitch));
  const lastRow = Math.min(rows - 1, Math.floor((Math.max(from.y, to.y) - layout.top + rowGap / 2) / rowPitch));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let count = 0;
  for (let row = firstRow; row <= lastRow; row += 1) {
    const top = layout.top + row * rowPitch;
    const y0 = row === 0 ? -Infinity : top - rowGap / 2;
    const y1 = row === rows - 1 ? Infinity : top + height + rowGap / 2;
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const left = layout.left + column * pitch;
      const x0 = column === 0 ? -Infinity : left - gap / 2;
      const x1 = column === columns - 1 ? Infinity : left + width + gap / 2;
      const span = clip(from, to, x0, x1, y0, y1);
      if (!span) continue;
      let t = span[1];
      if (t < 1 && dx !== 0) t = Math.max(span[0], Math.min(span[1], (left + width / 2 - from.x) / dx));
      const value = Math.fround(valueAt(layout, top, from.y + dy * t));
      const index = row * columns + column;
      const previous = sliders.target[index]!;
      if (previous === value) continue;
      sliders.target[index] = value;
      sliders.from[index] = sliders.shown[index]!;
      sliders.elapsed[index] = 0;
      count += 1;
      changed?.(index, previous);
    }
  }
  return count;
}

/** Eases shown values toward targets, marking moved sliders in `dirty`; returns whether any still moves. */
export function stepSliders(sliders: Sliders, seconds: number, dirty: Uint8Array): boolean {
  const { target, shown, from, elapsed } = sliders;
  let moving = false;
  for (let index = 0; index < target.length; index += 1) {
    if (elapsed[index]! >= easeSeconds) continue;
    elapsed[index] = elapsed[index]! + seconds;
    dirty[index] = 1;
    if (elapsed[index]! >= easeSeconds) {
      shown[index] = target[index]!;
      continue;
    }
    const t = 1 - elapsed[index]! / easeSeconds;
    shown[index] = target[index]! + (from[index]! - target[index]!) * t * t * t;
    moving = true;
  }
  return moving;
}
