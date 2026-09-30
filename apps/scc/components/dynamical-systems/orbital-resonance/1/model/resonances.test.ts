import assert from "node:assert/strict";
import test from "node:test";
import {
  GROUP_SIZE,
  PARTICLE_COUNT,
  RESONANCE_PRESETS,
  createResonanceSeeds,
  heliocentricToRotating,
  isResonancePresetId,
  keplerToCartesian,
  osculatingPeriodRatio,
  semiMajorAxisForPeriodRatio,
  stepRotatingFrame,
  type RotatingState,
} from "./resonances.ts";

const STEP = 0.002;

function advance(state: RotatingState, duration: number, mu: number) {
  const steps = Math.round(duration / STEP);
  let current = state;
  for (let index = 0; index < steps; index += 1) {
    current = stepRotatingFrame(current, duration / steps, mu);
  }
  return current;
}

function distance(first: RotatingState, second: RotatingState) {
  return Math.hypot(
    first.position[0] - second.position[0],
    first.position[1] - second.position[1],
    first.position[2] - second.position[2],
  );
}

function seedState(periodRatio: number, mu: number): RotatingState {
  const heliocentric = keplerToCartesian({
    semiMajorAxis: semiMajorAxisForPeriodRatio(periodRatio, mu),
    eccentricity: 0.2,
    inclination: 0.03,
    node: 0.4,
    periapsis: 1.1,
    meanAnomaly: 0.7,
  }, mu);
  return heliocentricToRotating(heliocentric.position, heliocentric.velocity, mu);
}

test("four presets are configured around whole-number period ratios", () => {
  assert.deepEqual(
    RESONANCE_PRESETS.map((preset) => preset.label),
    ["2:1", "3:2", "1:1", "2:3"],
  );
  assert.ok(isResonancePresetId("three-two"));
  assert.ok(!isResonancePresetId("five-two"));
});

test("a seeded orbit has the period ratio it was built with", () => {
  for (const ratio of [1 / 2, 2 / 3, 1, 3 / 2]) {
    assert.ok(Math.abs(osculatingPeriodRatio(seedState(ratio, 0.001)) - ratio) < 1e-9);
  }
});

test("without the planet's pull, a matched orbit closes in the rotating frame", () => {
  const start = seedState(2 / 3, 0);
  const closed = advance(start, 2 * Math.PI * 2, 0);
  assert.ok(distance(start, closed) < 1e-6);

  const mismatched = seedState(2 / 3 * 1.03, 0);
  const open = advance(mismatched, 2 * Math.PI * 2, 0);
  assert.ok(distance(mismatched, open) > 0.05);
});

test("members of one group lie on the group's single rotating-frame figure", () => {
  const preset = RESONANCE_PRESETS.find((candidate) => candidate.id === "three-two");
  assert.ok(preset);
  const seeds = createResonanceSeeds(preset, 0);
  const state = (index: number): RotatingState => ({
    position: [seeds.positions[index * 3]!, seeds.positions[index * 3 + 1]!, seeds.positions[index * 3 + 2]!],
    velocity: [seeds.velocities[index * 3]!, seeds.velocities[index * 3 + 1]!, seeds.velocities[index * 3 + 2]!],
  });

  const member = 40;
  const lag = member / GROUP_SIZE * preset.closureOrbits * Math.PI * 2;
  assert.ok(distance(advance(state(member), lag, 0), state(0)) < 1e-4);
});

test("every preset seeds a finite, bound population", () => {
  for (const preset of RESONANCE_PRESETS) {
    const seeds = createResonanceSeeds(preset);
    assert.equal(seeds.positions.length, PARTICLE_COUNT * 3);
    for (let index = 0; index < PARTICLE_COUNT; index += 97) {
      const current: RotatingState = {
        position: [seeds.positions[index * 3]!, seeds.positions[index * 3 + 1]!, seeds.positions[index * 3 + 2]!],
        velocity: [seeds.velocities[index * 3]!, seeds.velocities[index * 3 + 1]!, seeds.velocities[index * 3 + 2]!],
      };
      const ratio = osculatingPeriodRatio(current);
      assert.ok(Number.isFinite(ratio) && ratio > 0.4 && ratio < 1.7, `${preset.id} ${ratio}`);
    }
  }
});
