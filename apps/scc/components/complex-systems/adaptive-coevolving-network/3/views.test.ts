import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createCooperationNetwork, DEFAULT_PARAMETERS, payoff, stepCooperationNetwork } from "./model.ts";
import { VIEWS, viewTargets } from "./views.ts";

const { temptation } = DEFAULT_PARAMETERS;

function settled() {
  const network = createCooperationNetwork(240, 8, 0x3c6ef372, 0.5);
  stepCooperationNetwork(network, 240 * 60, DEFAULT_PARAMETERS);
  return network;
}

for (const frame of [{ width: 1440, height: 704 }, { width: 390, height: 644 }]) {
  test(`every view keeps every player inside the frame (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const bodies = createBodies(network.size, frame);
    const out = new Float64Array(network.size * 2);
    for (const view of VIEWS) {
      viewTargets(view.id, network, temptation, bodies, frame, out);
      for (let player = 0; player < network.size; player += 1) {
        assert.ok(out[player * 2]! >= 0 && out[player * 2]! <= frame.width, view.id);
        assert.ok(out[player * 2 + 1]! >= 0 && out[player * 2 + 1]! <= frame.height, view.id);
      }
    }
  });
}

test("rank view puts higher earners nearer the centre", () => {
  const network = settled();
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("rank", network, temptation, createBodies(network.size, frame), frame, out);
  const distance = (player: number) => Math.hypot(out[player * 2]! - 500, out[player * 2 + 1]! - 400);
  const order = Array.from({ length: network.size }, (_, player) => player)
    .sort((a, b) => payoff(network, a, temptation) - payoff(network, b, temptation));
  assert.ok(distance(order[0]!) > distance(order.at(-1)!));
});

test("payoff view: a defector sits above a cooperator with the same cooperating ties", () => {
  const network = createCooperationNetwork(40, 6, 9, 0.5);
  const frame = { width: 800, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("payoff", network, temptation, createBodies(network.size, frame), frame, out);
  const pairs: [number, number][] = [];
  for (let c = 0; c < network.size; c += 1) {
    for (let d = 0; d < network.size; d += 1) {
      if (network.strategy[c] !== "C" || network.strategy[d] !== "D") continue;
      if (network.cooperativeNeighbours[c] !== network.cooperativeNeighbours[d]) continue;
      if (network.cooperativeNeighbours[c]! < 2) continue;
      pairs.push([c, d]);
    }
  }
  assert.ok(pairs.length > 0);
  for (const [c, d] of pairs) assert.ok(out[d * 2 + 1]! < out[c * 2 + 1]!);
});
