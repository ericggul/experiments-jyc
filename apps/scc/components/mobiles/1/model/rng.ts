/** 32-bit string hash (FNV-1a). */
export function hash(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const char of parts.join(":")) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded generator (mulberry32) with the helpers the model needs. */
export function createRng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    /** Standard normal via Box–Muller. */
    normal: (mean = 0, sd = 1) => {
      const u = Math.max(next(), 1e-12);
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    weighted: <T>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let target = next() * total;
      for (const [value, weight] of entries) {
        target -= weight;
        if (target <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
  return rng;
}

export type Rng = ReturnType<typeof createRng>;
