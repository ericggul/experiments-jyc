import assert from "node:assert/strict";
import test from "node:test";
import {
  CYST,
  DIVIDING,
  DIVISION_TICKS,
  MIN_CYCLE_TICKS,
  census,
  createColony,
  defaultParameters,
  radiusOf,
  spawnCell,
  splitGeometry,
  stepColony,
  type Colony,
} from "./index.ts";

const SEED = 7;
const WIDE = 16 / 9;

function run(colony: Colony, ticks: number) {
  for (let t = 0; t < ticks; t += 1) stepColony(colony);
  return colony;
}

function living(colony: Colony) {
  const counts = census(colony);
  return counts.active + counts.dividing;
}

function livingRadii(colony: Colony) {
  const radii: number[] = [];
  for (let i = 0; i < colony.count; i += 1) if (colony.state[i] !== CYST) radii.push(radiusOf(colony.mass[i]));
  return radii.sort((a, b) => a - b);
}

test("the same seed gives the same colony", () => {
  const a = run(createColony(SEED, defaultParameters, [[0, 0]], WIDE), 600);
  const b = run(createColony(SEED, defaultParameters, [[0, 0]], WIDE), 600);
  assert.equal(a.count, b.count);
  assert.deepEqual(a.x.subarray(0, a.count), b.x.subarray(0, b.count));
});

test("division conserves mass and ends exactly where the dividing shape ends", () => {
  const colony = createColony(SEED, { ...defaultParameters, foodCapacity: 0, cost: 0 }, [], WIDE);
  assert.ok(spawnCell(colony, 0, 0, 2));
  colony.tick = MIN_CYCLE_TICKS;
  colony.mass[0] = defaultParameters.divideMass * 4;
  const mass = colony.mass[0];
  const radius = radiusOf(mass);
  const [x, y] = [colony.x[0], colony.y[0]];
  stepColony(colony);
  assert.equal(colony.state[0], DIVIDING);
  const split = colony.split[0];
  run(colony, DIVISION_TICKS);
  assert.equal(colony.count, 2);
  assert.equal(colony.lineage[1], colony.lineage[0]);
  assert.ok(Math.abs(colony.mass[0] + colony.mass[1] - mass) < 1e-4, "mass is conserved");
  const g = splitGeometry(split);
  assert.ok(Math.abs(radiusOf(colony.mass[0]) - g.radiusA * radius) < 1e-5, "half A has the drawn radius");
  assert.ok(Math.abs(radiusOf(colony.mass[1]) - g.radiusB * radius) < 1e-5, "half B has the drawn radius");
  // Centre of mass is unchanged (before any contact push).
  const cx = (colony.x[0] * colony.mass[0] + colony.x[1] * colony.mass[1]) / mass;
  const cy = (colony.y[0] * colony.mass[0] + colony.y[1] * colony.mass[1]) / mass;
  assert.ok(Math.hypot(cx - x, cy - y) < radius * 0.05, "centre of mass stays");
  for (const i of [0, 1]) {
    assert.ok(colony.mass[i] < defaultParameters.divideMass * colony.size[i] ** 2, "a half is not already due to divide");
  }
});

test("sizes vary continuously: no drawn body jumps in size between ticks except by its own growth", () => {
  const colony = createColony(SEED, defaultParameters, [[0, 0]], WIDE);
  const radiusById = new Map<number, number>();
  let worst = 0;
  for (let t = 0; t < 1800; t += 1) {
    stepColony(colony);
    for (let i = 0; i < colony.count; i += 1) {
      const id = colony.id[i];
      const r = radiusOf(colony.mass[i]);
      const last = radiusById.get(id);
      if (last !== undefined && colony.born[i] !== colony.tick - 1) worst = Math.max(worst, Math.abs(r - last) / last);
      radiusById.set(id, r);
    }
  }
  assert.ok(worst < 0.05, `largest per-tick radius change ${(worst * 100).toFixed(1)}%`);
});

test("a click founds a new lineage only on free medium inside the zone", () => {
  const colony = createColony(SEED, defaultParameters, [[0, 0]], WIDE);
  assert.equal(spawnCell(colony, 0, 0, 1), false);
  assert.equal(spawnCell(colony, WIDE + 0.1, 0, 1), false);
  assert.equal(spawnCell(colony, 1.4, 0.2, 1), true);
  assert.equal(colony.lineage[colony.count - 1], 1);
});

test("bodies in one colony differ widely in size", () => {
  const radii = livingRadii(run(createColony(SEED, defaultParameters, [[0, 0]], WIDE), 900));
  assert.ok(radii.length > 300, `living ${radii.length}`);
  const spread = radii[Math.floor(radii.length * 0.95)] / radii[Math.floor(radii.length * 0.05)];
  assert.ok(spread > 4, `95th/5th radius ${spread.toFixed(2)}`);
});

test("bodies stay inside the zone", () => {
  const colony = run(createColony(SEED, defaultParameters, [[0, 0]], WIDE), 900);
  for (let i = 0; i < colony.count; i += 1) {
    const r = radiusOf(colony.mass[i]);
    assert.ok(Math.abs(colony.x[i]) <= WIDE - r + 1e-5 && Math.abs(colony.y[i]) <= 1 - r + 1e-5);
  }
});

test("the zone blooms again and again without dying out or hitting capacity", () => {
  const colony = createColony(SEED, defaultParameters, [[0, 0]], WIDE);
  let blooms = 0;
  let quiet = true;
  for (let t = 1; t <= 12_000; t += 1) {
    stepColony(colony);
    if (t % 150 !== 0) continue;
    const alive = living(colony);
    if (quiet && alive > 300) {
      blooms += 1;
      quiet = false;
    } else if (!quiet && alive < 40) quiet = true;
  }
  assert.ok(blooms >= 2, `blooms ${blooms}`);
  assert.ok(living(colony) > 0);
  assert.equal(colony.capacityHits, 0);
});
