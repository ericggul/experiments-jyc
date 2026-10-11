import { between, type Random } from './random.ts';

// Where a window goes and how big it is: every window is the same phone,
// `height` % of the visible desktop tall and a phone's width for that
// height, placed anywhere on the desktop at random, so the phones overlap
// in a scatter rather than a grid.

export type Rect = { x: number; y: number; width: number; height: number };

/** A phone window's height over its width, title bar included. */
export const PHONE = 2.05;

/** The phone's size for this desktop. */
export function phoneOf(visible: Rect, height: number) {
  const h = Math.min(visible.height, Math.round(visible.height * height / 100));
  const w = Math.min(visible.width, Math.round(h / PHONE));
  return { width: w, height: h };
}

/** Window `index`'s place: the phone, anywhere on the desktop. */
export function windowRect(visible: Rect, index: number, height: number, random: Random): Rect {
  const phone = phoneOf(visible, height);
  return {
    x: Math.round(visible.x + between(random, 0, visible.width - phone.width)),
    y: Math.round(visible.y + between(random, 0, visible.height - phone.height)),
    ...phone,
  };
}
