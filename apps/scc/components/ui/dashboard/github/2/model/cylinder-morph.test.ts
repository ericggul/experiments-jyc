import assert from "node:assert/strict";
import test from "node:test";
import {
  SURFACE_MORPH_END,
  surfaceMorphProgress,
  surfacePoint,
  writeSurfacePositions,
} from "./cylinder-morph.ts";

function assertClose(actual: number, expected: number, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
}

test("the initial input interval preserves the original plane for each target", () => {
  const source = { x: 2.1, y: -0.7, z: 0 };
  assert.deepEqual(surfacePoint(source, 8, 5, "cylinder", 0), source);
  assert.deepEqual(surfacePoint(source, 8, 5, "torus", 0), source);
  assert.equal(surfaceMorphProgress(0), 0);
});

test("the centerline remains fixed while the horizontal edges recede", () => {
  const center = surfacePoint({ x: 0, y: 1, z: 0 }, 10, 6, "cylinder", SURFACE_MORPH_END);
  const edge = surfacePoint({ x: 5, y: 1, z: 0 }, 10, 6, "cylinder", SURFACE_MORPH_END);

  assertClose(center.x, 0);
  assertClose(center.z, 0);
  assert.ok(Math.abs(edge.x) < 5);
  assert.ok(edge.z < 0);
});

test("the torus closes both plane axes into its ring and tube directions", () => {
  const top = surfacePoint({ x: 0, y: -3, z: 0 }, 10, 6, "torus", SURFACE_MORPH_END);
  const bottom = surfacePoint({ x: 0, y: 3, z: 0 }, 10, 6, "torus", SURFACE_MORPH_END);
  const aroundRing = surfacePoint({ x: 2.5, y: 0, z: 0 }, 10, 6, "torus", SURFACE_MORPH_END);
  const aroundTube = surfacePoint({ x: 0, y: 1.5, z: 0 }, 10, 6, "torus", SURFACE_MORPH_END);

  assertClose(top.x, bottom.x);
  assertClose(top.y, bottom.y);
  assertClose(top.z, bottom.z);
  assertClose(aroundRing.x, 0);
  assert.ok(aroundRing.y > 0);
  assert.ok(aroundTube.z > 0);
});

test("the geometry writer applies the selected topology to every vertex", () => {
  const source = new Float32Array([-4, -2, 0, 0, 0, 0, 4, 2, 0]);
  const target = new Float32Array(source.length);

  writeSurfacePositions(source, target, 8, 4, "cylinder", SURFACE_MORPH_END);

  assertClose(target[1] ?? 0, -2);
  assertClose(target[4] ?? 0, 0);
  assertClose(target[7] ?? 0, 2);
  assert.ok((target[2] ?? 0) < 0);
  assertClose(target[5] ?? 0, 0);
  assert.ok((target[8] ?? 0) < 0);
});
