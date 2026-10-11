import { between, type Random } from './random.ts';

// Where a window goes and how big it is. The windows look like a person's
// browser windows on a laptop: most are a little over two thirds of the
// desktop wide and about four fifths as tall, from about half the desktop up
// to 85 % of it, so no ordinary window covers the desktop; one in twenty-five
// is the whole desktop, as a zoomed window is, and a run has at most one of
// those; none is a strip or a thumbnail. Widths spread in a bell around `size`; heights follow the width
// with their own spread. Windows open at the top of the desktop or flush
// with its left or right edge about as often as a person leaves them there,
// otherwise anywhere; together they cover the desktop.

export type Rect = { x: number; y: number; width: number; height: number };

/** Share of windows that are the whole visible desktop, as a zoomed window is. */
export const FULL = 0.04;
/** Half-range of the width bell around `size`, as a share of the desktop width. */
const WIDTH_SPREAD = 0.16;
/** Height as a share of the desktop height: centre, half-range, floor and ceiling; it also follows the width's deviation. */
const HEIGHT = { centre: 0.8, spread: 0.14, floor: 0.58, ceiling: 0.93 } as const;
/** Smallest and largest width, as shares of the desktop width, for a window that is not the whole desktop. */
const WIDTH = { floor: 0.45, ceiling: 0.85 } as const;
/** Chances a window is flush with the top, the left edge or the right edge. */
const EDGE = { top: 0.35, left: 0.2, right: 0.2 } as const;
/** Page width at which a page is shown at 100 %; narrower windows are zoomed out in proportion, never below MIN_ZOOM. */
export const REFERENCE_WIDTH = 1024;
export const MIN_ZOOM = 0.75;

/** A bell-shaped draw in [-1, 1]: the sum of two uniforms. */
const bell = (random: Random) => random() + random() - 1;

/** A window's place and size; `size` is the typical width as % of the visible desktop. With `whole` false the window is never the whole desktop. */
export function windowRect(visible: Rect, index: number, size: number, random: Random, whole = true): Rect {
  if (random() < FULL && whole) return { x: visible.x, y: visible.y, width: visible.width, height: visible.height };
  const typical = size / 100;
  const wShare = clamp(typical + bell(random) * WIDTH_SPREAD, WIDTH.floor, WIDTH.ceiling);
  const hShare = clamp(HEIGHT.centre + bell(random) * HEIGHT.spread + (wShare - typical) * 0.4, HEIGHT.floor, HEIGHT.ceiling);
  const width = Math.round(visible.width * wShare);
  const height = Math.round(visible.height * hShare);
  const free = { width: visible.width - width, height: visible.height - height };
  const r = random();
  const x = r < EDGE.left ? 0 : r < EDGE.left + EDGE.right ? free.width : between(random, 0, free.width);
  const y = random() < EDGE.top ? 0 : between(random, 0, free.height);
  return { x: Math.round(visible.x + x), y: Math.round(visible.y + y), width, height };
}

/** How far a drag moves a window and how much a resize changes it, as shares of the desktop. */
const NUDGE = { move: 0.12, resize: 0.08 } as const;

/** The same window after someone dragged it a little and perhaps resized it; it stays on the desktop and never thinner than the floor. */
export function nudge(visible: Rect, rect: Rect, random: Random): Rect {
  const whole = rect.width === visible.width && rect.height === visible.height;
  const width = whole ? rect.width : Math.round(clamp(rect.width + bell(random) * NUDGE.resize * visible.width, visible.width * WIDTH.floor, visible.width * WIDTH.ceiling));
  const height = whole ? rect.height : Math.round(clamp(rect.height + bell(random) * NUDGE.resize * visible.height, visible.height * HEIGHT.floor, visible.height * HEIGHT.ceiling));
  const x = Math.round(clamp(rect.x + bell(random) * NUDGE.move * visible.width, visible.x, visible.x + visible.width - width));
  const y = Math.round(clamp(rect.y + bell(random) * NUDGE.move * visible.height, visible.y, visible.y + visible.height - height));
  return { x, y, width, height };
}

/** The zoom a page gets in a window of this width when pages are scaled. */
export function zoomFor(width: number) {
  return Math.round(clamp(width / REFERENCE_WIDTH, MIN_ZOOM, 1) * 100) / 100;
}

/** Chance that a brief visit goes to this window given its recency rank (0 = newest). */
export const revisitWeight = (rank: number) => 1 / (1 + rank);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
