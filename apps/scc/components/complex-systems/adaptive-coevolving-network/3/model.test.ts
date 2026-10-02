import assert from "node:assert/strict";
import test from "node:test";
import {
  createCooperationNetwork,
  DEFAULT_PARAMETERS,
  flipPlayer,
  leadingCooperator,
  measureCooperation,
  stepCooperationNetwork,
  type CooperationNetwork,
  type CooperationParameters,
} from "./model.ts";

const SEED = 0x3c6ef372;
const PLAYERS = 240;

function assertConsistent(network: CooperationNetwork) {
  const keys = new Set<string>();
  const degree = new Array<number>(network.size).fill(0);
  const cooperative = new Array<number>(network.size).fill(0);
  for (const tie of network.ties) {
    assert.notEqual(tie.a, tie.b);
    const key = [tie.a, tie.b].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key));
    keys.add(key);
    degree[tie.a]! += 1;
    degree[tie.b]! += 1;
    if (network.strategy[tie.b] === "C") cooperative[tie.a]! += 1;
    if (network.strategy[tie.a] === "C") cooperative[tie.b]! += 1;
  }
  assert.equal(network.pairs.size, network.ties.length);
  network.incident.forEach((list, player) => assert.equal(list.length, degree[player]));
  assert.deepEqual(network.cooperativeNeighbours, cooperative);
}

/** Runs `sweeps` updates per player and returns the network. */
function run(parameters: Partial<CooperationParameters>, sweeps: number, seed = SEED) {
  const network = createCooperationNetwork(PLAYERS, 8, seed, 0.5);
  stepCooperationNetwork(network, PLAYERS * sweeps, { ...DEFAULT_PARAMETERS, ...parameters });
  return network;
}

test("replays deterministically from a seed", () => {
  const first = createCooperationNetwork(120, 6, 7);
  const second = createCooperationNetwork(120, 6, 7);
  assert.deepEqual(
    stepCooperationNetwork(first, 3_000, DEFAULT_PARAMETERS),
    stepCooperationNetwork(second, 3_000, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.strategy, second.strategy);
  assert.deepEqual(first.ties, second.ties);
});

test("switching only leaves defectors, conserves ties and keeps payoffs in step", () => {
  const network = createCooperationNetwork(PLAYERS, 8, SEED, 0.5);
  const ties = network.ties.length;
  for (let round = 0; round < 40; round += 1) {
    const strategies = [...network.strategy];
    const events = stepCooperationNetwork(network, 1, { ...DEFAULT_PARAMETERS, switching: 1 });
    for (const event of events) {
      if (event.kind !== "switch") continue;
      assert.equal(strategies[event.from], "D");
      assert.notEqual(event.to, event.player);
    }
  }
  stepCooperationNetwork(network, PLAYERS * 30, DEFAULT_PARAMETERS);
  assert.equal(network.ties.length, ties);
  assertConsistent(network);
});

test("imitation only copies a neighbour who earns more", () => {
  const network = createCooperationNetwork(PLAYERS, 8, SEED, 0.5);
  for (let round = 0; round < 2_000; round += 1) {
    const before = [...network.cooperativeNeighbours];
    const strategies = [...network.strategy];
    const [event] = stepCooperationNetwork(network, 1, { ...DEFAULT_PARAMETERS, mutation: 0 });
    if (event?.kind !== "imitate") continue;
    const earned = (player: number) => (strategies[player] === "C" ? 1 : DEFAULT_PARAMETERS.temptation) * before[player]!;
    assert.ok(earned(event.model) > earned(event.player));
    assert.equal(network.strategy[event.player], strategies[event.model]);
  }
});

test("on a static network cooperation collapses; with switching it takes over", () => {
  for (const seed of [SEED, 2, 3]) {
    assert.ok(measureCooperation(run({ switching: 0 }, 120, seed)).cooperators < 0.15);
    assert.ok(measureCooperation(run({ switching: 0.6 }, 120, seed)).cooperators > 0.85);
  }
});

test("higher temptation needs more switching", () => {
  // At b = 2.5, p = .1 is not enough, while p = .6 still is.
  assert.ok(measureCooperation(run({ temptation: 2.5, switching: 0.1 }, 120)).cooperators < 0.2);
  assert.ok(measureCooperation(run({ temptation: 2.5, switching: 0.6 }, 120)).cooperators > 0.8);
});

test("switching makes cooperators into hubs", () => {
  const still = measureCooperation(run({ switching: 0 }, 120));
  const moving = run({ switching: 0.3 }, 200);
  const measure = measureCooperation(moving);
  assert.ok(still.hubRatio < 2.5);
  assert.ok(measure.hubRatio > 4);
  const leader = leadingCooperator(moving)!;
  const most = Math.max(...moving.incident.map((list) => list.length));
  assert.equal(moving.incident[leader]!.length, most);
});

test("a fallen leader sets off a larger cascade than an ordinary cooperator", () => {
  const drop = (pick: (network: CooperationNetwork) => number) => {
    let total = 0;
    for (const seed of [SEED, 5, 6, 7]) {
      const network = run({ switching: 0.3 }, 200, seed);
      const before = measureCooperation(network).cooperators;
      flipPlayer(network, pick(network));
      let lowest = before;
      for (let sweep = 0; sweep < 40; sweep += 1) {
        stepCooperationNetwork(network, PLAYERS, DEFAULT_PARAMETERS);
        lowest = Math.min(lowest, measureCooperation(network).cooperators);
      }
      total += before - lowest;
    }
    return total / 4;
  };
  const leader = drop((network) => leadingCooperator(network)!);
  const ordinary = drop((network) => network.strategy.indexOf("C"));
  assert.ok(leader > 0.1);
  assert.ok(leader > ordinary * 1.5);
});

test("flipping respects bounds and keeps payoffs in step", () => {
  const network = createCooperationNetwork(60, 6, 3, 0.5);
  const before = network.strategy[0];
  assert.equal(flipPlayer(network, 0), before === "C" ? "D" : "C");
  assert.equal(flipPlayer(network, -1), null);
  assert.equal(flipPlayer(network, 60), null);
  assertConsistent(network);
  for (let player = 0; player < network.size; player += 1) {
    if (network.strategy[player] === "C") flipPlayer(network, player);
  }
  assert.equal(leadingCooperator(network), null);
});
