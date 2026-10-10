import { chance, weighted, type Random } from './random.ts';

// The keyword and the fears it pulls behind it. Weights only matter for the
// draw here: there is no reader to raise them.

export const roots = ['AI'] as const;
export type Root = typeof roots[number];

const derived: Record<Root, readonly (readonly [string, number])[]> = {
  AI: [
    ['AI jobs', 1], ['AI stocks', 1], ['AI layoffs', 0.8], ['learn AI', 0.8], ['CS graduates', 0.8], ['AGI 2027', 0.6],
    ['AI bubble', 0.6], ['NVIDIA', 0.6], ['AI tools', 0.5], ['prompt engineering', 0.4], ['AI 자격증', 0.4], ['AI 수혜주', 0.6], ['AI 대체 직업', 0.6],
  ],
};

/** Share of draws that return the root itself. */
const ROOT_SHARE = 0.15;

export type Chain = { root: Root; weights: Map<string, number> };

export function createChain(root: Root): Chain {
  return { root, weights: new Map(derived[root]) };
}

export const derivedKeywords = (chain: Chain) => [...chain.weights.keys()];

export function draw(chain: Chain, random: Random): string {
  if (chance(random, ROOT_SHARE)) return chain.root;
  return weighted(random, derivedKeywords(chain), keyword => chain.weights.get(keyword) ?? 0);
}
