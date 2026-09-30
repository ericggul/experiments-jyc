import { fractionValue, type Link } from "./configurations.ts";

/**
 * Spectral radius λmax of a non-negative link matrix. Gelfand's formula
 * (growth of ‖Aᵏx‖ averaged over many steps) also handles periodic cycles and
 * acyclic panels, where plain power iteration would oscillate or vanish.
 */
export function spectralRadius(links: readonly Link[], omega = 1) {
  const ids = [...new Set(links.flatMap(({ from, to }) => [from, to]))];
  const index = new Map(ids.map((id, position) => [id, position]));
  let vector = ids.map(() => 1);
  let logGrowth = 0;
  const burnIn = 400;
  const steps = 1600;
  for (let step = 0; step < burnIn + steps; step++) {
    const next = ids.map(() => 0);
    for (const link of links) next[index.get(link.to)!] += omega * fractionValue(link.weight) * vector[index.get(link.from)!];
    const norm = Math.hypot(...next);
    if (norm < 1e-300) return 0;
    if (step >= burnIn) logGrowth += Math.log(norm);
    vector = next.map((value) => value / norm);
  }
  return Math.exp(logGrowth / steps);
}
