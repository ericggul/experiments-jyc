import { roots, type Root } from './keywords.ts';

export const agents = ['none', 'passive', 'active'] as const;
export const links = ['follow', 'leave'] as const;
export const sounds = ['off', 'on'] as const;

export type Settings = {
  /** The root keyword; its derivatives come from the chain. */
  keyword: Root;
  /** Mean seconds between windows. */
  interval: number;
  /** Self-excitation: how much one arrival pulls the next ones closer, %. */
  burst: number;
  /** Windows in the run. */
  count: number;
  /** Mean window width as % of the visible desktop; height follows. */
  size: number;
  /** Open windows kept; above it the oldest closes. */
  limit: number;
  /** Share of windows that show a cloned page rather than a real one, %. */
  clones: number;
  /** `none`: windows only. `passive`: reads (scrolls) every window. `active`: also writes inside cloned pages. */
  agent: typeof agents[number];
  /** On real pages, the reader may follow a link to a derived keyword and spawn a window for it. */
  links: typeof links[number];
  /** Pages may play audio; off mutes the windows. */
  sound: typeof sounds[number];
  seed: number;
  clearFirst: boolean;
};

export const defaults: Settings = { keyword: 'AI', interval: 7, burst: 40, count: 20, size: 70, limit: 12, clones: 50, agent: 'active', links: 'follow', sound: 'off', seed: 1, clearFirst: true };

export const ranges = {
  interval: [2, 20, 1],
  burst: [0, 100, 5],
  count: [4, 40, 1],
  size: [40, 100, 1],
  limit: [4, 24, 1],
  clones: [0, 100, 5],
  seed: [1, 9999, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

const choices = { keyword: roots, agent: agents, links, sound: sounds } as const;

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
  const [min, max] = ranges[key];
  return Math.min(max, Math.max(min, Math.round(n)));
}
