import assert from "node:assert/strict";
import test from "node:test";
import { createMotion } from "./motion.ts";

/** A seeded uniform generator (mulberry32), so runs are repeatable. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test("the factor stays within ×0.3–×12 and reaches both halves of the range", () => {
  const motion = createMotion({ random: seeded(7) });
  let low = Infinity;
  let high = -Infinity;
  for (let frame = 0; frame < 60 * 300; frame++) {
    const factor = motion.step(1 / 60);
    low = Math.min(low, factor);
    high = Math.max(high, factor);
  }
  assert.ok(low >= 0.3 - 1e-9 && high <= 12 + 1e-9, `${low}…${high}`);
  assert.ok(low < 0.8 && high > 4.5, `range used: ${low}…${high}`);
});

test("it is continuous: one frame never moves it by more than a few percent", () => {
  const motion = createMotion({ random: seeded(3) });
  let previous = motion.step(1 / 60);
  for (let frame = 0; frame < 60 * 120; frame++) {
    const factor = motion.step(1 / 60);
    assert.ok(Math.abs(Math.log(factor / previous)) < 0.12, `${previous} → ${factor}`);
    previous = factor;
  }
});

test("it does not repeat: two seeds give different curves", () => {
  const a = createMotion({ random: seeded(1) });
  const b = createMotion({ random: seeded(2) });
  let difference = 0;
  for (let frame = 0; frame < 600; frame++) difference += Math.abs(a.step(1 / 60) - b.step(1 / 60));
  assert.ok(difference > 10);
});
