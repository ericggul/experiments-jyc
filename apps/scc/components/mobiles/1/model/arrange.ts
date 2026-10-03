import { createRng, hash } from "./rng.ts";
import type { Arrangement } from "./settings.ts";
import type { DayPlan, Owner } from "./types.ts";

/** Seat order for the grid: indices into `owners`. */
export function arrange(owners: readonly Owner[], plans: readonly DayPlan[], arrangement: Arrangement, seed: number): number[] {
  const order = owners.map((_, index) => index);
  if (arrangement === "random") {
    const rng = createRng(hash("seats", seed));
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }
  if (arrangement === "archetype") {
    return order.sort((a, b) => owners[a].archetype.localeCompare(owners[b].archetype) || plans[a].wake - plans[b].wake);
  }
  return order.sort((a, b) => plans[a].wake - plans[b].wake);
}
