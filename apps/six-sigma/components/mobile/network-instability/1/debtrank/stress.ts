import type { Impact } from "./network.ts";

/**
 * Many shocks at once. Every round, each institution's *new* distress passes
 * along its links (j loses β · W[i→j] of i's new distress), while shocks keep
 * arriving: small idiosyncratic hits to random institutions, and now and then
 * a common shock to all of them together. Overlapping losses add up, capped at
 * h = 1 (default). Reaching default releases a further loss onto the
 * defaulter's creditors (fire sales, cancelled contracts), which is what
 * lets overlapping shocks do more together than apart. Banks recover between shocks. β scales the paper's impact
 * weights so the network's loop gain λmax is `LOOP_GAIN`: below 1, so any
 * one shock fades, but close enough that overlapping shocks pile up.
 */
export const LOOP_GAIN = 0.85;
export const RECOVERY_HALF_LIFE = 1.8;
/** Extra distress a bank passes on in the round it defaults. */
export const DEFAULT_RELEASE = 0.5;
/** A defaulted bank can default again only after recovering below this level. */
const REARM = 0.5;

export type Stress = { level: number[]; fresh: number[]; defaulted: boolean[] };

export const createStress = (count: number): Stress => ({
  level: Array(count).fill(0), fresh: Array(count).fill(0), defaulted: Array(count).fill(false),
});

function add(state: Stress, id: number, amount: number) {
  const added = Math.min(1 - state.level[id], amount);
  state.level[id] += added;
  let passed = added;
  if (!state.defaulted[id] && state.level[id] >= 1 - 1e-9) {
    state.defaulted[id] = true;
    passed += DEFAULT_RELEASE;
  }
  return passed;
}

/** Spectral radius by Gelfand's formula; handles cycles and acyclic graphs alike. */
export function spectralRadius(count: number, impacts: readonly Impact[]) {
  let vector = Array<number>(count).fill(1);
  let logGrowth = 0;
  const burnIn = 200;
  const steps = 800;
  for (let step = 0; step < burnIn + steps; step++) {
    const next = Array<number>(count).fill(0);
    for (const { from, to, weight } of impacts) next[to] += weight * vector[from];
    const norm = Math.hypot(...next);
    if (norm < 1e-300) return 0;
    if (step >= burnIn) logGrowth += Math.log(norm);
    vector = next.map((value) => value / norm);
  }
  return Math.exp(logGrowth / steps);
}

export function shock(state: Stress, id: number, amount: number) {
  state.fresh[id] += add(state, id, amount);
}

/** One round of simultaneous propagation. Returns the distress each link carried. */
export function propagate(state: Stress, impacts: readonly Impact[], beta: number) {
  const transfers = new Map<string, number>();
  const incoming = Array<number>(state.level.length).fill(0);
  for (const impact of impacts) {
    const amount = beta * impact.weight * state.fresh[impact.from];
    if (amount <= 0) continue;
    transfers.set(impact.id, amount);
    incoming[impact.to] += amount;
  }
  state.fresh = incoming.map((amount, id) => add(state, id, amount));
  return transfers;
}

export function recover(state: Stress, seconds: number) {
  const factor = Math.pow(0.5, seconds / RECOVERY_HALF_LIFE);
  state.level = state.level.map((level) => level * factor);
  state.defaulted = state.defaulted.map((defaulted, id) => defaulted && state.level[id] >= REARM);
}

/** Value-weighted distress of the whole system, 0–1. */
export const systemDistress = (state: Stress, values: readonly number[]) =>
  state.level.reduce((sum, level, id) => sum + level * values[id], 0);
