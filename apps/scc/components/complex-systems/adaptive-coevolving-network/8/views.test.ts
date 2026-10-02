import assert from "node:assert/strict";
import test from "node:test";
import { createBodies } from "./layout.ts";
import { createEcosystem, DEFAULT_LINKAGE, updateEcosystem } from "./model.ts";
import { VIEWS, viewLabels, viewTargets } from "./views.ts";

function settled() {
  const ecosystem = createEcosystem(60, DEFAULT_LINKAGE, 9);
  for (let step = 0; step < 220; step += 1) updateEcosystem(ecosystem, DEFAULT_LINKAGE);
  return ecosystem;
}

for (const frame of [{ width: 1440, height: 760 }, { width: 390, height: 700 }]) {
  test(`every view keeps every species and label inside the frame (${frame.width}×${frame.height})`, () => {
    const ecosystem = settled();
    const bodies = createBodies(ecosystem.size, frame);
    const out = new Float64Array(ecosystem.size * 2);
    for (const view of VIEWS) {
      viewTargets(view.id, ecosystem, bodies, frame, out);
      for (let species = 0; species < ecosystem.size; species += 1) {
        assert.ok(out[species * 2]! >= 0 && out[species * 2]! <= frame.width, view.id);
        assert.ok(out[species * 2 + 1]! >= 0 && out[species * 2 + 1]! <= frame.height, view.id);
      }
      for (const label of viewLabels(view.id, frame)) assert.ok(label.y > 0, view.id);
    }
  });
}

test("role view orders species core, periphery, absent from the centre out", () => {
  const ecosystem = settled();
  const frame = { width: 1000, height: 800 };
  const out = new Float64Array(ecosystem.size * 2);
  viewTargets("role", ecosystem, createBodies(ecosystem.size, frame), frame, out);
  const reach = { core: [Infinity, -Infinity], periphery: [Infinity, -Infinity], absent: [Infinity, -Infinity] };
  ecosystem.role.forEach((role, species) => {
    const distance = Math.hypot(out[species * 2]! - 500, out[species * 2 + 1]! - 400);
    reach[role][0] = Math.min(reach[role][0]!, distance);
    reach[role][1] = Math.max(reach[role][1]!, distance);
  });
  assert.ok(ecosystem.role.includes("core") && ecosystem.role.includes("periphery") && ecosystem.role.includes("absent"));
  assert.ok(reach.core[1]! < reach.periphery[0]!);
  assert.ok(reach.periphery[1]! < reach.absent[0]!);
});
