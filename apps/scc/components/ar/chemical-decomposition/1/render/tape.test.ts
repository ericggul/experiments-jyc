import assert from "node:assert/strict";
import test from "node:test";
import { buildTape, itemsInRun, pickFormula, rowRuns, slotRandom } from "./tape.ts";

test("runs split a row where the region changes", () => {
  const runs = rowRuns(100, 10, (x) => (x < 45 ? 0 : 1));
  assert.deepEqual(runs.map(({ start, end, region }) => [start, end, region]), [[0, 40, 0], [40, 100, 1]]);
});

test("picks follow cumulative shares", () => {
  const cumulative = Float64Array.from([0.75, 0.98, 1]);
  const counts = new Map<string, number>();
  for (let slot = 0; slot < 20000; slot += 1) {
    const formula = pickFormula(["H2O", "CO2", "Ar"], cumulative, slotRandom(3, slot, 7));
    counts.set(formula, (counts.get(formula) ?? 0) + 1);
  }
  assert.ok(Math.abs((counts.get("H2O") ?? 0) / 20000 - 0.75) < 0.02);
  assert.ok(Math.abs((counts.get("Ar") ?? 0) / 20000 - 0.02) < 0.01);
});

test("a moving edge never moves the formulas that stay inside", () => {
  const tape = buildTape(2, 5, ["H2O", "CO2"], Float64Array.from([0.5, 1]), (formula) => formula.length * 7, -13, 400, 6);
  const wide = itemsInRun(tape, { start: 0, end: 400, region: 0 });
  const narrow = itemsInRun(tape, { start: 0, end: 250, region: 0 });
  assert.deepEqual(narrow, wide.filter((item) => item.x + item.width <= 250));
});
