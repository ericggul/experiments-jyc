import assert from "node:assert/strict";
import test from "node:test";
import { panels, nodes } from "./configurations.ts";
import { spectralRadius } from "./spectral.ts";
import { SHOCK, createDistress, propagate, quiet, shock } from "./distress.ts";

test("transcribed panels reproduce the λmax printed in Fig. 3", () => {
  for (const panel of panels) {
    assert.ok(Math.abs(spectralRadius(panel.links) - panel.printed) < 5e-4, `${panel.id}: ${spectralRadius(panel.links)} vs ${panel.printed}`);
  }
});

test("new and reweighted links match the figure's blue and red links", () => {
  const byId = Object.fromEntries(panels.map((panel) => [panel.id, panel]));
  assert.deepEqual([...byId.b.added], ["3>1"]);
  assert.deepEqual([...byId.b.changed].sort(), ["3>4", "3>7"]);
  assert.deepEqual([...byId.c.added], ["4>3"]);
  assert.deepEqual([...byId.c.changed], ["4>8"]);
  assert.deepEqual([...byId.d.added].sort(), ["1>7", "3>8"]);
  assert.deepEqual([...byId.d.changed].sort(), ["1>2", "1>3", "3>1", "3>4", "3>7"]);
  assert.deepEqual([...byId.e.added], ["1>4"]);
  assert.deepEqual([...byId.e.changed].sort(), ["1>2", "1>3", "1>7"]);
});

const run = (panel, omega) => {
  const state = createDistress(nodes.map(({ id }) => id));
  shock(state, 5, SHOCK);
  let rounds = 0;
  while (!quiet(state) && rounds < 400) { propagate(state, panel.links, omega); rounds++; }
  return { state, rounds };
};

test("a shock dies out below λmax = 1 and defaults banks above it", () => {
  const [a, b, c] = panels;
  assert.ok(run(a, 1).rounds < 10);
  for (const panel of [a, b, panels[3], panels[4]]) {
    assert.ok([...run(panel, 1).state.level.values()].every((level) => level < 0.5), panel.id);
  }
  const unstable = run(c, 1).state;
  assert.equal(unstable.level.get(3), 1);
  assert.equal(unstable.level.get(4), 1);
});
