import assert from "node:assert/strict";
import test from "node:test";
import { createPacer, midiOf, scale, stepOf } from "./pitch.ts";

test("the scale is C major pentatonic from C4 to C7, rising bottom to top", () => {
  assert.equal(scale.length, 16);
  assert.equal(midiOf(0), 60);
  assert.equal(midiOf(1), 96);
  assert.ok(scale.every((note) => [0, 2, 4, 7, 9].includes(note % 12)));
  for (let index = 1; index < scale.length; index += 1) assert.ok(scale[index] > scale[index - 1]);
  assert.equal(stepOf(-1), 0);
  assert.equal(stepOf(2), 15);
});

test("no two scale notes form a semitone or tritone", () => {
  for (const a of scale) for (const b of scale) assert.ok(![1, 6, 11].includes(Math.abs(a - b) % 12));
});

test("simultaneous notes are spaced into a short run and the overflow is dropped", () => {
  const pace = createPacer(0.03, 0.1);
  assert.equal(pace(1), 1);
  assert.ok(Math.abs(pace(1) - 1.03) < 1e-9);
  assert.ok(Math.abs(pace(1) - 1.06) < 1e-9);
  assert.ok(Math.abs(pace(1) - 1.09) < 1e-9);
  assert.equal(pace(1), null);
  assert.equal(pace(2), 2);
});
