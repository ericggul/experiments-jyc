import { surfaceInfo, surfaces } from '../../../foundations/surfaces/index.ts';

export const timings = ['sequence', 'together'] as const;
export const orders = ['trace', 'mirror', 'shuffle'] as const;
export const stacks = ['newest', 'oldest', 'upper', 'lower'] as const;
export const fills = ['pink', 'red', 'pink-red', 'wikipedia'] as const;

export type Settings = {
  /** What each rectangle is, in order of preference: chrome app, terminal, bare. */
  surface: typeof surfaces[number];
  /** Number of windows on the outline. */
  count: number;
  /** `sequence` opens one window per interval; `together` opens them with no gap. */
  timing: typeof timings[number];
  /** Seconds between windows in `sequence`. */
  interval: number;
  /** `trace` follows the outline from the top cusp; `mirror` grows both sides at once. */
  order: typeof orders[number];
  /** Which windows end up in front once they overlap. */
  stack: typeof stacks[number];
  /** Share of the free desktop the outline spans, %. */
  size: number;
  /** Window width as % of the visible desktop width. */
  tileWidth: number;
  /** Window height as % of the visible desktop height. */
  tileHeight: number;
  /** Window colour; `wikipedia` loads a random article instead. */
  fill: typeof fills[number];
  /** Pattern for `shuffle`. */
  seed: number;
  /** Remove every window from earlier runs before opening new ones. */
  clearFirst: boolean;
};

export const defaults: Settings = { surface: 'chrome-app', count: 30, timing: 'sequence', interval: .1, order: 'trace', stack: 'newest', size: 92, tileWidth: 16, tileHeight: 18, fill: 'pink', seed: 1, clearFirst: true };

export const ranges = {
  count: [3, 60, 1],
  interval: [.02, 1, .01],
  size: [40, 100, 1],
  tileWidth: [6, 40, 1],
  tileHeight: [6, 40, 1],
  seed: [1, 9999, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

export const colors = { pink: '#ff2e93', red: '#ff1a2e' } as const;
export const randomArticle = 'https://en.wikipedia.org/wiki/Special:Random';

/** Colour of the window at an outline step; `pink-red` alternates around the heart. */
export function colorAt(fill: Settings['fill'], step: number) {
  if (fill === 'red') return colors.red;
  if (fill === 'pink-red') return step % 2 ? colors.red : colors.pink;
  return colors.pink;
}

/** Fill and stacking choices the surface supports. */
export const fillsFor = (surface: Settings['surface']) => surfaceInfo[surface].pages ? fills : fills.filter(fill => fill !== 'wikipedia');
export const stacksFor = (surface: Settings['surface']) => surfaceInfo[surface].stacking ? stacks : (['newest'] as const);

const choices = { surface: surfaces, timing: timings, order: orders, stack: stacks, fill: fills } as const;

export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('Settings are required.');
  const input = value as Record<string, unknown>;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (key !== 'interval' && !Number.isInteger(n))) throw new Error(`${key} must be ${min}–${max}.`);
  }
  for (const [key, allowed] of Object.entries(choices)) {
    if (!(allowed as readonly unknown[]).includes(input[key])) throw new Error(`${key} is not an available option.`);
  }
  if (typeof input.clearFirst !== 'boolean') throw new Error('clearFirst must be true or false.');
  const surface = input.surface as Settings['surface'];
  if (!(fillsFor(surface) as readonly unknown[]).includes(input.fill)) throw new Error(`${surfaceInfo[surface].label} windows take a colour, not a page.`);
  if (!(stacksFor(surface) as readonly unknown[]).includes(input.stack)) throw new Error(`${surfaceInfo[surface].label} keeps the newest window in front.`);
  return Object.fromEntries(Object.keys(defaults).map(key => [key, input[key]])) as Settings;
}

/** Clamps a typed value into its range; only `interval` keeps decimals. */
export function clampSetting(key: keyof typeof ranges, raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const [min, max] = ranges[key];
  return Math.min(max, Math.max(min, key === 'interval' ? Math.round(n * 100) / 100 : Math.round(n)));
}
