import assert from "node:assert/strict";
import test from "node:test";
import {
  CYST,
  DIVIDING,
  DIVISION_TICKS,
  census,
  createColony,
  defaultParameters,
  spawnCell,
  stepColony,
  type Colony,
} from "./index.ts";

const SEED = 7;

function run(colony: Colony, ticks: number) {
  for (let t = 0; t < ticks; t += 1) stepColony(colony);
  return colony;
}

function living(colony: Colony) {
  const counts = census(colony);
  return counts.active + counts.dividing;
}

function spread(colony: Colony, lineage?: number) {
  let farthest = 0;
  for (let i = 0; i < colony.count; i += 1) {
    if (colony.state[i] === CYST || (lineage !== undefined && colony.lineage[i] !== lineage)) continue;
    farthest = Math.max(farthest, Math.hypot(colony.x[i], colony.y[i]));
  }
  return farthest;
}

test("the same seed gives the same colony", () => {
  const a = run(createColony(SEED), 600);
  const b = run(createColony(SEED), 600);
  assert.equal(a.count, b.count);
  assert.deepEqual(a.x.subarray(0, a.count), b.x.subarray(0, b.count));
});

test("division splits mass equally and keeps the lineage", () => {
  const colony = createColony(SEED, { ...defaultParameters, foodCapacity: 0 });
  const start = defaultParameters.divideMass + defaultParameters.cost * 2;
  colony.mass[0] = start;
  stepColony(colony);
  assert.equal(colony.state[0], DIVIDING);
  run(colony, DIVISION_TICKS);
  assert.equal(colony.count, 2);
  assert.equal(colony.mass[0], colony.mass[1]);
  const expected = start - defaultParameters.cost * (DIVISION_TICKS + 1);
  assert.ok(Math.abs(colony.mass[0] + colony.mass[1] - expected) < 1e-4);
  assert.equal(colony.lineage[1], colony.lineage[0]);
});

test("a click founds a new lineage only on free medium", () => {
  const colony = createColony(SEED);
  assert.equal(spawnCell(colony, 0, 0), false);
  assert.equal(spawnCell(colony, 2, 0), false);
  assert.equal(spawnCell(colony, 0.5, 0.2), true);
  assert.equal(colony.lineage[colony.count - 1], 1);
});

test("one founder becomes a plaque reaching most of the dish in 30 seconds", () => {
  const colony = run(createColony(SEED), 900);
  assert.ok(living(colony) > 300, `living ${living(colony)}`);
  assert.ok(spread(colony) > 0.7, `spread ${spread(colony)}`);
  assert.equal(colony.capacityHits, 0);
});

test("two founders hold separate territories", () => {
  const colony = run(createColony(SEED, defaultParameters, [[-0.4, 0], [0.4, 0.1]]), 900);
  let strays = 0;
  let total = 0;
  for (let i = 0; i < colony.count; i += 1) {
    if (colony.state[i] === CYST) continue;
    total += 1;
    if ((colony.lineage[i] === 0) !== colony.x[i] < 0) strays += 1;
  }
  assert.ok(strays / total < 0.1, `strays ${strays}/${total}`);
});

test("slower movers make a visibly smaller colony", () => {
  const usual = spread(run(createColony(SEED), 600));
  const slow = spread(run(createColony(SEED, { ...defaultParameters, speed: 0.00036 }), 600));
  assert.ok(slow < usual * 0.4, `slow ${slow} usual ${usual}`);
});

test("the dish blooms again and again without dying out or hitting capacity", () => {
  const colony = createColony(SEED);
  let blooms = 0;
  let quiet = true;
  for (let t = 1; t <= 12_000; t += 1) {
    stepColony(colony);
    if (t % 150 !== 0) continue;
    const alive = living(colony);
    if (quiet && alive > 150) {
      blooms += 1;
      quiet = false;
    } else if (!quiet && alive < 15) quiet = true;
  }
  assert.ok(blooms >= 2, `blooms ${blooms}`);
  assert.ok(colony.count > 0);
  assert.equal(colony.capacityHits, 0);
});
