import type { Language } from "./languages";

/**
 * Row-stochastic transition matrix. Off-diagonal affinity grows with shared
 * family, shared script and geographic proximity, so a unit mostly drifts to
 * a related language and occasionally jumps across the map.
 */
export function buildTransitions(languages: readonly Language[], persistence: number) {
  const count = languages.length;
  const matrix = new Float64Array(count * count);
  const radians = Math.PI / 180;
  for (let from = 0; from < count; from++) {
    const a = languages[from];
    let total = 0;
    for (let to = 0; to < count; to++) {
      if (to === from) continue;
      const b = languages[to];
      const cosine = Math.sin(a.lat * radians) * Math.sin(b.lat * radians) +
        Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.cos((a.lon - b.lon) * radians);
      const kilometres = 6371 * Math.acos(Math.min(1, Math.max(-1, cosine)));
      const weight = 0.15 + (a.family === b.family ? 3 : 0) + (a.script === b.script ? 1.2 : 0) + 2.5 * Math.exp(-kilometres / 2500);
      matrix[from * count + to] = weight;
      total += weight;
    }
    for (let to = 0; to < count; to++) {
      matrix[from * count + to] = to === from ? persistence : (matrix[from * count + to] / total) * (1 - persistence);
    }
  }
  return matrix;
}

/**
 * One autonomous step: the unit's own row, mixed with the empirical language
 * distribution of its spatial neighbours by `coupling` (0 = independent
 * chains, 1 = voter model).
 */
export function nextState(
  matrix: Float64Array,
  count: number,
  current: number,
  neighbours: readonly number[],
  coupling: number,
  random: number,
) {
  const share = neighbours.length ? coupling / neighbours.length : 0;
  const own = neighbours.length ? 1 - coupling : 1;
  let threshold = random;
  for (let to = 0; to < count; to++) {
    let probability = own * matrix[current * count + to];
    if (share) for (const state of neighbours) if (state === to) probability += share;
    threshold -= probability;
    if (threshold <= 0) return to;
  }
  return current;
}
