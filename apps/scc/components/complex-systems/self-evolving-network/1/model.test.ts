import assert from "node:assert/strict";
import test from "node:test";
import {
  createSelfEvolvingNetwork,
  forEachTie,
  measureSelfEvolvingNetwork,
  retirePerson,
  stepSelfEvolvingNetwork,
  type SelfEvolvingNetwork,
} from "./model.ts";

function assertSymmetricSimple(network: SelfEvolvingNetwork) {
  network.neighbours.forEach((known, person) => {
    assert.ok(!known.has(person));
    for (const other of known) assert.ok(network.neighbours[other]!.has(person));
  });
}

function settle(turnover: number, seed = 0x3d0b5e17) {
  const network = createSelfEvolvingNetwork(200, seed);
  stepSelfEvolvingNetwork(network, 200 * 120, { turnover });
  return network;
}

test("replays deterministically from a seed", () => {
  const first = createSelfEvolvingNetwork(80, 5);
  const second = createSelfEvolvingNetwork(80, 5);
  assert.deepEqual(
    stepSelfEvolvingNetwork(first, 4_000, { turnover: 0.05 }),
    stepSelfEvolvingNetwork(second, 4_000, { turnover: 0.05 }),
  );
  assert.deepEqual(first.neighbours.map((known) => [...known]), second.neighbours.map((known) => [...known]));
});

test("every introduction closes a triangle through the broker", () => {
  const network = createSelfEvolvingNetwork(120, 9);
  const events = stepSelfEvolvingNetwork(network, 6_000, { turnover: 0 });
  const introductions = events.filter((event) => event.kind === "introduce");
  assert.ok(introductions.length > 0);
  // Without turnover no tie is ever removed, so every triangle is still there.
  for (const event of introductions) {
    if (event.kind !== "introduce") continue;
    assert.ok(network.neighbours[event.broker]!.has(event.a));
    assert.ok(network.neighbours[event.broker]!.has(event.b));
    assert.ok(network.neighbours[event.a]!.has(event.b));
  }
  assertSymmetricSimple(network);
});

test("retirement removes all ties and resets tenure", () => {
  const network = settle(0.06);
  let hub = 0;
  network.neighbours.forEach((known, person) => {
    if (known.size > network.neighbours[hub]!.size) hub = person;
  });
  const before = network.neighbours[hub]!.size;
  const event = retirePerson(network, hub);
  assert.equal(event?.former.length, before);
  assert.equal(network.neighbours[hub]!.size, 0);
  assert.equal(network.bornAt[hub], network.updates);
  assertSymmetricSimple(network);
  let ties = 0;
  forEachTie(network, () => (ties += 1));
  assert.equal(ties, measureSelfEvolvingNetwork(network).ties);
});

test("clustering self-organizes far above a random graph of the same density", () => {
  const measure = measureSelfEvolvingNetwork(settle(0.06));
  assert.ok(measure.clustering > 0.35);
  assert.ok(measure.clustering > measure.randomClustering * 5);
});

test("lower turnover yields a denser network with larger hubs", () => {
  const staying = measureSelfEvolvingNetwork(settle(0.02));
  const leaving = measureSelfEvolvingNetwork(settle(0.3));
  assert.ok(staying.meanDegree > leaving.meanDegree * 3);
  assert.ok(staying.maxDegree > leaving.maxDegree * 2);
  assert.ok(staying.isolated < leaving.isolated);
});
