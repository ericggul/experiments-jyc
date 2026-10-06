import assert from "node:assert/strict";
import test from "node:test";
import { QUALITY_LEVELS, createPacer, pace } from "./pacing.ts";

function feed(pacer: ReturnType<typeof createPacer>, frames: number, gap: number, start: number) {
  let now = start;
  for (let i = 0; i < frames; i += 1) {
    now += gap;
    pace(pacer, now);
  }
  return now;
}

test("on-time 60 Hz frames render every vsync at full quality", () => {
  const pacer = createPacer();
  feed(pacer, 600, 1000 / 60, 0);
  assert.equal(pacer.level, 0);
  assert.ok(Math.abs(pacer.refresh - 1000 / 60) < 0.5);
});

test("late frames step quality down, ending at even half-rate pacing", () => {
  const pacer = createPacer();
  let now = feed(pacer, 120, 1000 / 60, 0);
  now = feed(pacer, 400, 40, now);
  assert.equal(pacer.level, QUALITY_LEVELS.length - 1);
  assert.equal(QUALITY_LEVELS[pacer.level].everyOther, true);
  void now;
});

test("quality recovers once frames are on time again", () => {
  const pacer = createPacer();
  let now = feed(pacer, 120, 1000 / 60, 0);
  now = feed(pacer, 60, 40, now);
  const dropped = pacer.level;
  assert.ok(dropped > 0);
  feed(pacer, 2000, 1000 / 60, now);
  assert.ok(pacer.level < dropped, `level ${pacer.level}`);
});

test("120 Hz displays are followed, not mistaken for slowness", () => {
  const pacer = createPacer();
  feed(pacer, 600, 1000 / 120, 0);
  assert.equal(pacer.level, 0);
  assert.ok(pacer.refresh < 9);
});
