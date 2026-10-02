import assert from "node:assert/strict";
import test from "node:test";
import {
  createThresholdNetwork,
  DEFAULT_PARAMETERS,
  flipNode,
  isActive,
  measureThreshold,
  setMeanInputs,
  SHADOW_LIMIT,
  stepThresholdNetwork,
  type ThresholdNetwork,
} from "./model.ts";

const SEED = 0x3c6ef372;

function assertConsistent(network: ThresholdNetwork) {
  const keys = new Set<string>();
  let count = 0;
  network.inputs.forEach((list, target) => {
    for (const link of list) {
      assert.equal(link.target, target);
      assert.notEqual(link.source, target);
      assert.ok(link.weight === 1 || link.weight === -1);
      const key = `${link.source}>${link.target}`;
      assert.ok(!keys.has(key));
      keys.add(key);
      count += 1;
    }
  });
  assert.equal(count, network.linkCount);
  assert.equal(network.pairs.size, count);
  for (const value of network.state) assert.ok(value === 1 || value === -1);
}

/** Mean K over the last `window` of `updates` parallel updates. */
function evolvedInputs(start: number, seed = SEED, updates = 3000, window = 1000) {
  const network = createThresholdNetwork(120, start, seed);
  let sum = 0;
  for (let update = 1; update <= updates; update += 1) {
    stepThresholdNetwork(network);
    if (update > updates - window) sum += measureThreshold(network).meanInputs;
  }
  assertConsistent(network);
  return sum / window;
}

/** Mean peak damage of single flips on a fixed topology with mean `inputs`. */
function meanDamage(inputs: number) {
  const network = createThresholdNetwork(120, inputs, 5);
  const fixed = { ...DEFAULT_PARAMETERS, rewiresPerStep: 0 };
  for (let update = 0; update < 50; update += 1) stepThresholdNetwork(network, fixed);
  let total = 0;
  for (let trial = 0; trial < 120; trial += 1) {
    flipNode(network, trial);
    let peak = 0;
    for (let update = 0; update < 30; update += 1) {
      stepThresholdNetwork(network, fixed);
      peak = Math.max(peak, measureThreshold(network).damage);
    }
    network.shadow = null;
    total += peak;
  }
  return total / 120;
}

test("replays deterministically from a seed", () => {
  const first = createThresholdNetwork(80, 2, 9);
  const second = createThresholdNetwork(80, 2, 9);
  for (let update = 0; update < 200; update += 1) {
    assert.deepEqual(stepThresholdNetwork(first), stepThresholdNetwork(second));
  }
  assert.deepEqual(first.state, second.state);
  assert.deepEqual(first.inputs, second.inputs);
});

test("every node follows the signed sum of its inputs", () => {
  const network = createThresholdNetwork(60, 3, 21);
  const before = network.state.slice();
  stepThresholdNetwork(network, { ...DEFAULT_PARAMETERS, rewiresPerStep: 0 });
  for (let node = 0; node < network.size; node += 1) {
    let field = DEFAULT_PARAMETERS.threshold;
    for (const link of network.inputs[node]!) field += link.weight * before[link.source]!;
    assert.equal(network.state[node], field >= 0 ? 1 : -1);
  }
});

test("still nodes only gain inputs and blinking nodes only lose them", () => {
  const network = createThresholdNetwork(120, 3, 13);
  for (let update = 0; update < 400; update += 1) {
    // The rule judges activity after the update, which is what isActive reads now.
    for (const event of stepThresholdNetwork(network)) {
      assert.equal(isActive(network, event.link.target), event.kind === "lose");
    }
  }
  assertConsistent(network);
});

test("connectivity converges to the same band from sparse and dense starts", () => {
  for (const seed of [SEED, 7]) {
    const sparse = evolvedInputs(0.5, seed);
    const dense = evolvedInputs(5, seed);
    assert.ok(sparse > 2 && sparse < 4, `sparse ${sparse}`);
    assert.ok(dense > 2 && dense < 4, `dense ${dense}`);
    assert.ok(Math.abs(sparse - dense) < 0.8);
  }
});

test("without the topology rule, connectivity stays where it started", () => {
  const network = createThresholdNetwork(120, 0.5, SEED);
  for (let update = 0; update < 1000; update += 1) {
    stepThresholdNetwork(network, { ...DEFAULT_PARAMETERS, rewiresPerStep: 0 });
  }
  assert.equal(measureThreshold(network).meanInputs, 0.5);
});

test("the evolved network keeps about half its nodes blinking", () => {
  const network = createThresholdNetwork(120, 1, SEED);
  let sum = 0;
  for (let update = 1; update <= 3000; update += 1) {
    stepThresholdNetwork(network);
    if (update > 2000) sum += measureThreshold(network).activeShare;
  }
  const share = sum / 1000;
  assert.ok(share > 0.4 && share < 0.6, `active ${share}`);
});

test("a flip dies out in sparse networks and floods dense ones", () => {
  const sparse = meanDamage(0.5);
  const dense = meanDamage(6);
  assert.ok(sparse < 1.5, `sparse ${sparse}`);
  assert.ok(dense > 25, `dense ${dense}`);
});

test("the damage twin closes once the trajectories agree or the limit passes", () => {
  const network = createThresholdNetwork(80, 0.25, 3);
  const fixed = { ...DEFAULT_PARAMETERS, rewiresPerStep: 0 };
  for (let update = 0; update < 20; update += 1) stepThresholdNetwork(network, fixed);
  assert.equal(flipNode(network, 0), true);
  assert.equal(flipNode(network, -1), false);
  assert.equal(measureThreshold(network).damage, 1);
  for (let update = 0; update <= SHADOW_LIMIT + 1; update += 1) stepThresholdNetwork(network, fixed);
  assert.equal(network.shadow, null);
  assert.equal(measureThreshold(network).damage, 0);
});

test("imposing connectivity hits the target and keeps links simple", () => {
  const network = createThresholdNetwork(120, 1, 17);
  const added = setMeanInputs(network, 5);
  assert.equal(network.linkCount, 600);
  assert.ok(added.every((event) => event.kind === "gain"));
  const removed = setMeanInputs(network, 0.25);
  assert.equal(network.linkCount, 30);
  assert.ok(removed.every((event) => event.kind === "lose"));
  assertConsistent(network);
});
