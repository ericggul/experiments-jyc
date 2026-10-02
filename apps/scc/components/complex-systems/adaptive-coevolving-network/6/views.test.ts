import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createOpinionNetwork, DEFAULT_PARAMETERS, stepOpinionNetwork } from "./model.ts";
import { opinionAxis, opinionToX, VIEWS, viewTargets, xToOpinion } from "./views.ts";

function settled() {
  const network = createOpinionNetwork(240, 6, 0x5bd1e995);
  stepOpinionNetwork(network, 20, DEFAULT_PARAMETERS);
  return network;
}

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
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

  test(`the opinion view only moves people sideways from the network (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const bodies = createBodies(network.size, frame);
    const opinion = new Float64Array(network.size * 2);
    const graph = new Float64Array(network.size * 2);
    viewTargets("opinion", network, bodies, frame, opinion);
    viewTargets("network", network, bodies, frame, graph);
    const order = Array.from({ length: network.size }, (_, person) => person)
      .sort((a, b) => network.opinions[a]! - network.opinions[b]!);
    for (let index = 1; index < order.length; index += 1) {
      assert.ok(opinion[order[index]! * 2]! >= opinion[order[index - 1]! * 2]!);
    }
    for (let person = 0; person < network.size; person += 1) {
      assert.equal(opinion[person * 2 + 1], graph[person * 2 + 1]);
    }
  });
}

test("screen position and opinion convert both ways, clamped to the axis", () => {
  const axis = opinionAxis({ width: 390, height: 700 });
  for (const value of [0, 0.25, 0.5, 1]) {
    assert.ok(Math.abs(xToOpinion(axis, opinionToX(axis, value)) - value) < 1e-9);
  }
  assert.equal(xToOpinion(axis, -50), 0);
  assert.equal(xToOpinion(axis, 900), 1);
});
