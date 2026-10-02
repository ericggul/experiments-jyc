import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createEpidemicNetwork, DEFAULT_PARAMETERS, stepEpidemicNetwork } from "./model.ts";
import { VIEWS, viewTargets } from "./views.ts";

function settled() {
  const network = createEpidemicNetwork(300, 8, 0x1b873593, 0.3);
  stepEpidemicNetwork(network, 20, DEFAULT_PARAMETERS);
  return network;
}

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
  test(`separate view never mixes healthy and infected (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const out = new Float64Array(network.size * 2);
    viewTargets("separate", network, createBodies(network.size, frame), frame, out);
    const axis = frame.width >= frame.height ? 0 : 1;
    let healthyFar = -Infinity;
    let infectedNear = Infinity;
    for (let person = 0; person < network.size; person += 1) {
      const value = out[person * 2 + axis]!;
      if (network.health[person] === "S") healthyFar = Math.max(healthyFar, value);
      else infectedNear = Math.min(infectedNear, value);
    }
    assert.ok(healthyFar < infectedNear);
  });

  test(`every view keeps every person inside the frame (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const bodies = createBodies(network.size, frame);
    const out = new Float64Array(network.size * 2);
    for (const view of VIEWS) {
      viewTargets(view.id, network, bodies, frame, out);
      for (let person = 0; person < network.size; person += 1) {
        assert.ok(out[person * 2]! >= 0 && out[person * 2]! <= frame.width, view.id);
        assert.ok(out[person * 2 + 1]! >= 0 && out[person * 2 + 1]! <= frame.height, view.id);
      }
    }
  });
}

test("degree view puts better-connected people nearer the centre", () => {
  const network = settled();
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("degree", network, createBodies(network.size, frame), frame, out);
  const distance = (person: number) => Math.hypot(out[person * 2]! - 500, out[person * 2 + 1]! - 400);
  const order = Array.from({ length: network.size }, (_, person) => person)
    .sort((a, b) => network.incident[a]!.length - network.incident[b]!.length);
  assert.ok(distance(order[0]!) > distance(order.at(-1)!));
});
