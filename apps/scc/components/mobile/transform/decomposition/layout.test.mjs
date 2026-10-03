import assert from "node:assert/strict";
import test from "node:test";
import { layoutBins } from "./layout.ts";

test("small pieces of one category flow in a row and wrap at the frame width", () => {
  const pieces = ["a", "b", "c"].map((id) => ({ id, width: 40, height: 24 }));
  const { placements, height } = layoutBins([{ key: "like", pieces }], { width: 90, gap: 6 });
  assert.deepEqual(placements.get("a"), { x: 0, y: 0, scale: 1 });
  assert.deepEqual(placements.get("b"), { x: 46, y: 0, scale: 1 });
  assert.deepEqual(placements.get("c"), { x: 0, y: 30, scale: 1 });
  assert.equal(height, 54);
});

test("a category continues on the same line as the previous one while width remains", () => {
  const { placements, height } = layoutBins([
    { key: "time", pieces: [{ id: "a", width: 30, height: 20 }, { id: "b", width: 30, height: 20 }] },
    { key: "unit", pieces: [{ id: "c", width: 20, height: 12 }, { id: "d", width: 200, height: 12 }] },
  ], { width: 120, gap: 4 });
  assert.deepEqual(placements.get("c"), { x: 68, y: 0, scale: 1 });
  assert.deepEqual(placements.get("d"), { x: 0, y: 24, scale: 0.6 });
  assert.equal(height, 24 + 12 * 0.6);
});

test("a wide piece is scaled down to the frame", () => {
  const { placements } = layoutBins([{ key: "copy", pieces: [{ id: "a", width: 600, height: 40 }] }], { width: 300 });
  assert.equal(placements.get("a").scale, 0.5);
});

test("tall surfaces such as feed media become a grid of up to three columns", () => {
  const pieces = ["a", "b", "c", "d"].map((id) => ({ id, width: 390, height: 390, compact: true }));
  const { placements } = layoutBins([{ key: "media", pieces }], { width: 372, gap: 6 });
  assert.equal(placements.get("a").scale, 120 / 390);
  assert.equal(placements.get("c").x, 252);
  assert.equal(placements.get("d").x, 0);
  assert.equal(placements.get("d").y, 126);
});

test("text is never shrunk into a grid", () => {
  const pieces = ["a", "b"].map((id) => ({ id, width: 300, height: 80 }));
  const { placements } = layoutBins([{ key: "copy", pieces }], { width: 372 });
  assert.equal(placements.get("a").scale, 1);
  assert.equal(placements.get("b").x, 0);
});

test("a single tall surface keeps the full frame width", () => {
  const { placements } = layoutBins([{ key: "media", pieces: [{ id: "a", width: 300, height: 300, compact: true }] }], { width: 372 });
  assert.equal(placements.get("a").scale, 1);
});
