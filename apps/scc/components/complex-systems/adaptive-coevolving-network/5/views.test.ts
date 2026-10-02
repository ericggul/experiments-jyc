import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createSignedNetwork, DEFAULT_PARAMETERS, factions, stepSignedNetwork } from "./model.ts";
import { campOrder, VIEWS, viewTargets } from "./views.ts";

function settled() {
  const network = createSignedNetwork(30, 0x5bd1e995);
  stepSignedNetwork(network, 120, { ...DEFAULT_PARAMETERS, unrest: 0 });
  return network;
}

for (const frame of [{ width: 1440, height: 704 }, { width: 390, height: 644 }]) {
  test(`every view keeps every person inside the frame (${frame.width}×${frame.height})`, () => {
    const network = settled();
    const camps = factions(network);
    const bodies = createBodies(network.size, frame);
    const out = new Float64Array(network.size * 2);
    for (const view of VIEWS) {
      viewTargets(view.id, network.size, camps, bodies, frame, out);
      for (let person = 0; person < network.size; person += 1) {
        assert.ok(out[person * 2]! >= 0 && out[person * 2]! <= frame.width, view.id);
        assert.ok(out[person * 2 + 1]! >= 0 && out[person * 2 + 1]! <= frame.height, view.id);
      }
    }
  });
}

test("circle puts the two camps on opposite halves", () => {
  const network = settled();
  const camps = factions(network);
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  viewTargets("circle", network.size, camps, createBodies(network.size, frame), frame, out);
  const mean = (camp: number) => {
    let sum = 0;
    let count = 0;
    for (let person = 0; person < network.size; person += 1) {
      if (camps[person] !== camp) continue;
      sum += out[person * 2]!;
      count += 1;
    }
    return sum / count;
  };
  assert.ok(mean(1) < 500 - 100 && mean(-1) > 500 + 100);
});

test("matrix places each camp as one contiguous block on the diagonal", () => {
  const network = settled();
  const camps = factions(network);
  const order = campOrder(camps, network.size);
  assert.equal(order.length, network.size);
  const switches = order.slice(1).filter((person, rank) => camps[person] !== camps[order[rank]!]).length;
  assert.equal(switches, 1);
  const frame = { width: 900, height: 900 };
  const out = new Float64Array(network.size * 2);
  viewTargets("matrix", network.size, camps, createBodies(network.size, frame), frame, out);
  order.forEach((person, rank) => {
    if (rank === 0) return;
    assert.ok(out[person * 2]! > out[order[rank - 1]! * 2]!);
    assert.equal(out[person * 2], out[person * 2 + 1]);
  });
});
