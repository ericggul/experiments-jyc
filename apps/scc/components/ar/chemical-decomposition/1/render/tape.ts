// Lettering layout. Each text row holds, per material, an endless tape of
// formulas drawn by mass share and fixed in screen position; a region only
// reveals the part of its material's tape that lies inside it. Unchanged
// regions therefore keep every formula exactly where it was, and a moving
// edge hides or reveals whole formulas instead of reflowing the row.

export type Run = { start: number; end: number; region: number };

export type TapeItem = { x: number; width: number; formula: string };

/** Splits one row into runs of the same region, sampled every `step`. */
export function rowRuns(width: number, step: number, regionAt: (x: number) => number): Run[] {
  const runs: Run[] = [];
  let current: Run | null = null;
  for (let x = 0; x < width; x += step) {
    const region = regionAt(Math.min(width - 1, x + step / 2));
    if (current && current.region === region) {
      current.end = Math.min(width, x + step);
    } else {
      current = { start: x, end: Math.min(width, x + step), region };
      runs.push(current);
    }
  }
  return runs;
}

/** Deterministic 0–1 value per (row, slot, material). */
export function slotRandom(row: number, slot: number, salt: number) {
  let h = Math.imul(row + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(slot + 0x27d4eb2f, 0xc2b2ae35) ^ Math.imul(salt + 0x165667b1, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Picks a formula from cumulative shares. */
export function pickFormula(formulas: readonly string[], cumulative: Float64Array, value: number) {
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (cumulative[middle] < value) low = middle + 1;
    else high = middle;
  }
  return formulas[low];
}

export function buildTape(
  row: number,
  salt: number,
  formulas: readonly string[],
  cumulative: Float64Array,
  measure: (formula: string) => number,
  start: number,
  end: number,
  gap: number,
): TapeItem[] {
  const items: TapeItem[] = [];
  let x = start;
  for (let slot = 0; x < end; slot += 1) {
    const formula = pickFormula(formulas, cumulative, slotRandom(row, slot, salt));
    const width = measure(formula);
    items.push({ x, width, formula });
    x += width + gap;
  }
  return items;
}

/** The tape's items that lie wholly inside a run. */
export function itemsInRun(tape: readonly TapeItem[], run: Run) {
  return tape.filter((item) => item.x >= run.start && item.x + item.width <= run.end);
}
