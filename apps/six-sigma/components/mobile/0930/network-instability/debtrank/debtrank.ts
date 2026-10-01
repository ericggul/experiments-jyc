import type { Impact, Institution } from "./network.ts";

/**
 * DebtRank (Battiston et al. 2012, eqs. 1–3). Each institution is
 * Undistressed, Distressed, or Inactive. A distressed institution passes its
 * distress along its impact links exactly once, then becomes inactive, so
 * cycles cannot count the same loss twice. `W[i→j]` is the share of j's
 * equity lost when i defaults.
 */
export type Round = { levels: number[]; transfers: Map<string, number> };

export function cascade(institutions: readonly Institution[], impacts: readonly Impact[], origin: number, initial = 1) {
  const count = institutions.length;
  let levels = Array<number>(count).fill(0);
  let state = Array<"U" | "D" | "I">(count).fill("U");
  levels[origin] = initial;
  state[origin] = "D";
  const rounds: Round[] = [{ levels: [...levels], transfers: new Map() }];

  while (state.includes("D")) {
    const transfers = new Map<string, number>();
    const next = [...levels];
    for (const impact of impacts) {
      if (state[impact.from] !== "D" || state[impact.to] === "I") continue;
      const amount = impact.weight * levels[impact.from];
      transfers.set(impact.id, amount);
      next[impact.to] = Math.min(1, next[impact.to] + amount);
    }
    state = state.map((current, id) => current === "D" ? "I" : current === "U" && next[id] > 0 ? "D" : current);
    levels = next;
    rounds.push({ levels: [...levels], transfers });
  }

  const reach = levels.reduce((sum, level, id) => sum + level * institutions[id].value, 0);
  return { rounds, debtRank: reach - initial * institutions[origin].value };
}

export const debtRanks = (institutions: readonly Institution[], impacts: readonly Impact[]) =>
  institutions.map(({ id }) => cascade(institutions, impacts, id).debtRank);
