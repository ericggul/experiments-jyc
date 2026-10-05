import type { Rect } from './field.ts';
import type { Settings } from './settings.ts';

function random(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}

/** Initial window rectangles inside the visible desktop. */
export function arrange(frame: Rect, settings: Pick<Settings, 'count' | 'arrangement' | 'tileWidth' | 'tileHeight' | 'seed'>): Rect[] {
  const width = Math.round(frame.width * settings.tileWidth / 100);
  const height = Math.round(frame.height * settings.tileHeight / 100);
  const free = { width: frame.width - width, height: frame.height - height };
  const at = (u: number, v: number): Rect => ({ x: Math.round(frame.x + free.width * u), y: Math.round(frame.y + free.height * v), width, height });
  const n = settings.count;
  if (settings.arrangement === 'row') return Array.from({ length: n }, (_, i) => at(n === 1 ? .5 : .08 + .84 * i / (n - 1), .5));
  if (settings.arrangement === 'ring') return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return at(.5 + .42 * Math.cos(a), .5 + .42 * Math.sin(a));
  });
  const next = random(settings.seed);
  return Array.from({ length: n }, () => at(.06 + next() * .88, .06 + next() * .88));
}
