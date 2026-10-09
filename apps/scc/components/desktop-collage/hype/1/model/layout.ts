import { between, chance, type Random } from './random.ts';

// Where a window goes and how big it is: laptop-browser sizes, unequal, in a
// cascade from the top-left with macOS's step, some on the right edge.

export type Rect = { x: number; y: number; width: number; height: number };

const STEP = 22;
const CASCADE = 10;

export function windowRect(visible: Rect, index: number, size: number, random: Random): Rect {
  const share = size / 100;
  const width = Math.round(clamp(visible.width * share * between(random, 0.82, 1.12), Math.min(560, visible.width), visible.width));
  const height = Math.round(clamp(visible.height * (share + 0.12) * between(random, 0.85, 1.08), Math.min(440, visible.height), visible.height));
  const slot = index % CASCADE;
  const right = chance(random, 0.22);
  const x = right
    ? visible.x + visible.width - width - between(random, 8, 60)
    : visible.x + 16 + slot * STEP + between(random, 0, 48);
  const y = visible.y + 8 + slot * STEP + between(random, 0, 24);
  return {
    x: Math.round(clamp(x, visible.x, visible.x + visible.width - width)),
    y: Math.round(clamp(y, visible.y, visible.y + visible.height - height)),
    width,
    height,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
