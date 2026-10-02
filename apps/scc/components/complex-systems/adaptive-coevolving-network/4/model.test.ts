import assert from "node:assert/strict";
import test from "node:test";
import {
  addFood,
  busiestTube,
  strokeAcross,
  createMould,
  cutTube,
  DEFAULT_PARAMETERS,
  farthestFromFood,
  HEAL_TIME,
  LIVING,
  MAX_FOODS,
  measureMould,
  moveFood,
  nearestJunction,
  removeFood,
  seedFood,
  stepMould,
} from "./model.ts";

const SEED = 0x5f3759df;

function seeded(junctions = 360, aspect = 1.6) {
  const mould = createMould(junctions, aspect, SEED);
  seedFood(mould);
  return mould;
}

function settled(exponent = DEFAULT_PARAMETERS.exponent, duration = 60) {
  const mould = seeded();
  stepMould(mould, duration, { ...DEFAULT_PARAMETERS, exponent });
  return mould;
}

test("the sheet is a simple triangular mesh with consistent incidence", () => {
  const mould = createMould(360, 1.6, SEED);
  const pairs = new Set<string>();
  const degree = new Array<number>(mould.x.length).fill(0);
  for (const tube of mould.tubes) {
    assert.notEqual(tube.a, tube.b);
    const key = [tube.a, tube.b].sort((left, right) => left - right).join(":");
    assert.ok(!pairs.has(key));
    pairs.add(key);
    assert.ok(tube.length > 0.5 && tube.length < 1.5);
    assert.equal(tube.conductance, 1);
    degree[tube.a]! += 1;
    degree[tube.b]! += 1;
  }
  mould.incident.forEach((list, node) => assert.equal(list.length, degree[node]));
  assert.ok(Math.max(...degree) === 6 && Math.min(...degree) >= 2);
  assert.ok(Math.abs(mould.x.length - 360) < 30);
});

test("replays deterministically from a seed", () => {
  const first = seeded();
  const second = seeded();
  assert.deepEqual(stepMould(first, 10, DEFAULT_PARAMETERS), stepMould(second, 10, DEFAULT_PARAMETERS));
  assert.deepEqual(
    first.tubes.map((tube) => tube.conductance),
    second.tubes.map((tube) => tube.conductance),
  );
});

test("flux obeys Kirchhoff: nothing gathers at a junction without food", () => {
  const mould = seeded();
  stepMould(mould, 20, DEFAULT_PARAMETERS);
  stepMould(mould, 0.05, DEFAULT_PARAMETERS);
  const net = new Float64Array(mould.x.length);
  for (const tube of mould.tubes) {
    net[tube.a]! += tube.flux;
    net[tube.b]! -= tube.flux;
  }
  let largestAtFood = 0;
  for (let node = 0; node < net.length; node += 1) {
    if (mould.foods.includes(node)) largestAtFood = Math.max(largestAtFood, Math.abs(net[node]!));
    else assert.ok(Math.abs(net[node]!) < 2e-3, `junction ${node} keeps ${net[node]}`);
  }
  // The source pushes out the whole inflow.
  assert.ok(Math.abs(largestAtFood - DEFAULT_PARAMETERS.inflow) < 1e-2);
});

test("from a uniform sheet, most tubes die and the food stays joined", () => {
  const start = measureMould(seeded());
  const mould = settled();
  const end = measureMould(mould);
  assert.equal(start.living, seeded().tubes.length);
  assert.ok(end.living < start.living * 0.12);
  assert.ok(end.connected);
  for (const tube of mould.tubes) assert.ok(tube.conductance >= 0 && tube.conductance <= 1);
});

test("a low exponent keeps a looped mesh; a high exponent leaves a single tree", () => {
  const redundant = measureMould(settled(0.8, 80));
  const efficient = measureMould(settled(1.4, 80));
  assert.ok(redundant.connected && efficient.connected);
  assert.ok(redundant.loops >= 15, `loops at μ .8: ${redundant.loops}`);
  assert.equal(efficient.loops, 0);
  assert.ok(redundant.length > 4 * efficient.length);
  // Every tube of the tree is a single point of failure; the mesh has almost none.
  assert.ok(efficient.fragile > 0.95);
  assert.ok(redundant.fragile < 0.05);
});

test("cutting the busiest tubes reroutes the flow within a few time units", () => {
  const mould = settled();
  const untouched = settled();
  const crossed = strokeAcross(mould, busiestTube(mould)!);
  for (const id of crossed) assert.equal(cutTube(mould, id), true);
  assert.ok(crossed.length >= 3);
  for (const id of crossed) assert.equal(mould.tubes[id]!.conductance, 0);
  stepMould(mould, 8, DEFAULT_PARAMETERS);
  stepMould(untouched, 8, DEFAULT_PARAMETERS);
  assert.ok(measureMould(mould).connected);
  for (const id of crossed) assert.equal(mould.tubes[id]!.cutUntil !== null, true);
  // The detour is made of tubes that the uncut twin left thin.
  const detour = mould.tubes.filter(
    (tube) => tube.conductance >= LIVING && untouched.tubes[tube.id]!.conductance < LIVING,
  );
  assert.ok(detour.length >= 3, `detour tubes: ${detour.length}`);
});

test("cut tubes grow back thin after the healing time", () => {
  const mould = settled(DEFAULT_PARAMETERS.exponent, 10);
  const tube = mould.tubes[0]!;
  assert.equal(cutTube(mould, tube.id), true);
  assert.equal(cutTube(mould, tube.id), false);
  const events = stepMould(mould, HEAL_TIME + 0.1, DEFAULT_PARAMETERS);
  assert.ok(events.some((event) => event.kind === "heal" && event.tube === tube.id));
  assert.equal(tube.cutUntil, null);
  assert.ok(tube.conductance > 0);
});

test("new food is joined to the network, and the network grows to reach it", () => {
  const mould = settled();
  const before = measureMould(mould);
  const food = nearestJunction(mould, 0.85 * mould.width, 0.7 * mould.height);
  assert.equal(addFood(mould, food), true);
  stepMould(mould, 12, DEFAULT_PARAMETERS);
  const after = measureMould(mould);
  assert.ok(after.connected);
  assert.ok(after.length > before.length + 5);
  assert.ok(mould.incident[food]!.some((id) => mould.tubes[id]!.conductance >= LIVING));
});

test("with fewer than two foods nothing flows and every tube withers", () => {
  const mould = settled();
  while (mould.foods.length > 1) removeFood(mould, mould.foods[0]!);
  stepMould(mould, 5, DEFAULT_PARAMETERS);
  assert.equal(measureMould(mould).living, 0);
});

test("food placement respects bounds", () => {
  const mould = createMould(240, 1, SEED);
  assert.equal(addFood(mould, -1), false);
  while (mould.foods.length < MAX_FOODS) assert.equal(addFood(mould, farthestFromFood(mould)), true);
  assert.equal(new Set(mould.foods).size, MAX_FOODS);
  assert.equal(addFood(mould, 0), false);
  const [first, second] = mould.foods;
  assert.equal(moveFood(mould, first!, second!), false);
  assert.equal(addFood(mould, second!), false);
  assert.equal(removeFood(mould, first!), true);
  assert.equal(removeFood(mould, first!), false);
});
