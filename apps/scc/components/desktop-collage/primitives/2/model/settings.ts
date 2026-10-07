export const arrangements = ['row', 'ring', 'scatter'] as const;
export const motions = ['still', 'drift'] as const;
export const fills = ['green-red', 'pink-red'] as const;
export const forms = ['clouds', 'cubes', 'network'] as const;

export type Settings = {
  /**
   * `clouds`: Entangled's particle clouds (veined shell, partner-coloured core,
   * hourglass bridge). `cubes`: the open-source multipleWindow3dScene demo.
   * `network`: an evolving acquaintance network per window whose ties reach
   * across windows.
   */
  form: typeof forms[number];
  /** Chrome app windows, each holding one cloud of the shared field. */
  count: number;
  /** Where the windows open on the desktop. */
  arrangement: typeof arrangements[number];
  /** Window width and height as % of the visible desktop. */
  tileWidth: number;
  tileHeight: number;
  /** Distance at which two spheres begin to connect, % of the visible desktop width. */
  range: number;
  fill: typeof fills[number];
  /** `still`: windows move only when someone drags them. `drift`: the computer moves them. */
  motion: typeof motions[number];
  /** Drift amplitude, % of the visible desktop's smaller side. */
  amplitude: number;
  /** Seconds for one drift cycle. */
  period: number;
  /** Network: chance per update that someone leaves and a newcomer arrives, %. */
  turnover: number;
  /** Pattern for `scatter` and drift phases. */
  seed: number;
  clearFirst: boolean;
};

export const defaults: Settings = { form: 'network', count: 2, arrangement: 'row', tileWidth: 34, tileHeight: 58, range: 120, fill: 'green-red', motion: 'still', amplitude: 16, period: 14, turnover: 6, seed: 1, clearFirst: true };

export const ranges = {
  count: [2, 8, 1],
  tileWidth: [12, 48, 1],
  tileHeight: [16, 70, 1],
  range: [10, 120, 1],
  amplitude: [0, 40, 1],
  period: [3, 60, 1],
  turnover: [2, 30, 1],
  seed: [1, 9999, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

/** `green-red` is the reference palette; `pink-red` matches primitives/1. */
export const palettes: Record<Settings['fill'], readonly string[]> = {
  'green-red': ['#2bd97c', '#ff2a3d', '#3aa0ff', '#ffb02e'],
  'pink-red': ['#ff2e93', '#ff1a2e', '#ff7ac1', '#c4002a'],
};

export function colorAt(fill: Settings['fill'], index: number) {
  return palettes[fill][index % palettes[fill].length];
}

const choices = { form: forms, arrangement: arrangements, motion: motions, fill: fills } as const;

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
