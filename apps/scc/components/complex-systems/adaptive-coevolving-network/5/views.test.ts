import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createThresholdNetwork, isActive, stepThresholdNetwork, type ThresholdNetwork } from "./model.ts";
import { INPUT_MAX, VIEWS, viewTargets } from "./views.ts";

function activity(network: ThresholdNetwork) {
  return Uint8Array.from({ length: network.size }, (_, node) => (isActive(network, node) ? 1 : 0));
}

function settled() {
  const network = createThresholdNetwork(120, 1, 0x3c6ef372);
  for (let update = 0; update < 600; update += 1) stepThresholdNetwork(network);
  return network;
}

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
  test(`activity view never mixes still and blinking nodes (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const out = new Float64Array(network.size * 2);
    viewTargets("activity", network, activity(network), createBodies(network.size, frame), frame, out);
    const axis = frame.width >= frame.height ? 0 : 1;
    let stillFar = -Infinity;
    let blinkingNear = Infinity;
    for (let node = 0; node < network.size; node += 1) {
      const value = out[node * 2 + axis]!;
      if (isActive(network, node)) blinkingNear = Math.min(blinkingNear, value);
      else stillFar = Math.max(stillFar, value);
    }
    assert.ok(stillFar < blinkingNear);
  });

  test(`every view keeps every node inside the frame (${frame.width}×${frame.height})`, () => {
    for (const start of [0.25, 1, 6]) {
      const network = createThresholdNetwork(120, start, 4);
      const bodies = createBodies(network.size, frame);
      const out = new Float64Array(network.size * 2);
      for (const view of VIEWS) {
        viewTargets(view.id, network, activity(network), bodies, frame, out);
        for (let node = 0; node < network.size; node += 1) {
          assert.ok(out[node * 2]! >= 0 && out[node * 2]! <= frame.width, view.id);
          assert.ok(out[node * 2 + 1]! >= 0 && out[node * 2 + 1]! <= frame.height, view.id);
        }
      }
    }
  });
}

test("inputs view puts nodes in columns ordered by their number of inputs", () => {
  const network = settled();
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("inputs", network, activity(network), createBodies(network.size, frame), frame, out);
  for (let first = 0; first < network.size; first += 1) {
    for (let second = 0; second < network.size; second += 1) {
      const a = Math.min(INPUT_MAX, network.inputs[first]!.length);
      const b = Math.min(INPUT_MAX, network.inputs[second]!.length);
      if (a < b) assert.ok(out[first * 2]! < out[second * 2]!);
      if (a === b) assert.equal(out[first * 2], out[second * 2]);
    }
  }
});
