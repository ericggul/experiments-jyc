import { roots, type Root } from './keywords.ts';

export const sounds = ['off', 'on'] as const;
export const pages = ['native', 'scaled'] as const;

export type Settings = {
  /** The root keyword; the FOMO topics around it come from the chain. */
  keyword: Root;
  /** Windows in the run; all of them open at the start and stay. */
  count: number;
  /** Mean ms between windows while they open; 0 opens them all at once. */
  gap: number;
  /** Seconds of flicking between the windows once they are open. */
  duration: number;
  /** Typical ms a window stays in front; dwells are log-uniform from a third of it to 2.2× it, with flurries shorter and snags longer. */
  pace: number;
  /** Typical window width as % of the visible desktop; widths spread around it and a few windows are the whole desktop. */
  size: number;
  /** `native`: pages at 100 %, as a browser shows them. `scaled`: a window narrower than a laptop browser shows its page zoomed out. */
  pages: typeof pages[number];
  /** Share of windows that show a cloned page rather than a real one, %. */
  clones: number;
  /** Share of windows whose page is forced dark (Chrome's auto dark mode), the rest light, %. */
  dark: number;
  /** Share of flicks after which the window in front is dragged a little and perhaps resized, %. */
  moves: number;
  /** Pages may play audio; off mutes the windows. */
  sound: typeof sounds[number];
  seed: number;
  clearFirst: boolean;
};

export const defaults: Settings = { keyword: 'AI', count: 24, gap: 250, duration: 20, pace: 220, size: 70, pages: 'native', clones: 60, dark: 30, moves: 8, sound: 'off', seed: 1, clearFirst: true };

export const ranges = {
  count: [6, 40, 1],
  gap: [0, 1500, 10],
  duration: [5, 300, 5],
  pace: [60, 1000, 10],
  size: [50, 85, 1],
  clones: [0, 100, 5],
  dark: [0, 100, 5],
  moves: [0, 60, 1],
  seed: [1, 9999, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

/** Ms a window stays in front on an ordinary flick: log-uniform from `pace`/3 to 2.2 × `pace`. */
export const hop = (pace: number, u: number) => Math.round((pace / 3) * Math.pow(6.6, u));
/** Chance a flick starts a flurry: three to six flicks in quick succession. */
export const FLURRY = 0.15;
/** Ms between the flicks of a flurry. */
export const FLURRY_GAP = [45, 75] as const;
/** Chance a flick snags: the window stays longer and is scrolled, as when something catches the eye. */
export const SNAG = 0.12;
/** Ms a snagged window stays in front. */
export const SNAG_DWELL = [500, 900] as const;
/** Chance a flick goes back to the window that was in front just before, the back-and-forth of checking. */
export const RETURN = 0.25;
/** Ms between rearrangements, when two to four windows are given new places and sizes together. */
export const RESHUFFLE = [5000, 9000] as const;
/** Share of the windows whose pages have loaded before the flicking seconds start counting; flicking among the loaded ones starts earlier. */
export const MOST = 0.75;

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
