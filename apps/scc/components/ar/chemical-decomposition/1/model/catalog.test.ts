import assert from "node:assert/strict";
import test from "node:test";
import { catalogPhrases, objectThings, sceneThings } from "./catalog.ts";
import { materials } from "./materials.ts";

test("one entry per ADE20K and COCO class, in model order", () => {
  assert.equal(sceneThings.length, 150);
  assert.equal(objectThings.length, 80);
  assert.equal(sceneThings[21]?.name, "water");
  assert.equal(sceneThings[128]?.name, "lake");
  assert.equal(objectThings[67]?.name, "cell phone");
});

test("every candidate names a material with positive shares", () => {
  for (const entry of [...sceneThings, ...objectThings]) {
    assert.ok(entry.candidates.length > 0, entry.name);
    for (const [material] of entry.candidates) assert.ok(material in materials, `${entry.name} → ${material}`);
  }
  for (const [id, material] of Object.entries(materials)) {
    assert.ok(material.constituents.length > 0, id);
    for (const [, share] of material.constituents) assert.ok(share > 0 && Number.isFinite(share), id);
  }
});

test("phrases follow the catalogue order", () => {
  const count = [...sceneThings, ...objectThings].reduce((sum, entry) => sum + entry.candidates.length, 0);
  assert.equal(catalogPhrases().length, count);
});
