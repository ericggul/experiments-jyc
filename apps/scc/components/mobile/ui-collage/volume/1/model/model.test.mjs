import assert from "node:assert/strict";
import test from "node:test";
import { bandBins, bandLevel, ceilingDb, floorDb, glide, meter, smoothTime } from "./bands.ts";
import { columnLeft, layoutFor } from "./layout.ts";
import { displayLeadMs, shownWord, wordAt } from "./lyrics.ts";

test("columns fill the viewport edge to edge", () => {
  for (const width of [12, 16, 20, 28]) {
    const layout = layoutFor({ left: 0, top: 0, right: 390, bottom: 844 }, width);
    assert.ok(Math.abs(columnLeft(layout, layout.count - 1) + width - 390) < 1e-9);
    assert.ok(layout.gap >= Math.max(2, Math.round(width / 8)));
  }
});

test("bands run low to high, cover every column, and never go backwards", () => {
  const edges = bandBins(24, 1024, 48_000);
  for (let column = 0; column < 24; column += 1) {
    assert.ok(edges[column * 2 + 1] > edges[column * 2]);
    if (column > 0) assert.ok(edges[column * 2] >= edges[column * 2 - 2]);
  }
  assert.ok(edges[47] <= 1024);
});

test("levels map decibels to 0–1 and the meter rises at once, falls slowly", () => {
  const silent = new Float32Array(8).fill(-140);
  assert.equal(bandLevel(silent, 0, 8, 10, 24), 0);
  const loud = new Float32Array(8).fill(0);
  assert.equal(bandLevel(loud, 0, 8, 10, 24), 1);
  assert.ok(floorDb < ceilingDb);
  const levels = new Float32Array([0, 0.8]);
  meter(levels, new Float32Array([0.9, 0]), 1 / 60);
  assert.ok(Math.abs(levels[0] - 0.9) < 1e-6);
  assert.ok(levels[1] < 0.8 && levels[1] > 0.7);
  assert.equal(meter(levels, null, 10), false);
});

test("every column shows the word being sung, the first before the song and the last after it", () => {
  const words = [0, 300, 900, 1_500].map((startMs, index) => ({ text: `w${index}`, startMs: startMs + 100 }));
  assert.equal(wordAt(words, 50), -1);
  assert.equal(wordAt(words, 100), 0);
  assert.equal(wordAt(words, 999), 1);
  assert.equal(shownWord(words, 0), 0);
  assert.equal(shownWord(words, 1_000), 2);
  // The word changes one display refresh before its onset.
  assert.equal(shownWord(words, 1_000 - displayLeadMs - 1), 1);
  assert.equal(shownWord(words, 1_000 - displayLeadMs), 2);
  assert.equal(shownWord(words, 99_999), 3);
});

test("부드럽게 eases a level toward its band without overshoot, then rests", () => {
  const levels = new Float32Array([0]);
  const velocity = new Float32Array([0]);
  const raw = new Float32Array([0.8]);
  let previous = 0;
  for (let frame = 0; frame < 60 * smoothTime * 6; frame += 1) {
    glide(levels, velocity, raw, 1 / 60);
    assert.ok(levels[0] >= previous - 1e-6 && levels[0] <= 0.8 + 1e-6);
    previous = levels[0];
  }
  assert.ok(Math.abs(levels[0] - 0.8) < 0.01);
  for (let frame = 0; frame < 120; frame += 1) glide(levels, velocity, raw, 1 / 60);
  assert.equal(glide(levels, velocity, raw, 1 / 60), false);
});
