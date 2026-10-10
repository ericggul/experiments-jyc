import { between, type Random } from './random.ts';

// Where a window goes and how big it is. The stack has to fill the screen:
// a fifth of the windows are the whole visible desktop, a third are large
// and flush against an edge or corner, the rest medium or small, and every
// coordinate snaps to an edge half the time, so the margins close.

export type Rect = { x: number; y: number; width: number; height: number };

/** Share of windows in each tier: whole desktop, large, medium, small. */
const TIERS = [0.2, 0.35, 0.3, 0.15] as const;
/** Width and height as shares of the visible desktop (× `size`), per tier after the first. */
const SPANS = [[0.7, 1, 0.7, 1], [0.45, 0.75, 0.45, 0.8], [0.3, 0.45, 0.3, 0.5]] as const;
/** Page width at which a page is shown at 100 %; narrower windows are zoomed out in proportion, never below MIN_ZOOM. */
export const REFERENCE_WIDTH = 1024;
export const MIN_ZOOM = 0.75;

export function windowRect(visible: Rect, index: number, size: number, random: Random): Rect {
  const scale = size / 100;
  const u = random();
  if (u < TIERS[0]) return { x: visible.x, y: visible.y, width: Math.round(visible.width * scale), height: Math.round(visible.height * scale) };
  const tier = u < TIERS[0] + TIERS[1] ? 0 : u < TIERS[0] + TIERS[1] + TIERS[2] ? 1 : 2;
  const [w0, w1, h0, h1] = SPANS[tier];
  const width = Math.round(clamp(visible.width * scale * between(random, w0, w1), Math.min(380, visible.width), visible.width));
  const height = Math.round(clamp(visible.height * scale * between(random, h0, h1), Math.min(300, visible.height), visible.height));
  const free = { width: visible.width - width, height: visible.height - height };
  // Large windows sit against an edge or in a corner; others snap to an edge half the time.
  const anchor = (room: number, edgeChance: number) => {
    const r = random();
    if (r < edgeChance / 2) return 0;
    if (r < edgeChance) return room;
    return between(random, 0, room);
  };
  const edgeChance = tier === 0 ? 0.9 : 0.5;
  return { x: Math.round(visible.x + anchor(free.width, edgeChance)), y: Math.round(visible.y + anchor(free.height, edgeChance)), width, height };
}

/** The zoom a page gets in a window of this width when pages are scaled. */
export function zoomFor(width: number) {
  return Math.round(clamp(width / REFERENCE_WIDTH, MIN_ZOOM, 1) * 100) / 100;
}

/** Chance that a brief visit goes to this window given its recency rank (0 = newest). */
export const revisitWeight = (rank: number) => 1 / (1 + rank);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
