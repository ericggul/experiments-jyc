import assert from "node:assert/strict";
import test from "node:test";
import {
  LINKEDIN_SURFACE_ARC_RADIANS,
  cylinderSurfaceMetrics,
  writeCylinderSurfacePositions,
} from "./cylinder-layout.ts";

test("each captured HTML surface receives the source width across its cylinder arc", () => {
  const surface = cylinderSurfaceMetrics(4.416, 2.8);

  assert.equal(surface.height, 2.8);
  assert.equal(surface.radius * LINKEDIN_SURFACE_ARC_RADIANS, 4.416);
});

test("a full arc joins the two horizontal plane edges at the cylinder seam", () => {
  const source = new Float32Array([-2, 0, 0, 2, 0, 0]);
  const target = new Float32Array(source.length);
  writeCylinderSurfacePositions(source, target, 4, Math.PI * 2);

  assert.ok(Math.abs((target[0] ?? 0) - (target[3] ?? 0)) < 0.00001);
  assert.ok(Math.abs((target[2] ?? 0) - (target[5] ?? 0)) < 0.00001);
});
