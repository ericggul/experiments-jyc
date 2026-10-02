import assert from "node:assert/strict";
import test from "node:test";
import {
  addPerson,
  createEpidemicNetwork,
  DEFAULT_PARAMETERS,
  infectPerson,
  MAX_PEOPLE,
  measureEpidemic,
  stepEpidemicNetwork,
  type EpidemicNetwork,
} from "./model.ts";

function assertConsistent(network: EpidemicNetwork) {
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
  network.incident.forEach((list, person) => assert.equal(list.length, degree[person]));
}

/** Mean infected share over the last `window` time units of a run. */
function prevalence(avoidance: number, initialInfected: number, duration = 180, window = 60) {
  const network = createEpidemicNetwork(300, 8, 0x1b873593, initialInfected);
  const parameters = { ...DEFAULT_PARAMETERS, avoidance, importation: 0 };
  stepEpidemicNetwork(network, duration - window, parameters);
  let sum = 0;
  for (let step = 0; step < window; step += 1) {
    stepEpidemicNetwork(network, 1, parameters);
    sum += measureEpidemic(network).infected;
  }
  return sum / window;
}

test("replays deterministically from a seed", () => {
  const first = createEpidemicNetwork(120, 6, 7);
  const second = createEpidemicNetwork(120, 6, 7);
  assert.deepEqual(
    stepEpidemicNetwork(first, 30, DEFAULT_PARAMETERS),
    stepEpidemicNetwork(second, 30, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.health, second.health);
  assert.deepEqual(first.ties, second.ties);
});

test("avoidance moves a tie from an infected to a healthy person and keeps ties simple", () => {
  const network = createEpidemicNetwork(200, 8, 11, 0.3);
  const ties = network.ties.length;
  const healthBefore = [...network.health];
  const events = stepEpidemicNetwork(network, 0.05, { ...DEFAULT_PARAMETERS, avoidance: 5, infection: 0 });
  const avoided = events.filter((event) => event.kind === "avoid");
  assert.ok(avoided.length > 0);
  for (const event of avoided) {
    if (event.kind !== "avoid") continue;
    assert.equal(healthBefore[event.person], "S");
    assert.equal(healthBefore[event.from], "I");
    assert.equal(healthBefore[event.to], "S");
  }
  assert.equal(network.ties.length, ties);
  assertConsistent(network);
});

test("without avoidance the epidemic is endemic; with strong avoidance it dies out", () => {
  assert.ok(prevalence(0, 0.05) > 0.4);
  assert.ok(prevalence(0.8, 0.5) < 0.02);
});

test("at intermediate avoidance the outcome depends on outbreak size", () => {
  assert.ok(prevalence(0.45, 0.02) < 0.05);
  assert.ok(prevalence(0.45, 0.5, 100, 30) > 0.1);
});

test("avoidance leaves infected people with fewer ties", () => {
  const network = createEpidemicNetwork(300, 8, 0x1b873593, 0.5);
  stepEpidemicNetwork(network, 40, { ...DEFAULT_PARAMETERS, avoidance: 0.45, importation: 0 });
  const measure = measureEpidemic(network);
  assert.ok(measure.infected > 0);
  assert.ok(measure.meanDegreeInfected < measure.meanDegreeSusceptible);
});

test("infecting and adding people respect bounds", () => {
  const network = createEpidemicNetwork(MAX_PEOPLE - 1, 4, 3, 0);
  assert.equal(infectPerson(network, 0), true);
  assert.equal(infectPerson(network, 0), false);
  assert.equal(infectPerson(network, -1), false);
  const person = addPerson(network, [1, 2, 2]);
  assert.equal(person, MAX_PEOPLE - 1);
  assert.equal(network.health[person!], "S");
  assert.equal(network.incident[person!]!.length, 2);
  assert.equal(addPerson(network, [0]), null);
  assertConsistent(network);
});
