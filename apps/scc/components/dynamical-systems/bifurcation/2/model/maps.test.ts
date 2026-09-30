import assert from "node:assert/strict";
import test from "node:test";
import { MAP_SYSTEMS, isMapSystemId, settledPeriod } from "./maps.ts";

function system(id: string) {
  const found = MAP_SYSTEMS.find((candidate) => candidate.id === id);
  assert.ok(found);
  return found;
}

test("the field selects four explicitly configured one-dimensional maps", () => {
  assert.deepEqual(
    MAP_SYSTEMS.map((candidate) => candidate.id),
    ["logistic", "sine", "ricker", "gauss"],
  );
  for (const candidate of MAP_SYSTEMS) {
    assert.ok(candidate.parameterRange[0] < candidate.parameterRange[1]);
    assert.ok(candidate.stateRange[0] < candidate.stateRange[1]);
    assert.ok(candidate.seedRange[0] >= candidate.stateRange[0]);
    assert.ok(candidate.seedRange[1] <= candidate.stateRange[1]);
    assert.match(candidate.mapWgsl, /fn mapNext\(x: f32, r: f32\) -> f32/);
  }
  assert.ok(isMapSystemId("ricker"));
  assert.ok(!isMapSystemId("henon"));
});

test("every map begins its window at one settled state", () => {
  for (const candidate of MAP_SYSTEMS) {
    assert.equal(settledPeriod(candidate, candidate.parameterRange[0]), 1, candidate.id);
  }
});

test("each window crosses the period-doubling cascade into chaos", () => {
  const cascades = {
    logistic: [[2.9, 1], [3.2, 2], [3.5, 4], [3.9, null]],
    sine: [[0.7, 1], [0.8, 2], [0.85, 4], [0.97, null]],
    ricker: [[1.9, 1], [2.3, 2], [2.6, 4], [3.3, null]],
    gauss: [[-0.95, 1], [-0.83, 2], [-0.745, 4], [-0.5, null], [-0.1, 2], [0.6, 1]],
  } as const;

  for (const [id, expectations] of Object.entries(cascades)) {
    for (const [parameter, period] of expectations) {
      assert.equal(settledPeriod(system(id), parameter), period, `${id} at ${parameter}`);
    }
  }
});

test("settled orbits never leave the visible state interval", () => {
  for (const candidate of MAP_SYSTEMS) {
    const [minimum, maximum] = candidate.stateRange;
    for (let step = 0; step <= 60; step += 1) {
      const parameter = candidate.parameterRange[0] +
        (candidate.parameterRange[1] - candidate.parameterRange[0]) * step / 60;
      for (const seed of [candidate.seedRange[0], candidate.seedRange[1], 0.37]) {
        let state = seed;
        for (let iteration = 0; iteration < 600; iteration += 1) {
          state = candidate.next(state, parameter);
          if (iteration > 40) {
            assert.ok(state >= minimum - 1e-9 && state <= maximum + 1e-9, `${candidate.id} ${parameter} ${state}`);
          }
        }
      }
    }
  }
});
