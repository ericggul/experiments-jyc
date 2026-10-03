import assert from "node:assert/strict";
import test from "node:test";
import { archetypeIds, personas } from "./personas.ts";
import { createPopulation } from "./population.ts";

test("population is deterministic for a seed and changes with the seed", () => {
  assert.deepEqual(createPopulation(40, 7), createPopulation(40, 7));
  assert.notDeepEqual(createPopulation(40, 7), createPopulation(40, 8));
});

test("archetype weights sum to 100 and draws cover most archetypes", () => {
  assert.equal(archetypeIds.reduce((sum, id) => sum + personas[id].weight, 0), 100);
  const seen = new Set(createPopulation(150, 1).map((owner) => owner.archetype));
  assert.ok(seen.size >= 10, `only ${seen.size} archetypes drawn`);
});

test("homes, workplaces and alarms follow the archetype", () => {
  for (const owner of createPopulation(150, 2)) {
    const persona = personas[owner.archetype];
    assert.ok(persona.places.home.includes(owner.home), `${owner.home} for ${owner.archetype}`);
    assert.ok(persona.places.work.includes(owner.work), `${owner.work} for ${owner.archetype}`);
    if (persona.alarm === null) assert.equal(owner.alarm, null);
    else assert.ok(owner.alarm !== null && Math.abs(owner.alarm - persona.alarm) <= persona.alarmSd * 4 + 5);
    if (owner.archetype === "remote-late" || owner.archetype === "new-parent") assert.equal(owner.work, "Home");
    if (owner.archetype === "gig-courier") assert.equal(owner.work, "Citywide");
  }
});
