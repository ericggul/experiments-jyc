import assert from "node:assert/strict";
import test from "node:test";
import { impacts, institutions } from "./network.ts";
import { LOOP_GAIN, createStress, propagate, shock, spectralRadius } from "./stress.ts";

const beta = LOOP_GAIN / spectralRadius(institutions.length, impacts);
const run = (state) => { for (let round = 0; round < 200; round++) propagate(state, impacts, beta); return state; };

test("scaled loop gain is exactly LOOP_GAIN", () => {
  const scaled = impacts.map((impact) => ({ ...impact, weight: impact.weight * beta }));
  assert.ok(Math.abs(spectralRadius(institutions.length, scaled) - LOOP_GAIN) < 1e-3);
});

const defaults = (state) => state.defaulted.filter(Boolean).length;
const common = (state, amount) => institutions.forEach(({ id }) => shock(state, id, amount));

test("a mild common shock and two idiosyncratic hits each fade alone but cascade together", () => {
  const mild = createStress(22);
  common(mild, 0.06);
  assert.equal(defaults(run(mild)), 0);
  for (const id of [0, 5]) {
    const alone = createStress(22);
    shock(alone, id, 0.3);
    assert.equal(defaults(run(alone)), 0);
  }
  const together = createStress(22);
  common(together, 0.06);
  shock(together, 0, 0.3);
  shock(together, 5, 0.3);
  assert.ok(defaults(run(together)) > 0);
});

test("a strong common shock alone cascades; distress never exceeds default", () => {
  const state = createStress(22);
  common(state, 0.12);
  run(state);
  assert.ok(defaults(state) >= 5);
  assert.ok(state.level.every((level) => level <= 1));
});
