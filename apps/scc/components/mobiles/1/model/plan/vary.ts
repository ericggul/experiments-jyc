import { variation, type Weighted } from "../personas.ts";
import { createRng } from "../rng.ts";

/**
 * Random draws scaled by sameness. Two streams run side by side: a personal
 * one (per person and day) and a canonical one (per archetype, the same every
 * day). Uniform draws blend from the canonical toward the personal value as
 * sameness falls, so at sameness 1 every person in an archetype takes the same
 * choices every day; spreads and event probabilities shrink toward zero.
 */
export function createVary(personalSeed: number, canonicalSeed: number, sameness: number) {
  const personal = createRng(personalSeed);
  const canonical = createRng(canonicalSeed);
  const spread = variation.sigma(sameness);
  const probability = variation.probability(sameness);
  const u = () => {
    const shared = canonical.next();
    return shared + (personal.next() - shared) * spread;
  };
  return {
    /** Personal stream for content that may differ even at sameness 1. */
    rng: personal,
    u,
    /** Normal draw with its sd scaled by sameness. */
    num: (mean: number, sd: number) => mean + personal.normal() * sd * spread,
    /** Whole minutes in [low, high], blended toward the archetype's choice. */
    span: (low: number, high: number) => Math.round(low + (high - low) * u()),
    /** An event with probability p, scaled toward zero by sameness. */
    chance: (p: number) => personal.next() < p * probability,
    /** A categorical habit, blended toward the archetype's choice. */
    pick: <T>(entries: Weighted<T>): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let target = u() * total;
      for (const [value, weight] of entries) {
        target -= weight;
        if (target < 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    /** Poisson waiting time with this mean; regular spacing at sameness 1. */
    interval: (mean: number) => mean * (1 - spread + spread * -Math.log(1 - personal.next())),
  };
}

export type Vary = ReturnType<typeof createVary>;
