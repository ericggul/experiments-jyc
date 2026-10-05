import type { Settings } from './settings.ts';

export type Frame = { x: number; y: number; width: number; height: number };
export type Tile = Frame & { /** Position along the outline, 0 at the top cusp. */ step: number };

// Classic heart curve; y is negated so it points down in screen coordinates.
function curve(t: number): [number, number] {
  return [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
}

const SAMPLES = 4096;
const dense = Array.from({ length: SAMPLES + 1 }, (_, i) => curve((i / SAMPLES) * Math.PI * 2));
const lengths = dense.reduce<number[]>((acc, point, i) => {
  if (i === 0) return [0];
  const [x0, y0] = dense[i - 1];
  acc.push(acc[i - 1] + Math.hypot(point[0] - x0, point[1] - y0));
  return acc;
}, []);
const perimeter = lengths[SAMPLES];
const xs = dense.map(([x]) => x);
const ys = dense.map(([, y]) => y);
const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };

/** n points at equal arc length, starting at the top cusp and going clockwise. */
export function outline(n: number) {
  const points: [number, number][] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * perimeter;
    while (lengths[j + 1] < target) j++;
    const span = lengths[j + 1] - lengths[j] || 1;
    const f = (target - lengths[j]) / span;
    points.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
  }
  return points;
}

function seededOrder(n: number, seed: number) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Creation order of outline steps. `mirror` pairs step k with its reflection n − k. */
export function sequence(n: number, order: Settings['order'], seed: number) {
  if (order === 'shuffle') return seededOrder(n, seed);
  if (order === 'trace') return Array.from({ length: n }, (_, i) => i);
  const steps = [0];
  for (let k = 1; steps.length < n; k++) {
    steps.push(k);
    if (steps.length < n && n - k !== k) steps.push(n - k);
  }
  return steps;
}

/**
 * Window rectangles whose centers trace a heart, centered in the visible
 * desktop. The outline is scaled so every window stays inside the frame.
 */
export function layoutHeart(frame: Frame, settings: Pick<Settings, 'count' | 'order' | 'size' | 'tileWidth' | 'tileHeight' | 'seed'>): Tile[] {
  const width = Math.round(frame.width * settings.tileWidth / 100);
  const height = Math.round(frame.height * settings.tileHeight / 100);
  const scale = Math.min((frame.width - width) / (box.maxX - box.minX), (frame.height - height) / (box.maxY - box.minY)) * settings.size / 100;
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const mx = (box.minX + box.maxX) / 2;
  const my = (box.minY + box.maxY) / 2;
  const points = outline(settings.count);
  return sequence(settings.count, settings.order, settings.seed).map(step => {
    const [px, py] = points[step];
    return {
      step,
      x: Math.round(cx + (px - mx) * scale - width / 2),
      y: Math.round(cy + (py - my) * scale - height / 2),
      width,
      height,
    };
  });
}
