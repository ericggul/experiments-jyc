import assert from "node:assert/strict";
import test from "node:test";
import {
  createCultureNetwork,
  DEFAULT_PARAMETERS,
  FEATURES,
  impose,
  measureCulture,
  randomizeCulture,
  redrawCultures,
  sharedFeatures,
  stepCultureNetwork,
  type CultureNetwork,
} from "./model.ts";

const SEEDS = [7919, 15838, 23757, 31676, 39595, 47514];

function assertConsistent(network: CultureNetwork) {
  const keys = new Set<string>();
  const degree = new Array<number>(network.size).fill(0);
  for (const tie of network.ties) {
    assert.notEqual(tie.a, tie.b);
    const key = [tie.a, tie.b].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key));
    keys.add(key);
    degree[tie.a]! += 1;
    degree[tie.b]! += 1;
  }
  assert.equal(network.pairs.size, network.ties.length);
  network.incident.forEach((list, agent) => assert.equal(list.length, degree[agent]));
  for (const trait of network.cultures) assert.ok(trait < network.traits);
}

/** Mean measure over seeds after `duration` time units from random cultures. */
function outcome(traits: number, drift: number, duration = 250) {
  let largestCulture = 0;
  let components = 0;
  let largestComponent = 0;
  for (const seed of SEEDS) {
    const network = createCultureNetwork(120, traits, seed);
    stepCultureNetwork(network, duration, { drift });
    const measure = measureCulture(network);
    largestCulture += measure.largestCulture / SEEDS.length;
    components += measure.components / SEEDS.length;
    largestComponent += measure.largestComponent / SEEDS.length;
  }
  return { largestCulture, components, largestComponent };
}

test("replays deterministically from a seed", () => {
  const first = createCultureNetwork(80, 10, 7);
  const second = createCultureNetwork(80, 10, 7);
  assert.deepEqual(
    stepCultureNetwork(first, 30, DEFAULT_PARAMETERS),
    stepCultureNetwork(second, 30, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.cultures, second.cultures);
  assert.deepEqual(first.ties, second.ties);
});

test("copies only across partial overlap and rewires only across none", () => {
  const network = createCultureNetwork(120, 6, 11);
  for (let round = 0; round < 200; round += 1) {
    const before = Uint8Array.from(network.cultures);
    const shared = (a: number, b: number) => {
      let count = 0;
      for (let feature = 0; feature < FEATURES; feature += 1) {
        if (before[a * FEATURES + feature] === before[b * FEATURES + feature]) count += 1;
      }
      return count;
    };
    // One update at a time, so every event reads the state just before it.
    const [event] = stepCultureNetwork(network, 1 / network.size, { drift: 0 });
    if (!event) continue;
    if (event.kind === "copy") {
      const overlap = shared(event.agent, event.source);
      assert.ok(overlap > 0 && overlap < FEATURES);
      assert.equal(sharedFeatures(network, event.agent, event.source), overlap + 1);
    } else if (event.kind === "rewire") {
      assert.equal(shared(event.agent, event.from), 0);
      assert.ok(network.pairs.size === network.ties.length);
    }
  }
  assertConsistent(network);
});

test("tie count is conserved and the graph stays simple under drift", () => {
  const network = createCultureNetwork(120, 30, 3);
  const ties = network.ties.length;
  stepCultureNetwork(network, 120, { drift: 0.02 });
  assert.equal(network.ties.length, ties);
  assertConsistent(network);
});

test("few traits converge on one culture in one connected network", () => {
  const low = outcome(2, 0);
  assert.ok(low.largestCulture > 0.8, `largest culture ${low.largestCulture}`);
  assert.ok(low.largestComponent > 0.95, `largest component ${low.largestComponent}`);
});

test("many traits split the network into monocultural islands", () => {
  const high = outcome(24, 0);
  assert.ok(high.components > 5, `components ${high.components}`);
  assert.ok(high.largestComponent < 0.6, `largest component ${high.largestComponent}`);
  // Frozen islands: no tie can still copy or rewire.
  const network = createCultureNetwork(120, 24, SEEDS[0]);
  stepCultureNetwork(network, 400, { drift: 0 });
  const measure = measureCulture(network);
  assert.equal(measure.activeTies + measure.strangerTies, 0);
  assert.equal(measure.cultures, measure.components);
});

test("strong drift keeps a diverse population in one network", () => {
  const quiet = outcome(24, 0);
  const restless = outcome(24, 0.02);
  assert.ok(restless.largestComponent > 0.9, `largest component ${restless.largestComponent}`);
  assert.ok(restless.components < quiet.components / 2);
});

test("redrawing with few traits reconnects frozen islands", () => {
  const network = createCultureNetwork(120, 24, SEEDS[0]);
  stepCultureNetwork(network, 250, { drift: 0 });
  assert.ok(measureCulture(network).components > 4);
  redrawCultures(network, 2);
  assertConsistent(network);
  stepCultureNetwork(network, 250, { drift: 0 });
  const measure = measureCulture(network);
  assert.ok(measure.largestComponent > 0.95);
  assert.ok(measure.largestCulture > 0.9);
});

test("interventions respect bounds", () => {
  const network = createCultureNetwork(40, 5, 5);
  assert.equal(randomizeCulture(network, -1), false);
  assert.equal(randomizeCulture(network, 0), true);
  assert.equal(impose(network, 0, 0), false);
  assert.equal(impose(network, 0, 40), false);
  impose(network, 0, 1);
  assert.equal(sharedFeatures(network, 0, 1), FEATURES);
  assert.equal(impose(network, 0, 1), false);
  redrawCultures(network, 99);
  assert.equal(network.traits, 40);
  assertConsistent(network);
});
