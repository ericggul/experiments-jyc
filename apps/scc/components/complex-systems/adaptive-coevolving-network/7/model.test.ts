import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY_FLOOR,
  addActivePerson,
  CONTACT_MEMORY,
  CONTACTS_PER_ACTIVATION,
  createEchoNetwork,
  DEFAULT_PARAMETERS,
  holdOpinion,
  MAX_PEOPLE,
  measureEcho,
  sampleActivity,
  stepEchoNetwork,
  type EchoNetwork,
  type EchoParameters,
} from "./model.ts";

const SEED = 0x5bd1e995;

function run(parameters: Partial<EchoParameters>, duration = 30, seed = SEED) {
  const network = createEchoNetwork(200, seed);
  stepEchoNetwork(network, duration, { ...DEFAULT_PARAMETERS, ...parameters });
  return network;
}

/** Share of people on the side that was empty before `count` talkers joined it. */
function seededSide(homophily: number, count: number, seed: number) {
  const network = run({ homophily: 0 }, 15, seed);
  const side = measureEcho(network).positive > 0.5 ? -1 : 1;
  for (let added = 0; added < count; added += 1) addActivePerson(network, side * 2);
  stepEchoNetwork(network, 30, { ...DEFAULT_PARAMETERS, homophily });
  const { positive } = measureEcho(network);
  return side > 0 ? positive : 1 - positive;
}

function assertConsistent(network: EchoNetwork) {
  assert.equal(network.opinion.length, network.size);
  assert.equal(network.activity.length, network.size);
  for (const value of network.opinion) assert.ok(Number.isFinite(value));
  for (const contact of network.contacts) {
    assert.notEqual(contact.source, contact.target);
    assert.ok(contact.source < network.size && contact.target < network.size);
    assert.ok(network.time - contact.at <= CONTACT_MEMORY + 0.2);
  }
}

test("replays deterministically from a seed", () => {
  const first = createEchoNetwork(120, 7);
  const second = createEchoNetwork(120, 7);
  assert.deepEqual(
    stepEchoNetwork(first, 10, DEFAULT_PARAMETERS),
    stepEchoNetwork(second, 10, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.opinion, second.opinion);
});

test("activities follow the power law range and an active person makes m distinct contacts", () => {
  assert.ok(Math.abs(sampleActivity(0) - ACTIVITY_FLOOR) < 1e-12);
  assert.ok(Math.abs(sampleActivity(1) - 1) < 1e-12);
  const network = createEchoNetwork(200, 3);
  for (const activity of network.activity) assert.ok(activity >= ACTIVITY_FLOOR && activity <= 1);
  const talker = addActivePerson(network, 0.5)!;
  const contacts = stepEchoNetwork(network, 0.05, DEFAULT_PARAMETERS);
  const own = contacts.filter((contact) => contact.source === talker).map((contact) => contact.target);
  assert.equal(own.length, CONTACTS_PER_ACTIVATION);
  assert.equal(new Set(own).size, own.length);
  stepEchoNetwork(network, 10, DEFAULT_PARAMETERS);
  assertConsistent(network);
});

test("a mild topic ends in neutral consensus", () => {
  const { meanConviction } = measureEcho(run({ controversy: 0.05 }));
  assert.ok(meanConviction < 0.01);
});

test("a controversial topic without homophily radicalizes everyone to one side", () => {
  const measure = measureEcho(run({ homophily: 0 }));
  assert.ok(measure.alignment > 0.98);
  assert.ok(measure.meanConviction > 1);
});

test("homophily turns radicalization into two camps that talk mostly to themselves", () => {
  const open = measureEcho(run({ homophily: 0 }));
  const closed = measureEcho(run({ homophily: 3 }));
  assert.ok(closed.alignment < 0.6);
  assert.ok(closed.positive > 0.2 && closed.positive < 0.8);
  assert.ok(closed.crossContacts < 0.12);
  assert.ok(closed.echo > 0.3);
  assert.ok(open.alignment - closed.alignment > 0.4);
});

test("dropping homophily lets one camp absorb the other", () => {
  const network = run({ homophily: 3 }, 20);
  assert.ok(measureEcho(network).alignment < 0.6);
  stepEchoNetwork(network, 20, { ...DEFAULT_PARAMETERS, homophily: 0 });
  assert.ok(measureEcho(network).alignment > 0.98);
});

test("three talkers grow a new camp only when people seek like minds", () => {
  for (const seed of [1, 2, 3]) {
    assert.ok(seededSide(0, 3, seed) < 0.05);
    assert.ok(seededSide(3, 3, seed) > 0.3);
  }
});

test("a held opinion stays put until it is released", () => {
  const network = run({}, 20);
  holdOpinion(network, 0, -3);
  stepEchoNetwork(network, 5, DEFAULT_PARAMETERS);
  assert.equal(network.opinion[0], -3);
  holdOpinion(network, null);
  assert.equal(network.held, null);
  assert.equal(holdOpinion(network, network.size, 1), false);
});

test("adding talkers respects the population cap", () => {
  const network = createEchoNetwork(MAX_PEOPLE - 1, 5);
  assert.equal(addActivePerson(network, 1), MAX_PEOPLE - 1);
  assert.equal(network.activity[MAX_PEOPLE - 1], 1);
  assert.equal(addActivePerson(network, 1), null);
  stepEchoNetwork(network, 2, DEFAULT_PARAMETERS);
  assertConsistent(network);
});
