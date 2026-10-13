import { faces, type Face } from "./fonts";

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Each column draws a face uniformly at random without replacement (a Fisher–Yates shuffled deck, reshuffled once
 * it runs out). Draws are sequential from one seed, so more columns keep the faces the first ones had.
 */
export function castColumns(seed: number, count: number): Face[] {
  const random = mulberry32(seed);
  let order: Face[] = [];
  return Array.from({ length: count }, () => {
    if (order.length === 0) {
      order = [...faces];
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
    }
    return order.pop()!;
  });
}
