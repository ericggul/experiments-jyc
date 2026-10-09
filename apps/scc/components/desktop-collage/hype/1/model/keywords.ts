import { chance, weighted, type Random } from './random.ts';

// The keyword and what it pulls behind it. Weights rise when a derived
// keyword is read in a window and relax back toward their base, so the
// chain follows the material and drifts home to the root.

export const roots = ['AI'] as const;
export type Root = typeof roots[number];

const derived: Record<Root, readonly (readonly [string, number])[]> = {
  AI: [
    ['AGI', 0.9], ['generative AI', 0.8], ['LLM', 0.8], ['OpenAI', 0.8], ['ChatGPT', 0.7], ['NVIDIA', 0.7], ['AI agents', 0.7],
    ['Sam Altman', 0.6], ['GPU', 0.6], ['xAI', 0.6], ['physical AI', 0.5], ['AI bubble', 0.5], ['Anthropic', 0.5], ['Jensen Huang', 0.5],
    ['superintelligence', 0.5], ['machine learning', 0.5], ['Eric Schmidt', 0.4], ['semiconductors', 0.4], ['deep learning', 0.4], ['neural network', 0.4],
  ],
};

/** Share of draws that return the root itself. */
const ROOT_SHARE = 0.3;
const CAP = 3;
/** Seconds for a raised weight to fall back by 1/e. */
const RELAX = 40;

export type Chain = { root: Root; base: Map<string, number>; weights: Map<string, number> };

export function createChain(root: Root): Chain {
  const base = new Map(derived[root]);
  return { root, base, weights: new Map(base) };
}

export const derivedKeywords = (chain: Chain) => [...chain.base.keys()];

export function draw(chain: Chain, random: Random): string {
  if (chance(random, ROOT_SHARE)) return chain.root;
  return weighted(random, derivedKeywords(chain), keyword => chain.weights.get(keyword) ?? 0);
}

export function raise(chain: Chain, keyword: string, amount = 0.6) {
  if (!chain.base.has(keyword)) return;
  chain.weights.set(keyword, Math.min(CAP, (chain.weights.get(keyword) ?? 0) + amount));
}

export function decay(chain: Chain, seconds: number) {
  const factor = Math.exp(-seconds / RELAX);
  for (const [keyword, base] of chain.base) {
    const weight = chain.weights.get(keyword) ?? base;
    chain.weights.set(keyword, base + (weight - base) * factor);
  }
}

/** The derived keywords mentioned in a text, longest first. */
export function mentioned(chain: Chain, text: string): string[] {
  const lower = text.toLowerCase();
  return derivedKeywords(chain).filter(keyword => lower.includes(keyword.toLowerCase())).sort((a, b) => b.length - a.length);
}
