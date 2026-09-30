import assert from "node:assert/strict";
import test from "node:test";
import {
  BIFURCATING_FLOWS,
  isBifurcatingFlowId,
  parameterAt,
  stepFlow,
  sweepProfile,
  type BifurcatingFlow,
  type Vector3,
} from "./flows.ts";

function flow(id: string) {
  const found = BIFURCATING_FLOWS.find((candidate) => candidate.id === id);
  assert.ok(found);
  return found;
}

function speedAfter(candidate: BifurcatingFlow, parameter: number, seed: Vector3, duration: number) {
  let state = seed;
  for (let time = 0; time < duration; time += candidate.step) {
    state = stepFlow(candidate, parameter, state);
  }
  return { state, speed: Math.hypot(...candidate.derivative(parameter, state)) };
}

test("three flows are configured with a GPU derivative", () => {
  assert.deepEqual(BIFURCATING_FLOWS.map((candidate) => candidate.id), ["thomas", "lorenz", "rossler"]);
  for (const candidate of BIFURCATING_FLOWS) {
    assert.match(candidate.derivativeWgsl, /fn flow\(pos: vec3f, [a-z]+: f32\) -> vec3f/);
    assert.ok(candidate.cycleModelTime > 0 && candidate.step > 0 && candidate.noise > 0);
  }
  assert.ok(isBifurcatingFlowId("rossler"));
  assert.ok(!isBifurcatingFlowId("chen"));
});

test("the sweep rests at both ends and is continuous", () => {
  assert.equal(sweepProfile(0.05), 0);
  assert.equal(sweepProfile(0.5), 1);
  assert.equal(sweepProfile(1.05), 0);
  for (let fraction = 0; fraction < 1; fraction += 0.001) {
    assert.ok(Math.abs(sweepProfile(fraction + 0.001) - sweepProfile(fraction)) < 0.01);
  }
  const thomas = flow("thomas");
  assert.equal(parameterAt(thomas, 0), thomas.from);
  assert.ok(Math.abs(parameterAt(thomas, thomas.cycleModelTime * 0.55) - thomas.to) < 1e-12);
});

test("at the start of each sweep every flow rests on an equilibrium", () => {
  for (const candidate of BIFURCATING_FLOWS) {
    const { speed } = speedAfter(candidate, candidate.from, [0.4, -0.3, 0.6], 400);
    assert.ok(speed < 1e-3, `${candidate.id} speed ${speed}`);
  }
});

test("the thomas pitchfork gives two equilibria on the diagonal", () => {
  const thomas = flow("thomas");
  const positive = speedAfter(thomas, 0.6, [0.5, 0.5, 0.5], 400).state;
  const negative = speedAfter(thomas, 0.6, [-0.5, -0.5, -0.5], 400).state;
  assert.ok(positive[0] > 1 && Math.abs(positive[0] - positive[2]) < 1e-6);
  assert.ok(Math.abs(positive[0] + negative[0]) < 1e-6);
});

test("at the far end of each sweep the ensemble keeps moving", () => {
  for (const candidate of BIFURCATING_FLOWS) {
    const seed: Vector3 = [
      candidate.seedCenter[0] + 0.7,
      candidate.seedCenter[1] - 0.4,
      candidate.seedCenter[2] + 0.3,
    ];
    const { state, speed } = speedAfter(candidate, candidate.to, seed, 200);
    assert.ok(state.every(Number.isFinite));
    assert.ok(speed > 0.05, `${candidate.id} speed ${speed}`);
  }
});
