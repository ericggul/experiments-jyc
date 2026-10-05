import { runJxa } from '../jxa/index.ts';
import type { Display } from '../surfaces/index.ts';

/**
 * Main display size and its visible frame (without menu bar and Dock), in the
 * top-left coordinates window bounds use.
 */
export const measureScript = `
ObjC.import('AppKit');
function run() {
  const screen = $.NSScreen.screens.objectAtIndex(0);
  const frame = screen.frame;
  const visible = screen.visibleFrame;
  return JSON.stringify({
    width: frame.size.width,
    height: frame.size.height,
    visible: {
      x: visible.origin.x,
      y: frame.size.height - (visible.origin.y + visible.size.height),
      width: visible.size.width,
      height: visible.size.height,
    },
    scale: screen.backingScaleFactor,
  });
}`;

export async function measureDisplay(): Promise<Display> {
  return { ...await runJxa<Omit<Display, 'measuredAt'>>(measureScript), measuredAt: Date.now() };
}
