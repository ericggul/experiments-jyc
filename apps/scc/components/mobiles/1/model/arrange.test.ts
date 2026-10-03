import assert from "node:assert/strict";
import test from "node:test";
import { arrange } from "./arrange.ts";
import { planDay } from "./plan-day.ts";
import { createPopulation } from "./population.ts";

const owners = createPopulation(30, 3);
const plans = owners.map((owner) => planDay(owner, 0));

test("every arrangement is a permutation of the population", () => {
  for (const arrangement of ["random", "archetype", "wake"] as const) {
    const order = arrange(owners, plans, arrangement, 3);
    assert.deepEqual([...order].sort((a, b) => a - b), owners.map((_, index) => index));
  }
});

test("wake arrangement seats early risers first", () => {
  const order = arrange(owners, plans, "wake", 3);
  for (let i = 1; i < order.length; i++) assert.ok(plans[order[i - 1]].wake <= plans[order[i]].wake);
});

test("random arrangement is stable for a seed", () => {
  assert.deepEqual(arrange(owners, plans, "random", 9), arrange(owners, plans, "random", 9));
});
