export type Word = { text: string; startMs: number };

/** Index of the word being sung at `ms` (the last one started), or −1 before the first. */
export function wordAt(words: readonly Word[], ms: number) {
  let low = 0;
  let high = words.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (words[middle]!.startMs <= ms) {
      found = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

/** A frame reaches the screen about one refresh after it is drawn, so the word changes that much early. */
export const displayLeadMs = 16;

/** The word every column shows: the one being sung, the first before the song starts, the last after it ends. */
export function shownWord(words: readonly Word[], ms: number) {
  return Math.max(0, Math.min(words.length - 1, wordAt(words, ms + displayLeadMs)));
}
