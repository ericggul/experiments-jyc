import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneEcosystem,
  createEcosystem,
  DEFAULT_LINKAGE,
  hasLink,
  measureEcosystem,
  removeSpecies,
  updateEcosystem,
  type Ecosystem,
} from "./model.ts";

const SEED = 9;

function assertConsistent(ecosystem: Ecosystem) {
  const { size, links, population, role } = ecosystem;
  let total = 0;
  for (let species = 0; species < size; species += 1) {
    assert.equal(links[species * size + species], 0);
    for (const to of ecosystem.out[species]!) assert.ok(hasLink(ecosystem, species, to));
    for (const from of ecosystem.into[species]!) assert.ok(hasLink(ecosystem, from, species));
    const value = population[species]!;
    assert.ok(value >= 0);
    assert.equal(value > 0, role[species] !== "absent");
    total += value;
  }
  let linkCount = 0;
  for (const value of links) linkCount += value;
  assert.equal(linkCount, measureEcosystem(ecosystem).links);
  assert.ok(Math.abs(total - 1) < 1e-9);
}

/** Spectral radius of the whole graph, by plain power iteration on C + I. */
function spectralRadius(ecosystem: Ecosystem) {
  const { size } = ecosystem;
  let vector = new Float64Array(size).fill(1);
  let radius = 0;
  for (let iteration = 0; iteration < 20_000; iteration += 1) {
    const next = new Float64Array(size);
    for (let species = 0; species < size; species += 1) {
      next[species] = vector[species]!;
      for (const from of ecosystem.into[species]!) next[species] += vector[from]!;
    }
    let norm = 0;
    for (const value of next) norm = Math.max(norm, value);
    radius = norm - 1;
    vector = next.map((value) => value / norm);
  }
  return radius;
}

/** Mean number of living species over a run. */
function meanLiving(linkage: number, updates = 600, seed = SEED) {
  const ecosystem = createEcosystem(60, linkage, seed);
  let sum = 0;
  for (let step = 0; step < updates; step += 1) {
    updateEcosystem(ecosystem, linkage);
    sum += measureEcosystem(ecosystem).living;
  }
  return sum / updates;
}

test("replays deterministically from a seed", () => {
  const first = createEcosystem(60, DEFAULT_LINKAGE, 3);
  const second = createEcosystem(60, DEFAULT_LINKAGE, 3);
  for (let step = 0; step < 200; step += 1) {
    assert.deepEqual(updateEcosystem(first, DEFAULT_LINKAGE), updateEcosystem(second, DEFAULT_LINKAGE));
  }
  assert.deepEqual(first.population, second.population);
  assert.deepEqual(first.role, second.role);
});

test("populations stay a normalized attractor and links stay simple", () => {
  const ecosystem = createEcosystem(60, DEFAULT_LINKAGE, SEED);
  for (let step = 0; step < 400; step += 1) {
    updateEcosystem(ecosystem, DEFAULT_LINKAGE);
    assertConsistent(ecosystem);
    if (ecosystem.lambda >= 1) {
      // An autocatalytic set: every living species is catalysed by a living one.
      for (let species = 0; species < ecosystem.size; species += 1) {
        if (ecosystem.population[species]! === 0) continue;
        assert.ok(ecosystem.into[species]!.some((from) => ecosystem.population[from]! > 0));
      }
    }
  }
});

test("the attractor is the Perron vector: Cx = λx on the living species", () => {
  const ecosystem = createEcosystem(60, DEFAULT_LINKAGE, SEED);
  for (let step = 0; step < 300; step += 1) updateEcosystem(ecosystem, DEFAULT_LINKAGE);
  assert.ok(ecosystem.lambda >= 1);
  assert.ok(Math.abs(spectralRadius(ecosystem) - ecosystem.lambda) < 1e-4);
  for (let species = 0; species < ecosystem.size; species += 1) {
    let inflow = 0;
    for (const from of ecosystem.into[species]!) inflow += ecosystem.population[from]!;
    if (ecosystem.population[species]! > 0) {
      assert.ok(Math.abs(inflow - ecosystem.lambda * ecosystem.population[species]!) < 1e-6);
    }
  }
});

test("without a cycle only the ends of the longest paths hold population", () => {
  const ecosystem = createEcosystem(60, 0.15, 1);
  assert.equal(ecosystem.lambda, 0);
  const living = measureEcosystem(ecosystem).living;
  assert.ok(living > 0 && living < 10);
  for (let species = 0; species < ecosystem.size; species += 1) {
    if (ecosystem.population[species]! > 0) {
      assert.ok(ecosystem.out[species]!.every((to) => ecosystem.population[to] === 0));
    }
  }
});

test("each update replaces a least-populated species with a newcomer", () => {
  const ecosystem = createEcosystem(60, DEFAULT_LINKAGE, SEED);
  for (let step = 0; step < 100; step += 1) {
    const before = ecosystem.population.slice();
    const identities = [...ecosystem.identity];
    const event = updateEcosystem(ecosystem, DEFAULT_LINKAGE);
    assert.equal(before[event.species], Math.min(...before));
    assert.notEqual(ecosystem.identity[event.species], identities[event.species]);
    assert.equal(ecosystem.identity.filter((id, species) => id !== identities[species]).length, 1);
  }
});

test("dense linking builds the autocatalytic set sooner and keeps more species alive", () => {
  assert.ok(meanLiving(0.15) < 10);
  assert.ok(meanLiving(0.5) > 30);
  assert.ok(meanLiving(0.9) > 45);
});

test("removing a core species can crash the ecosystem; removing a peripheral one barely matters", () => {
  const ecosystem = createEcosystem(60, DEFAULT_LINKAGE, SEED);
  for (let step = 0; step < 300; step += 1) updateEcosystem(ecosystem, DEFAULT_LINKAGE);
  const living = measureEcosystem(ecosystem).living;
  assert.ok(living > 50);
  const loss = (species: number) => {
    const trial = cloneEcosystem(ecosystem);
    removeSpecies(trial, species, DEFAULT_LINKAGE);
    return living - measureEcosystem(trial).living;
  };
  const coreLoss: number[] = [];
  const peripheryLoss: number[] = [];
  ecosystem.role.forEach((role, species) => {
    if (role === "core") coreLoss.push(loss(species));
    else if (role === "periphery") peripheryLoss.push(loss(species));
  });
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(Math.max(...coreLoss) >= 0.3 * living);
  assert.ok(mean(coreLoss) > 3 * mean(peripheryLoss));
  assert.equal(measureEcosystem(ecosystem).living, living);
});

test("removal respects bounds", () => {
  const ecosystem = createEcosystem(40, DEFAULT_LINKAGE, 2);
  assert.equal(removeSpecies(ecosystem, -1), null);
  assert.equal(removeSpecies(ecosystem, 40), null);
  const event = removeSpecies(ecosystem, 5);
  assert.equal(event?.cause, "removed");
  assertConsistent(ecosystem);
});
