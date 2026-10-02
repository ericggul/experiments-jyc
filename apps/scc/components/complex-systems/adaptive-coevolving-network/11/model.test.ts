import assert from "node:assert/strict";
import test from "node:test";
import {
  announce,
  createMultiplex,
  DEFAULT_PARAMETERS,
  infectPerson,
  measureMultiplex,
  otherEnd,
  stepMultiplex,
  type Multiplex,
  type MultiplexParameters,
} from "./model.ts";

const SEEDS = [7919, 15838, 23757, 31676, 39595];

function assertConsistent(network: Multiplex) {
  const keys = new Set<string>();
  const degree = new Array<number>(network.size).fill(0);
  for (const tie of network.physical) {
    assert.notEqual(tie.a, tie.b);
    const key = [tie.a, tie.b].sort((left, right) => left - right).join(":");
    assert.ok(!keys.has(key));
    keys.add(key);
    degree[tie.a]! += 1;
    degree[tie.b]! += 1;
  }
  assert.equal(network.physicalPairs.size, network.physical.length);
  network.physicalIncident.forEach((list, person) => assert.equal(list.length, degree[person]));
  network.infected.forEach((ill, person) => assert.ok(!ill || network.aware[person]));
}

/** Mean infected share over seeds after `duration` units from a 3% outbreak. */
function prevalence(parameters: Partial<MultiplexParameters>, duration = 80) {
  let sum = 0;
  for (const seed of SEEDS) {
    const network = createMultiplex(240, seed, 0.03);
    stepMultiplex(network, duration, { ...DEFAULT_PARAMETERS, importation: 0, ...parameters });
    sum += measureMultiplex(network).infected;
  }
  return sum / SEEDS.length;
}

test("replays deterministically from a seed", () => {
  const first = createMultiplex(160, 7);
  const second = createMultiplex(160, 7);
  assert.deepEqual(
    stepMultiplex(first, 30, DEFAULT_PARAMETERS),
    stepMultiplex(second, 30, DEFAULT_PARAMETERS),
  );
  assert.deepEqual(first.aware, second.aware);
  assert.deepEqual(first.physical, second.physical);
});

test("news travels only on virtual ties; avoidance only moves contacts of aware people", () => {
  const network = createMultiplex(240, 11, 0.3);
  const virtualBefore = network.virtual.map((tie) => [tie.a, tie.b]);
  const contacts = network.physical.length;
  for (let step = 0; step < 40; step += 1) {
    const aware = [...network.aware];
    const infected = [...network.infected];
    const events = stepMultiplex(network, 0.05, { ...DEFAULT_PARAMETERS, avoidance: 3 });
    for (const event of events) {
      if (event.kind === "inform") {
        assert.equal(aware[event.person], false);
        assert.equal(aware[event.source], true);
        const linked = network.virtualIncident[event.person]!.some(
          (tieId) => otherEnd(network.virtual[tieId]!, event.person) === event.source,
        );
        assert.ok(linked);
      } else if (event.kind === "avoid") {
        assert.equal(aware[event.person], true);
        assert.equal(infected[event.person], false);
        assert.equal(infected[event.from], true);
        assert.equal(infected[event.to], false);
      }
    }
    assertConsistent(network);
  }
  assert.equal(network.physical.length, contacts);
  assert.deepEqual(network.virtual.map((tie) => [tie.a, tie.b]), virtualBefore);
});

test("news outruns the disease from a single case", () => {
  // No protective response, so the epidemic runs at full speed.
  const parameters = { ...DEFAULT_PARAMETERS, protection: 1, avoidance: 0, importation: 0 };
  for (const seed of SEEDS) {
    const network = createMultiplex(240, seed, 0);
    infectPerson(network, 0);
    let awareAt = Infinity;
    let infectedAt = Infinity;
    for (let time = 0; time < 120 && infectedAt === Infinity; time += 0.5) {
      stepMultiplex(network, 0.5, parameters);
      const measure = measureMultiplex(network);
      if (measure.aware >= 0.2 && awareAt === Infinity) awareAt = time;
      if (measure.infected >= 0.2) infectedAt = time;
    }
    assert.ok(Number.isFinite(infectedAt), `outbreak took off (seed ${seed})`);
    assert.ok(awareAt < infectedAt, `news reached 20% first (seed ${seed})`);
  }
});

test("fast news contains an outbreak that slow news lets become endemic", () => {
  assert.ok(prevalence({ information: 0.03 }) > 0.15);
  assert.equal(prevalence({ information: 0.3 }), 0);
  assert.equal(prevalence({}), 0);
});

test("with the same news, avoidance decides containment", () => {
  assert.ok(prevalence({ information: 0.2, avoidance: 0 }) > 0.15);
  assert.equal(prevalence({ information: 0.2, avoidance: 0.5 }), 0);
});

test("news does nothing to the disease when aware people do not change behaviour", () => {
  const neutral = { protection: 1, avoidance: 0 };
  const quiet = prevalence({ ...neutral, information: 0 });
  const loud = prevalence({ ...neutral, information: 0.6 });
  assert.ok(Math.abs(quiet - loud) < 0.08);
  assert.ok(quiet > 0.3);
});

test("raising news speed clears an established epidemic", () => {
  let cleared = 0;
  for (const seed of SEEDS) {
    const network = createMultiplex(240, seed, 0.03);
    stepMultiplex(network, 60, { ...DEFAULT_PARAMETERS, information: 0.03, importation: 0 });
    assert.ok(measureMultiplex(network).infected > 0.1);
    stepMultiplex(network, 90, { ...DEFAULT_PARAMETERS, information: 0.6, importation: 0 });
    if (measureMultiplex(network).infected === 0) cleared += 1;
  }
  assert.ok(cleared >= 4);
});

test("announcing informs exactly the person and their news contacts", () => {
  const network = createMultiplex(120, 3, 0);
  const contacts = new Set(network.virtualIncident[5]!.map((tieId) => otherEnd(network.virtual[tieId]!, 5)));
  const informed = announce(network, 5);
  assert.deepEqual(new Set(informed), new Set([5, ...contacts]));
  assert.equal(network.aware.filter(Boolean).length, contacts.size + 1);
  assert.deepEqual(announce(network, 5), []);
  assert.deepEqual(announce(network, -1), []);
  assert.equal(infectPerson(network, 5), true);
  assert.equal(infectPerson(network, 5), false);
  assertConsistent(network);
});
