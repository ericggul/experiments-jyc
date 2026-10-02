import assert from "node:assert/strict";
import test from "node:test";
import {
  addExtremist,
  componentLabels,
  createOpinionNetwork,
  DEFAULT_PARAMETERS,
  MAX_PEOPLE,
  measureOpinions,
  setOpinion,
  setStubborn,
  stepOpinionNetwork,
  type OpinionNetwork,
} from "./model.ts";

const SEED = 0x5bd1e995;

function assertConsistent(network: OpinionNetwork) {
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
  for (const opinion of network.opinions) assert.ok(opinion >= 0 && opinion <= 1);
}

function settled(tolerance: number, rewiring: number, duration = 60) {
  const network = createOpinionNetwork(240, 6, SEED);
  stepOpinionNetwork(network, duration, { ...DEFAULT_PARAMETERS, tolerance, rewiring });
  return network;
}

/** The person with most ties, and everyone currently sharing their opinion. */
function hub(network: OpinionNetwork) {
  let person = 0;
  for (let other = 0; other < network.size; other += 1) {
    if (network.incident[other]!.length > network.incident[person]!.length) person = other;
  }
  const opinion = network.opinions[person]!;
  const group = network.opinions
    .map((value, other) => ({ value, other }))
    .filter(({ value, other }) => other !== person && Math.abs(value - opinion) < 0.03)
    .map(({ other }) => other);
  return { person, opinion, group };
}

function meanOpinion(network: OpinionNetwork, group: readonly number[]) {
  return group.reduce((sum, person) => sum + network.opinions[person]!, 0) / group.length;
}

