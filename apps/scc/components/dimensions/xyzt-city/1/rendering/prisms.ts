// Builds the whole city as one indexed prism mesh plus one outline set that
// shares the same vertex buffers. Each prism contributes its footprint ring
// twice (level 0 at t0, level 1 at t1); faces and edges index into those vertices.
// Normals are derived per fragment from screen derivatives, so shared vertices
// still shade flat.

import * as THREE from "three";
import type { CityData, PrismRecord } from "../model/city";
import { extentCentre, groundToWorld, yearToWorld } from "../model/axes";

/** Vertical outline only where the ring turns by more than this (radians). */
const CORNER_TURN = 0.35;

export type PrismGeometries = {
  faces: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  vertexCount: number;
};

function ringPoints(record: PrismRecord) {
  const points: THREE.Vector2[] = [];
  const { ring } = record;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const point = new THREE.Vector2(ring[i], ring[i + 1]);
    const previous = points[points.length - 1];
    if (!previous || previous.distanceToSquared(point) > 1e-6) points.push(point);
  }
  if (points.length > 1 && points[0].distanceToSquared(points[points.length - 1]) <= 1e-6) {
    points.pop();
  }
  return points;
}

function isCorner(points: THREE.Vector2[], index: number) {
  const n = points.length;
  const a = points[(index - 1 + n) % n];
  const b = points[index];
  const c = points[(index + 1) % n];
  const inX = b.x - a.x, inY = b.y - a.y;
  const outX = c.x - b.x, outY = c.y - b.y;
  const turn = Math.abs(Math.atan2(inX * outY - inY * outX, inX * outX + inY * outY));
  return turn > CORNER_TURN;
}

export function buildPrismGeometries(data: CityData): PrismGeometries {
  const centre = extentCentre(data);
  const rings: THREE.Vector2[][] = [];
  let vertexCount = 0;
  for (const record of data.prisms) {
    const points = ringPoints(record);
    rings.push(points);
    if (points.length >= 3) vertexCount += points.length * 2;
  }

  const position = new Float32Array(vertexCount * 3);
  const height = new Float32Array(vertexCount);
  const along = new Float32Array(vertexCount);
  const censor = new Uint8Array(vertexCount * 2);
  const fuzzy = new Uint8Array(vertexCount);
  const faceIndex: number[] = [];
  const edgeIndex: number[] = [];

  let base = 0;
  data.prisms.forEach((record, prismIndex) => {
    const points = rings[prismIndex];
    const n = points.length;
    if (n < 3) return;
    // Level 0 is the t0 ring, level 1 the t1 ring; with the present on the
    // ground, t0 lies above t1.
    const t0Y = yearToWorld(record.t0, data);
    const t1Y = yearToWorld(Math.max(record.t1, record.t0 + 1), data);
    const censorT0 = record.t0Kind === "bound" ? 255 : 0;
    const censorT1 = record.t1Kind === "bound" ? 255 : 0;
    const fuzzyT0 = record.t0Kind === "fuzzy" ? 255 : 0;

    for (let i = 0; i < n; i++) {
      const [wx, wz] = groundToWorld(points[i].x, points[i].y, centre);
      for (let level = 0; level < 2; level++) {
        const v = base + level * n + i;
        position[v * 3] = wx;
        position[v * 3 + 1] = level === 0 ? t0Y : t1Y;
        position[v * 3 + 2] = wz;
        height[v] = record.heightM;
        along[v] = level;
        censor[v * 2] = censorT0;
        censor[v * 2 + 1] = censorT1;
        fuzzy[v] = fuzzyT0;
      }
    }

    const t1Ring = base + n;
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(points, [])) {
      faceIndex.push(base + a, base + c, base + b, t1Ring + a, t1Ring + b, t1Ring + c);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faceIndex.push(base + i, base + j, t1Ring + j, base + i, t1Ring + j, t1Ring + i);
      edgeIndex.push(base + i, base + j, t1Ring + i, t1Ring + j);
      if (isCorner(points, i)) edgeIndex.push(base + i, t1Ring + i);
    }
    base += n * 2;
  });

  const attributes = {
    position: new THREE.BufferAttribute(position, 3),
    aHeight: new THREE.BufferAttribute(height, 1),
    aT: new THREE.BufferAttribute(along, 1),
    aCensor: new THREE.BufferAttribute(censor, 2, true),
    aFuzzy: new THREE.BufferAttribute(fuzzy, 1, true),
  };
  const faces = new THREE.BufferGeometry();
  const edges = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(attributes)) {
    faces.setAttribute(name, attribute);
    edges.setAttribute(name, attribute);
  }
  faces.setIndex(new THREE.BufferAttribute(new Uint32Array(faceIndex), 1));
  edges.setIndex(new THREE.BufferAttribute(new Uint32Array(edgeIndex), 1));
  faces.computeBoundingSphere();
  edges.boundingSphere = faces.boundingSphere?.clone() ?? null;
  return { faces, edges, vertexCount };
}
