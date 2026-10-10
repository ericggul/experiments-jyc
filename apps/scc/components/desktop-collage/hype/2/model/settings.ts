import { roots, type Root } from './keywords.ts';

export const sounds = ['off', 'on'] as const;
export const pages = ['scaled', 'native'] as const;

export type Settings = {
  /** The root keyword; the FOMO topics around it come from the chain. */
  keyword: Root;
  /** Windows in the run; all of them open at the start and stay. */
  count: number;
  /** Mean ms between windows while they open; 0 opens them all at once. */
  gap: number;
  /** Seconds of flicking between the windows once they are open. */
  duration: number;
  /** Longest ms between flicks; gaps are log-uniform down to an eighth of it, so most are short. */
  pace: number;
  /** Scale of every window as % of the visible desktop: at 100 a fifth of them are the whole desktop. */
  size: number;
  /** `scaled`: a window narrower than a laptop browser shows its page zoomed out. `native`: pages at 100 %. */
  pages: typeof pages[number];
  /** Share of windows that show a cloned page rather than a real one, %. */
  clones: number;
  /** Share of windows whose page is forced dark (Chrome's auto dark mode), the rest light, %. */
  dark: number;
  /** Share of flicks that also move and resize the window they land on, %. */
  moves: number;
  /** Pages may play audio; off mutes the windows. */
  sound: typeof sounds[number];
  seed: number;
  clearFirst: boolean;
};

export const defaults: Settings = { keyword: 'AI', count: 24, gap: 120, duration: 20, pace: 120, size: 100, pages: 'scaled', clones: 60, dark: 50, moves: 30, sound: 'off', seed: 1, clearFirst: true };

export const ranges = {
  count: [6, 40, 1],
  gap: [0, 1500, 10],
  duration: [5, 300, 5],
  pace: [40, 600, 10],
  size: [50, 100, 1],
  clones: [0, 100, 5],
  dark: [0, 100, 5],
  moves: [0, 100, 2],
  seed: [1, 9999, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

/** Ms between flicks: log-uniform between an eighth of `pace` and `pace`, so most gaps are short and a few are long. */
export const hop = (pace: number, u: number) => Math.round((pace / 8) * Math.pow(8, u));
/** Chance a flick starts a flurry of three to six flicks about 20 ms apart. */
export const FLURRY = 0.15;
/** Ms between reshuffles, when three to six windows take new places and sizes together. */
export const RESHUFFLE = [2000, 4000] as const;
/** Windows that have settled before the flicking starts; the rest join as they arrive. */
export const ENOUGH = 4;

const choices = { keyword: roots, sound: sounds, pages } as const;

export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('Settings are required.');
  const input = value as Record<string, unknown>;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) throw new Error(`${key} must be ${min}–${max}.`);
  }
  for (const [key, allowed] of Object.entries(choices)) {
    if (!(allowed as readonly unknown[]).includes(input[key])) throw new Error(`${key} is not an available option.`);
  }
  if (typeof input.clearFirst !== 'boolean') throw new Error('clearFirst must be true or false.');
  return Object.fromEntries(Object.keys(defaults).map(key => [key, input[key]])) as Settings;
}

export function clampSetting(key: keyof typeof ranges, raw: string) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const [min, max, step] = ranges[key];
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
}
