import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createCultureNetwork, FEATURES, stepCultureNetwork } from "./model.ts";
import { createEmbedding, cultureGroups, updateEmbedding, VIEWS, viewTargets } from "./views.ts";

function settled(traits: number, duration: number) {
  const network = createCultureNetwork(120, traits, 7919);
  stepCultureNetwork(network, duration, { drift: 0 });
  return network;
}

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
  for (const [traits, duration] of [[24, 0], [24, 300], [2, 300]] as const) {
    test(`every view keeps every agent inside the frame (${frame.width}×${frame.height}, q ${traits}, t ${duration})`, () => {
      const network = settled(traits, duration);
      const bodies = createBodies(network.size, frame);
      const embedding = createEmbedding(network.size);
      updateEmbedding(network, embedding);
      const out = new Float64Array(network.size * 2);
      for (const view of VIEWS) {
        viewTargets(view.id, network, bodies, frame, embedding, out);
        for (let agent = 0; agent < network.size; agent += 1) {
          assert.ok(Number.isFinite(out[agent * 2]!) && Number.isFinite(out[agent * 2 + 1]!), view.id);
          assert.ok(out[agent * 2]! >= 0 && out[agent * 2]! <= frame.width, view.id);
          assert.ok(out[agent * 2 + 1]! >= 0 && out[agent * 2 + 1]! <= frame.height, view.id);
        }
      }
    });
  }
}

test("culture view keeps each culture together and apart from the others", () => {
  const network = settled(24, 300);
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(network.size * 2);
  const embedding = createEmbedding(network.size);
  viewTargets("culture", network, createBodies(network.size, frame), frame, embedding, out);
  const groups = cultureGroups(network).filter((group) => group.members.length > 2);
  assert.ok(groups.length >= 2);
  const centre = (members: number[]) => {
    let x = 0;
    let y = 0;
    for (const agent of members) {
      x += out[agent * 2]! / members.length;
      y += out[agent * 2 + 1]! / members.length;
    }
    return { x, y };
  };
  const [first, second] = groups;
  const a = centre(first!.members);
  const b = centre(second!.members);
  const within = Math.max(...first!.members.map((agent) => Math.hypot(out[agent * 2]! - a.x, out[agent * 2 + 1]! - a.y)));
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > within);
});

test("similarity map puts cultures sharing more features closer", () => {
  // Three blocks: A and B share two features, C shares none with either.
  const network = createCultureNetwork(60, 10, 3);
  for (let agent = 0; agent < 60; agent += 1) {
    const block = Math.floor(agent / 20);
    const culture = block === 0 ? [0, 0, 0] : block === 1 ? [0, 0, 1] : [5, 6, 7];
    for (let feature = 0; feature < FEATURES; feature += 1) network.cultures[agent * FEATURES + feature] = culture[feature]!;
  }
  const embedding = createEmbedding(network.size);
  updateEmbedding(network, embedding);
  const point = (agent: number) => ({ x: embedding.points[agent * 2]!, y: embedding.points[agent * 2 + 1]! });
  const distance = (first: number, second: number) =>
    Math.hypot(point(first).x - point(second).x, point(first).y - point(second).y);
  assert.ok(distance(0, 1) < 1e-9);
  assert.ok(distance(0, 20) < distance(0, 40));
  assert.ok(distance(0, 20) < distance(20, 40));
});

test("similarity map stays put when nothing changes", () => {
  const network = settled(8, 120);
  const embedding = createEmbedding(network.size);
  updateEmbedding(network, embedding);
  const before = Float64Array.from(embedding.points);
  updateEmbedding(network, embedding);
  let drift = 0;
  for (let index = 0; index < before.length; index += 1) drift = Math.max(drift, Math.abs(before[index]! - embedding.points[index]!));
  assert.ok(drift < 0.05, `moved ${drift}`);
});
