import assert from "node:assert/strict";
import test from "node:test";
import {
  DUFFING_REGIMES,
  isDuffingRegimeId,
  potential,
  stroboscopicPeriod,
  stroboscopicSamples,
  tiltedPotential,
} from "./regimes.ts";

test("the double-well landscape has wells at ±1 and a hump at 0", () => {
  assert.equal(potential(0), 0);
  assert.equal(potential(1), -0.25);
  assert.equal(potential(-1), -0.25);
  assert.ok(Math.abs(tiltedPotential(1, 0, 0.5) - (-0.75)) < 1e-12);
  assert.ok(Math.abs(tiltedPotential(1, Math.PI, 0.5) - 0.25) < 1e-12);
});

test("each drive strength settles into its documented response", () => {
  const seeds = [
    { displacement: 1, velocity: 0, phase: 0 },
    { displacement: -1, velocity: 0, phase: 0 },
    { displacement: 0.5, velocity: 0.5, phase: 0 },
  ];
  for (const regime of DUFFING_REGIMES) {
    for (const seed of seeds) {
      assert.equal(
        stroboscopicPeriod(regime.driveAmplitude, seed),
        regime.expectedPeriod,
        `${regime.label} from ${seed.displacement}`,
      );
    }
  }
  assert.ok(isDuffingRegimeId("gamma-050"));
  assert.ok(!isDuffingRegimeId("gamma-100"));
});

test("the weakest drive keeps two separate answers, one per well", () => {
  const right = stroboscopicSamples(0.2, { displacement: 1, velocity: 0, phase: 0 });
  const left = stroboscopicSamples(0.2, { displacement: -1, velocity: 0, phase: 0 });
  assert.ok(right.every((sample) => sample.displacement > 0));
  assert.ok(left.every((sample) => sample.displacement < 0));
});
