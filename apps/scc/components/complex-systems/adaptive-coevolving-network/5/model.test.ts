import assert from "node:assert/strict";
import test from "node:test";
import {
  addPerson,
  createSignedNetwork,
  DEFAULT_PARAMETERS,
  factions,
  flipRelation,
  isolatePerson,
  MAX_PEOPLE,
  measureBalance,
  pairTension,
  relation,
  stepSignedNetwork,
  type SignedNetwork,
} from "./model.ts";

const SEED = 0x5bd1e995;

function assertConsistent(network: SignedNetwork) {
  let unbalanced = 0;
  for (let a = 0; a < network.size; a += 1) {
    assert.equal(relation(network, a, a), 0);
    for (let b = a + 1; b < network.size; b += 1) {
      assert.ok(relation(network, a, b) === 1 || relation(network, a, b) === -1);
      assert.equal(relation(network, a, b), relation(network, b, a));
      for (let c = b + 1; c < network.size; c += 1) {
        if (relation(network, a, b) * relation(network, a, c) * relation(network, b, c) < 0) unbalanced += 1;
      }
    }
  }
  assert.equal(network.unbalanced, unbalanced);
}

/** Every relationship is the product of the two people's camps: at most two camps. */
function assertTwoCamps(network: SignedNetwork) {
  const camps = factions(network);
  for (let a = 0; a < network.size; a += 1) {
    for (let b = a + 1; b < network.size; b += 1) assert.equal(relation(network, a, b), camps[a]! * camps[b]!);
  }
}

function settle(reconcile: number, seed = SEED, duration = 120) {
  const network = createSignedNetwork(30, seed);
  stepSignedNetwork(network, duration, { ...DEFAULT_PARAMETERS, reconcile, unrest: 0 });
  return network;
}

/** Index of someone in the other camp from person 0. */
function opponentOfFirst(network: SignedNetwork) {
  const camps = factions(network);
  return camps.findIndex((camp) => camp !== camps[0]);
}

test("replays deterministically from a seed", () => {
  const first = createSignedNetwork(24, 7);
  const second = createSignedNetwork(24, 7);
  assert.deepEqual(
    stepSignedNetwork(first, 20, DEFAULT_PARAMETERS),
    stepSignedNetwork(second, 20, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.signs, second.signs);
});

test("every change resolves an unbalanced triangle and the tally stays exact", () => {
  const network = createSignedNetwork(30, SEED);
  assertConsistent(network);
  for (let round = 0; round < 40; round += 1) {
    const before = Int8Array.from(network.signs);
    const events = stepSignedNetwork(network, 0.05, DEFAULT_PARAMETERS);
    for (const event of events) {
      if (event.kind !== "resolve") continue;
      const [a, b, c] = event.triangle;
      assert.ok([a, b, c].includes(event.a) && [a, b, c].includes(event.b));
      // Events within one call can touch the same triangle, so only the first is checked against `before`.
      if (event === events[0]) {
        const product = before[a * MAX_PEOPLE + b]! * before[a * MAX_PEOPLE + c]! * before[b * MAX_PEOPLE + c]!;
        assert.equal(product, -1);
      }
    }
  }
  assertConsistent(network);
});

test("below one half the network balances into exactly two hostile camps", () => {
  for (const seed of [SEED, 11, 23]) {
    const network = settle(0.3, seed);
    const measure = measureBalance(network);
    assert.equal(measure.balanced, true);
    assert.ok(measure.minority >= 8, `minority ${measure.minority}`);
    assertTwoCamps(network);
  }
});

test("the same start ends in universal friendship above one half", () => {
  for (const seed of [SEED, 11, 23]) {
    const network = settle(0.7, seed);
    const measure = measureBalance(network);
    assert.equal(measure.balanced, true);
    assert.equal(measure.minority, 0);
    assert.equal(measure.friendly, 1);
  }
});

test("raising reconciliation under unrest dissolves settled camps; keeping it low does not", () => {
  const raised = settle(0.3);
  const kept = settle(0.3);
  stepSignedNetwork(raised, 150, { ...DEFAULT_PARAMETERS, reconcile: 0.7, unrest: 0.2 });
  stepSignedNetwork(kept, 150, { ...DEFAULT_PARAMETERS, reconcile: 0.3, unrest: 0.2 });
  stepSignedNetwork(raised, 20, { ...DEFAULT_PARAMETERS, reconcile: 0.7, unrest: 0 });
  stepSignedNetwork(kept, 20, { ...DEFAULT_PARAMETERS, reconcile: 0.3, unrest: 0 });
  assert.equal(measureBalance(raised).minority, 0);
  assert.ok(measureBalance(kept).minority >= 8);
});

test("lowering reconciliation under unrest splits a peaceful group", () => {
  const network = settle(0.7);
  stepSignedNetwork(network, 180, { ...DEFAULT_PARAMETERS, reconcile: 0.3, unrest: 0.2 });
  stepSignedNetwork(network, 20, { ...DEFAULT_PARAMETERS, reconcile: 0.3, unrest: 0 });
  assert.ok(measureBalance(network).minority >= 3);
  assertTwoCamps(network);
});

test("one reconciliation across camps can bring peace only when reconciling is likely", () => {
  const hopeful = settle(0.3);
  const doubtful = settle(0.3);
  const other = opponentOfFirst(hopeful);
  assert.ok(other > 0);
  const before = measureBalance(doubtful).minority;
  assert.equal(flipRelation(hopeful, 0, other), 1);
  assert.equal(flipRelation(doubtful, 0, other), 1);
  stepSignedNetwork(hopeful, 60, { ...DEFAULT_PARAMETERS, reconcile: 0.7, unrest: 0 });
  stepSignedNetwork(doubtful, 60, { ...DEFAULT_PARAMETERS, reconcile: 0.3, unrest: 0 });
  assert.equal(measureBalance(hopeful).minority, 0);
  assert.equal(measureBalance(doubtful).minority, before);
  assertConsistent(hopeful);
});

test("an outcast rejoins a camp, but stays alone in a peaceful group", () => {
  const camps = settle(0.3);
  assert.equal(isolatePerson(camps, 0), true);
  assert.ok(camps.unbalanced > 0);
  stepSignedNetwork(camps, 20, { ...DEFAULT_PARAMETERS, unrest: 0 });
  assert.equal(camps.unbalanced, 0);
  assert.ok(measureBalance(camps).minority >= 8);

  const peace = settle(0.7);
  assert.equal(isolatePerson(peace, 0), true);
  assert.equal(peace.unbalanced, 0);
  assert.equal(measureBalance(peace).minority, 1);
  assert.equal(isolatePerson(peace, 0), false);
});

test("newcomers, flips and tension respect bounds", () => {
  const network = createSignedNetwork(MAX_PEOPLE - 1, 3);
  const person = addPerson(network);
  assert.equal(person, MAX_PEOPLE - 1);
  for (let other = 0; other < person!; other += 1) assert.equal(relation(network, person!, other), 1);
  assert.equal(addPerson(network), null);
  assert.equal(flipRelation(network, 2, 2), null);
  assert.equal(flipRelation(network, 0, MAX_PEOPLE), null);
  assertConsistent(network);

  const tension = new Float32Array(MAX_PEOPLE * MAX_PEOPLE);
  pairTension(network, tension);
  assert.ok(tension.some((value) => value > 0));
  assert.ok(tension.every((value) => value >= 0 && value <= 1));
  const balanced = settle(0.3);
  pairTension(balanced, tension);
  assert.ok(tension.every((value) => value === 0));
});
