import { fractionValue, type Link, type NodeId } from "./configurations.ts";

/**
 * Distress h ∈ [0, 1] per bank, after DebtRank (Battiston et al. 2012) with
 * Bardoscia et al.'s repeated propagation: each round, the new distress of a
 * bank passes to its neighbours along its links, scaled by ω · weight. With
 * λmax < 1 a shock dies out; above 1 it returns stronger around the loops
 * until banks reach h = 1 (default).
 */
/** Size of one shock: small enough that no bank defaults while λmax < 1 at ω = 1. */
export const SHOCK = 0.08;

export type Distress = { level: Map<NodeId, number>; fresh: Map<NodeId, number> };

export const createDistress = (ids: readonly NodeId[]): Distress => ({
  level: new Map(ids.map((id) => [id, 0])),
  fresh: new Map(ids.map((id) => [id, 0])),
});

export function shock(state: Distress, id: NodeId, amount: number) {
  const level = state.level.get(id) ?? 0;
  const added = Math.min(1 - level, amount);
  state.level.set(id, level + added);
  state.fresh.set(id, (state.fresh.get(id) ?? 0) + added);
}

/** One round. Returns the distress each link carried, keyed by link id. */
export function propagate(state: Distress, links: readonly Link[], omega: number) {
  const transfers = new Map<string, number>();
  const incoming = new Map<NodeId, number>();
  for (const link of links) {
    const amount = omega * fractionValue(link.weight) * (state.fresh.get(link.from) ?? 0);
    transfers.set(link.id, amount);
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + amount);
  }
  for (const id of state.level.keys()) {
    const level = state.level.get(id)!;
    const added = Math.min(1 - level, incoming.get(id) ?? 0);
    state.level.set(id, level + added);
    state.fresh.set(id, added);
  }
  return transfers;
}

export const quiet = (state: Distress) => [...state.fresh.values()].every((value) => value < 1e-3);

/** Banks recover once propagation has stopped, so the next shock starts clean. */
export function recover(state: Distress, seconds: number, halfLife = 0.9) {
  const factor = Math.pow(0.5, seconds / halfLife);
  for (const [id, level] of state.level) state.level.set(id, level * factor);
}
