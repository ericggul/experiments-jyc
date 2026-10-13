import { pools, type Face, type Script } from "./fonts";
import { words } from "./words";

export type Language = "en" | "multi";

/** What one column says and in which face. */
export type Line = { text: string; face: Face };

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

/** Uniform draws without replacement: a Fisher–Yates shuffled deck, reshuffled once it runs out. */
function deck<T>(items: readonly T[], random: () => number) {
  let order: T[] = [];
  return () => {
    if (order.length === 0) {
      order = [...items];
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
    }
    return order.pop()!;
  };
}

/**
 * Each column draws a face at random from its script's pool (and, in 다국어, a language at random first).
 * Draws are sequential from one seed, so more columns keep the faces the first ones had.
 */
export function castColumns(seed: number, count: number, language: Language): Line[] {
  const random = mulberry32(seed);
  const faceDecks = new Map<Script, () => Face>();
  const drawFace = (script: Script) => {
    let draw = faceDecks.get(script);
    if (!draw) faceDecks.set(script, (draw = deck(pools[script], random)));
    return draw();
  };
  const drawWord = deck(words, random);
  const english = words[0]!;
  return Array.from({ length: count }, () => {
    const word = language === "multi" ? drawWord() : english;
    return { text: word.text, face: drawFace(word.script) };
  });
}
