import { between, type Random } from './random.ts';

// Where a window goes and how big it is. Sizes spread from well under the
// mean up to it while the proportions stay close to a laptop browser's;
// places are a cascade from the top-left, anywhere on the desktop, or
// against an edge.

export type Rect = { x: number; y: number; width: number; height: number };

const STEP = 22;
const CASCADE = 10;
/** Width over height, around a laptop browser window. */
const RATIO = [1.3, 1.75] as const;
/** Width as a multiple of the mean: never wider than it, so no window covers the desktop. */
const SPREAD = [0.4, 1] as const;
/** Page width at which a page is shown at 100 %; narrower windows are zoomed out in proportion. */
export const REFERENCE_WIDTH = 1280;
export const MIN_ZOOM = 0.5;

export function windowRect(visible: Rect, index: number, size: number, random: Random): Rect {
  const ratio = between(random, RATIO[0], RATIO[1]);
  let width = clamp(visible.width * (size / 100) * between(random, SPREAD[0], SPREAD[1]), Math.min(380, visible.width), visible.width);
  let height = clamp(width / ratio, Math.min(300, visible.height), visible.height);
  // When the height is clamped either way, the width follows it so the proportions hold.
  if (height !== width / ratio) width = clamp(height * ratio, Math.min(380, visible.width), visible.width);
  width = Math.round(width);
  height = Math.round(height);
  const free = { width: visible.width - width, height: visible.height - height };
  const slot = index % CASCADE;
  const mode = random();
  let x: number;
  let y: number;
  if (mode < 0.4) {
    x = visible.x + 16 + slot * STEP + between(random, 0, 48);
    y = visible.y + 8 + slot * STEP + between(random, 0, 24);
  } else if (mode < 0.75) {
    x = visible.x + between(random, 0, free.width);
    y = visible.y + between(random, 0, free.height);
  } else {
    const edge = random();
    x = edge < 0.45 ? visible.x + free.width - between(random, 0, 24) : edge < 0.7 ? visible.x + between(random, 0, 24) : visible.x + between(random, 0, free.width);
    y = edge < 0.7 ? visible.y + between(random, 0, free.height) : visible.y + free.height - between(random, 0, 16);
  }
  return { x: Math.round(clamp(x, visible.x, visible.x + free.width)), y: Math.round(clamp(y, visible.y, visible.y + free.height)), width, height };
}

/** The zoom a page gets in a window of this width when pages are scaled. */
export function zoomFor(width: number) {
  return Math.round(clamp(width / REFERENCE_WIDTH, MIN_ZOOM, 1) * 100) / 100;
}

/** Chance that a brief visit goes to this window given its recency rank (0 = newest). */
export const revisitWeight = (rank: number) => 1 / (1 + rank);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
