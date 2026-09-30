import assert from "node:assert/strict";
import test from "node:test";
import {
  DRIVE_PERIOD,
  SWEEP_CYCLE_MODEL_TIME,
  SWEEP_FROM,
  SWEEP_TO,
  driveAmplitudeAt,
  stepDuffing,
  sweepProfile,
  type DuffingPhaseState,
} from "./sweep.ts";

function stroboscopicPeriod(gamma: number, initial: DuffingPhaseState) {
  const stepsPerCycle = 200;
  const step = DRIVE_PERIOD / stepsPerCycle;
  let state = initial;
  const samples: DuffingPhaseState[] = [];
  for (let cycle = 0; cycle < 364; cycle += 1) {
    for (let index = 0; index < stepsPerCycle; index += 1) state = stepDuffing(state, gamma, step);
    if (cycle >= 300) samples.push(state);
  }
  for (let period = 1; period <= 16; period += 1) {
    const repeats = samples.every((sample, index) => {
      const later = samples[index + period];
      return !later || Math.hypot(sample.displacement - later.displacement, sample.velocity - later.velocity) < 1e-3;
    });
    if (repeats) return period;
  }
  return null;
}

test("the sweep rests at both ends and changes continuously", () => {
  assert.equal(driveAmplitudeAt(0), SWEEP_FROM);
  assert.ok(Math.abs(driveAmplitudeAt(SWEEP_CYCLE_MODEL_TIME * 0.54) - SWEEP_TO) < 1e-12);
  for (let fraction = 0; fraction < 1; fraction += 0.001) {
    assert.ok(Math.abs(sweepProfile(fraction + 0.001) - sweepProfile(fraction)) < 0.01);
  }
});

test("the sweep passes through the whole documented route", () => {
  const seed = { displacement: 1, velocity: 0, phase: 0 };
  const route = [[0.2, 1], [0.28, 2], [0.29, 4], [0.37, 5], [0.5, null], [0.65, 2]] as const;
  for (const [gamma, period] of route) {
    assert.ok(gamma > SWEEP_FROM && gamma < SWEEP_TO);
    assert.equal(stroboscopicPeriod(gamma, seed), period, `γ ${gamma}`);
  }
});

test("the sweep is slow compared with the oscillator's settling time", () => {
  // Damping 0.3 settles a transient in about 1/0.15 ≈ 7 model-time units.
  // The steepest drift should change γ by less than 0.02 over that time.
  let steepest = 0;
  for (let time = 0; time < SWEEP_CYCLE_MODEL_TIME; time += 1) {
    steepest = Math.max(steepest, Math.abs(driveAmplitudeAt(time + 7) - driveAmplitudeAt(time)));
  }
  assert.ok(steepest < 0.02, `steepest change ${steepest}`);
});
