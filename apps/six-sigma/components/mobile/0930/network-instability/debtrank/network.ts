/**
 * A 22-institution impact network shaped like DebtRank Fig. 3 (Battiston et
 * al. 2012): a densely linked core among a sparser periphery. The paper's
 * cross-holding matrix is not published, so this network is synthetic,
 * seeded, and unnamed. It borrows the figure's size and core–periphery form,
 * not its data.
 */
export type Institution = { id: number; value: number; core: boolean };
export type Impact = { id: string; from: number; to: number; weight: number };

export const INSTITUTION_COUNT = 22;
const CORE = new Set([0, 5, 9, 14, 18]);

function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) + 0.5) / 4294967296;
  };
}

function build(seed: number) {
  const next = random(seed);
  const raw = Array.from({ length: INSTITUTION_COUNT }, (_, id) => (CORE.has(id) ? 3 : 1) * Math.exp(0.6 * (next() - 0.5)));
  const total = raw.reduce((sum, value) => sum + value, 0);
  const institutions: Institution[] = raw.map((value, id) => ({ id, value: value / total, core: CORE.has(id) }));
  const impacts: Impact[] = [];
  for (const from of institutions) {
    for (const to of institutions) {
      if (from.id === to.id) continue;
      // Probability and strength of `to` holding exposure to `from`.
      const [chance, low, high] = from.core && to.core ? [0.85, 0.3, 0.7]
        : from.core ? [0.4, 0.2, 0.6]
        : to.core ? [0.25, 0.05, 0.25]
        : [0.06, 0.05, 0.25];
      if (next() < chance) impacts.push({ id: `${from.id}>${to.id}`, from: from.id, to: to.id, weight: low + (high - low) * next() });
    }
  }
  return { institutions, impacts };
}

export const { institutions, impacts } = build(20120802);