test("replays deterministically from a seed", () => {
  const first = createOpinionNetwork(120, 6, 7);
  const second = createOpinionNetwork(120, 6, 7);
  assert.deepEqual(
    stepOpinionNetwork(first, 30, DEFAULT_PARAMETERS),
    stepOpinionNetwork(second, 30, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.opinions, second.opinions);
  assert.deepEqual(first.ties, second.ties);
});

test("rewiring keeps the number of ties and a simple graph", () => {
  const network = createOpinionNetwork(200, 6, 11);
  const ties = network.ties.length;
  const events = stepOpinionNetwork(network, 20, { ...DEFAULT_PARAMETERS, rewiring: 1 });
  assert.ok(events.some((event) => event.kind === "cut"));
  assert.equal(network.ties.length, ties);
  assertConsistent(network);
});

test("compromise happens only within tolerance and conserves the pair's mean", () => {
  const network = createOpinionNetwork(3, 1, 5);
  const parameters = { ...DEFAULT_PARAMETERS, noise: 0, rewiring: 0, tolerance: 0.2 };
  const [tie] = network.ties;
  const third = 3 - tie!.a - tie!.b;
  setOpinion(network, third, 1);
  setOpinion(network, tie!.a, 0.4);
  setOpinion(network, tie!.b, 0.55);
  stepOpinionNetwork(network, 20, parameters);
  assert.ok(Math.abs(network.opinions[tie!.a]! - 0.475) < 1e-6);
  assert.ok(Math.abs(network.opinions[tie!.b]! - 0.475) < 1e-6);
  setOpinion(network, third, 0.5);
  setOpinion(network, tie!.a, 0.1);
  setOpinion(network, tie!.b, 0.9);
  stepOpinionNetwork(network, 20, parameters);
  assert.equal(network.opinions[tie!.a], 0.1);
  assert.equal(network.opinions[tie!.b], 0.9);
});

test("a cut always leaves a tie that was beyond tolerance", () => {
  const network = createOpinionNetwork(200, 6, 13);
  const parameters = { ...DEFAULT_PARAMETERS, rewiring: 1, noise: 0 };
  const before = [...network.opinions];
  const events = stepOpinionNetwork(network, 0.05, parameters);
  const cuts = events.filter((event) => event.kind === "cut");
  assert.ok(cuts.length > 0);
  for (const event of cuts) {
    if (event.kind !== "cut") continue;
    // Opinions may have moved earlier in the same step, so allow the compromise step.
    assert.ok(Math.abs(before[event.person]! - before[event.from]!) >= parameters.tolerance * (1 - parameters.convergence) - 1e-9);
  }
});

test("wider tolerance leaves fewer opinion groups", () => {
  const narrow = measureOpinions(settled(0.1, 0.3), 0.1);
  const wide = measureOpinions(settled(0.3, 0.3), 0.3);
  assert.ok(narrow.clusters >= 4, `narrow ${narrow.clusters}`);
  assert.ok(wide.clusters <= 2, `wide ${wide.clusters}`);
});

test("rewiring sorts the ties along opinion; without it half the ties stay intolerable", () => {
  const fixed = measureOpinions(settled(0.15, 0), 0.15);
  const rewired = measureOpinions(settled(0.15, 0.6), 0.15);
  assert.ok(fixed.intolerantTies > 0.4, `fixed ${fixed.intolerantTies}`);
  assert.ok(rewired.intolerantTies < 0.1, `rewired ${rewired.intolerantTies}`);
  assert.equal(fixed.components, 1);
});

test("rewiring splits the network into pieces that each hold one opinion", () => {
  const fixed = settled(0.15, 0, 90);
  const rewired = settled(0.15, 1, 90);
  assert.equal(measureOpinions(fixed, 0.15).largestComponent, 1);
  const split = measureOpinions(rewired, 0.15);
  assert.ok(split.largestComponent < 0.85, `largest piece ${split.largestComponent}`);
  // Inside the largest piece, opinions agree within tolerance.
  const { labels } = componentLabels(rewired);
  const sizes = new Map<number, number>();
  for (const label of labels) sizes.set(label, (sizes.get(label) ?? 0) + 1);
  const largest = [...sizes].sort((a, b) => b[1] - a[1])[0]![0];
  const inside = rewired.opinions.filter((_, person) => labels[person] === largest).sort((a, b) => a - b);
  assert.ok(inside.at(-1)! - inside[0]! < 0.3, `spread ${inside.at(-1)! - inside[0]!}`);
});

test("a stubborn person within tolerance draws their group; beyond it they are cut off", () => {
  const outcomes = [0.1, 0.25].map((offset) => {
    const network = settled(0.15, 0.3, 40);
    const { person, opinion, group } = hub(network);
    const target = opinion + (opinion < 0.5 ? offset : -offset);
    setStubborn(network, person, true);
    setOpinion(network, person, target);
    const start = meanOpinion(network, group);
    stepOpinionNetwork(network, 50, { ...DEFAULT_PARAMETERS, tolerance: 0.15, rewiring: 0.3 });
    assert.equal(network.opinions[person], target);
    return {
      moved: Math.abs(meanOpinion(network, group) - start) / offset,
      ties: network.incident[person]!.length,
    };
  });
  assert.ok(outcomes[0]!.moved > 0.7, `within ${outcomes[0]!.moved}`);
  assert.ok(outcomes[1]!.moved < 0.4, `beyond ${outcomes[1]!.moved}`);
  assert.ok(outcomes[1]!.ties < outcomes[0]!.ties);
});

test("noise moves ordinary people but never stubborn ones", () => {
  const network = createOpinionNetwork(100, 6, 17);
  setStubborn(network, 0, true);
  const opinion = network.opinions[0];
  const events = stepOpinionNetwork(network, 50, { ...DEFAULT_PARAMETERS, noise: 0.05, rewiring: 0, tolerance: 0 });
  assert.ok(events.some((event) => event.kind === "jump"));
  assert.ok(events.every((event) => event.kind !== "jump" || event.person !== 0));
  assert.equal(network.opinions[0], opinion);
});

test("extremists and imposed opinions respect bounds", () => {
  const network = createOpinionNetwork(MAX_PEOPLE - 1, 4, 3);
  assert.equal(setOpinion(network, 0, 1.4), true);
  assert.equal(network.opinions[0], 1);
  assert.equal(setOpinion(network, -1, 0.5), false);
  const person = addExtremist(network, -0.2, [1, 2, 2, 3]);
  assert.equal(person, MAX_PEOPLE - 1);
  assert.equal(network.opinions[person!], 0);
  assert.equal(network.stubborn[person!], true);
  assert.equal(network.incident[person!]!.length, 3);
  assert.equal(addExtremist(network, 1, [0]), null);
  assertConsistent(network);
});
