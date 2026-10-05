import assert from "node:assert/strict";
import test from "node:test";
import {
  addVoter,
  createCoevolvingNetwork,
  MAX_VOTERS,
  measureCoevolution,
  plantOpinion,
  rarestOpinion,
  stepCoevolvingNetwork,
  type CoevolvingNetwork,
} from "./model.ts";

function assertConsistent(network: CoevolvingNetwork) {
  const keys = new Set<string>();
  const degree = new Array<number>(network.size).fill(0);
  for (const tie of network.ties) {
    assert.notEqual(tie.a, tie.b);
    const key = [tie.a, tie.b].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key), `duplicate tie ${key}`);
    keys.add(key);
    degree[tie.a]! += 1;
    degree[tie.b]! += 1;
  }
  assert.equal(network.pairs.size, network.ties.length);
  network.incident.forEach((list, voter) => {
    assert.equal(list.length, degree[voter]);
    for (const tieId of list) {
      const tie = network.ties[tieId]!;
      assert.ok(tie.a === voter || tie.b === voter);
    }
  });
}

test("replays deterministically from a seed", () => {
  const first = createCoevolvingNetwork(120, 4, 7);
  const second = createCoevolvingNetwork(120, 4, 7);
  const parameters = { rewiring: 0.4, drift: 0.002 };
  const firstEvents = stepCoevolvingNetwork(first, 5_000, parameters);
  const secondEvents = stepCoevolvingNetwork(second, 5_000, parameters);
  assert.deepEqual(firstEvents, secondEvents);
  assert.deepEqual(first.opinions, second.opinions);
  assert.deepEqual(first.ties, second.ties);
});

test("rewiring conserves ties and keeps the graph simple", () => {
  const network = createCoevolvingNetwork(160, 4, 11);
  const ties = network.ties.length;
  const events = stepCoevolvingNetwork(network, 20_000, { rewiring: 0.7, drift: 0.002 });
  assert.ok(events.some((event) => event.kind === "rewire"));
  assert.equal(network.ties.length, ties);
  assertConsistent(network);
});

test("a rewire moves a disagreeing tie to a like-minded voter", () => {
  const network = createCoevolvingNetwork(100, 4, 3);
  const opinionsBefore = [...network.opinions];
  const [event] = stepCoevolvingNetwork(network, 1_000, { rewiring: 1, drift: 0 })
    .filter((candidate) => candidate.kind === "rewire");
  assert.ok(event && event.kind === "rewire");
  assert.notEqual(opinionsBefore[event.from], opinionsBefore[event.voter]);
  const tie = network.ties[event.tie]!;
  assert.ok(tie.a === event.voter || tie.b === event.voter);
});

test("pure adoption never touches ties; pure rewiring never touches opinions", () => {
  const adopting = createCoevolvingNetwork(100, 4, 5);
  const ties = JSON.stringify(adopting.ties);
  stepCoevolvingNetwork(adopting, 10_000, { rewiring: 0, drift: 0 });
  assert.equal(JSON.stringify(adopting.ties), ties);

  const rewiring = createCoevolvingNetwork(100, 4, 5);
  const opinions = [...rewiring.opinions];
  stepCoevolvingNetwork(rewiring, 10_000, { rewiring: 1, drift: 0 });
  assert.deepEqual(rewiring.opinions, opinions);
});

test("rewiring-dominated runs fragment into agreeing components", () => {
  const network = createCoevolvingNetwork(240, 4, 0x51c0e7a3);
  stepCoevolvingNetwork(network, 240 * 200, { rewiring: 0.85, drift: 0 });
  const measure = measureCoevolution(network);
  assert.equal(measure.discordant, 0);
  assert.ok(measure.components >= 6);
  assert.ok(measure.largestComponent < 0.5);
});

test("adoption-dominated runs stay connected while opinions coarsen", () => {
  const network = createCoevolvingNetwork(240, 4, 0x51c0e7a3);
  stepCoevolvingNetwork(network, 240 * 200, { rewiring: 0.05, drift: 0 });
  const measure = measureCoevolution(network);
  assert.ok(measure.largestComponent > 0.95);
  assert.ok(measure.livingOpinions < 6);
});

test("planting sets only the chosen voters and picks the rarest opinion", () => {
  const network = createCoevolvingNetwork(60, 4, 9);
  network.opinions.fill(0);
  network.opinions[0] = 1;
  assert.equal(rarestOpinion(network), 2);
  const changed = plantOpinion(network, [3, 4, 4, -1, 999], 5);
  assert.deepEqual(changed, [3, 4]);
  assert.equal(network.opinions[3], 5);
  assert.equal(network.opinions[5], 0);
});

test("a newcomer joins with the given ties and stays consistent under updates", () => {
  const network = createCoevolvingNetwork(100, 4, 13);
  const ties = network.ties.length;
  const voter = addVoter(network, 2, [4, 9, 9, 100, -1]);
  assert.equal(voter, 100);
  assert.equal(network.size, 101);
  assert.equal(network.opinions[100], 2);
  assert.equal(network.ties.length, ties + 2);
  assert.equal(network.incident[100]!.length, 2);
  stepCoevolvingNetwork(network, 20_000, { rewiring: 0.6, drift: 0.002 });
  assertConsistent(network);
  assert.equal(network.opinions.length, network.size);
});

test("growth stops at the population cap", () => {
  const network = createCoevolvingNetwork(MAX_VOTERS, 1, 17);
  assert.equal(addVoter(network, 0, [0]), null);
  assert.equal(network.size, MAX_VOTERS);
});
