import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createEchoNetwork, DEFAULT_PARAMETERS, stepEchoNetwork } from "./model.ts";
import { axisGeometry, opinionToUnit, unitToOpinion, VIEWS, viewTargets } from "./views.ts";

function polarized() {
  const network = createEchoNetwork(200, 0x5bd1e995);
  stepEchoNetwork(network, 20, DEFAULT_PARAMETERS);
  return network;
}

test("the opinion axis maps back to the same opinion", () => {
  for (const opinion of [-6, -1, -0.1, 0, 0.3, 2, 5]) {
    assert.ok(Math.abs(unitToOpinion(opinionToUnit(opinion)) - opinion) < 1e-9);
  }
  assert.ok(Number.isFinite(unitToOpinion(1)) && Number.isFinite(unitToOpinion(-1)));
});

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 640 }]) {
  test(`opinion and distribution views put the two sides on either side of the centre (${frame.width}×${frame.height})`, () => {
    const network = polarized();
    const out = new Float64Array(network.size * 2);
    const { centre } = axisGeometry(frame);
    for (const view of ["opinion", "distribution"] as const) {
      viewTargets(view, network, createBodies(network.size, frame), frame, 7, out);
      for (let person = 0; person < network.size; person += 1) {
        const opinion = network.opinion[person]!;
        if (Math.abs(opinion) < 0.05) continue;
        assert.equal(Math.sign(out[person * 2]! - centre), Math.sign(opinion), view);
      }
    }
  });

  test(`every view keeps every person inside the frame (${frame.width}×${frame.height})`, () => {
    const network = polarized();
    const bodies = createBodies(network.size, frame);
    const out = new Float64Array(network.size * 2);
    for (const view of VIEWS) {
      viewTargets(view.id, network, bodies, frame, 7, out);
      for (let person = 0; person < network.size; person += 1) {
        assert.ok(out[person * 2]! >= 0 && out[person * 2]! <= frame.width, view.id);
        assert.ok(out[person * 2 + 1]! >= 0 && out[person * 2 + 1]! <= frame.height, view.id);
      }
    }
  });
}

test("opinion view puts the most active person above the least active", () => {
  const network = polarized();
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("opinion", network, createBodies(network.size, frame), frame, 7, out);
  const order = Array.from({ length: network.size }, (_, person) => person)
    .sort((a, b) => network.activity[a]! - network.activity[b]!);
  assert.ok(out[order.at(-1)! * 2 + 1]! < out[order[0]! * 2 + 1]!);
});
