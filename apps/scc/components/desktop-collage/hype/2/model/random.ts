// Seeded randomness shared by the plan and the agent, so a run replays.

export type Random = () => number;

export function createRandom(seed: number): Random {
  let state = (seed >>> 0) || 1;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}

export const between = (random: Random, min: number, max: number) => min + random() * (max - min);

export const pick = <T>(random: Random, items: readonly T[]) => items[Math.floor(random() * items.length)];

/** Chance in [0, 1]. */
export const chance = (random: Random, p: number) => random() < p;

export function weighted<T>(random: Random, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  let r = random() * total;
  for (const item of items) {
    r -= Math.max(0, weight(item));
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** Exponentially distributed draw with the given mean. */
export const exponential = (random: Random, mean: number) => -Math.log(1 - random()) * mean;
