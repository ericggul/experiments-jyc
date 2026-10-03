import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  atlasHeightM,
  atlasToLocal,
  douglasPeucker,
  ensureCCW,
  largestOuterRing,
  pointInPolygon,
  processRing,
  project,
  rectRing,
  signedArea,
  simplifyRing,
} from "./geometry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.resolve(HERE, "../../../../../public/data/xyzt-city/lower-manhattan.json");

test("project: origin is zero, north and east are positive, scales in metres", () => {
  assert.deepEqual(project(-74.01, 40.708), [0, 0]);
  const [x, y] = project(-74.01 + 0.001, 40.708 + 0.001);
  assert.ok(Math.abs(x - 0.001 * Math.cos((40.708 * Math.PI) / 180) * 111320) < 1e-9);
  assert.ok(Math.abs(y - 110.54) < 1e-9);
});

test("signedArea / ensureCCW", () => {
  const ccw = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(signedArea(ccw), 100);
  assert.equal(signedArea(ensureCCW([...ccw].reverse())), 100);
});

test("douglasPeucker removes collinear and sub-tolerance points, keeps corners", () => {
  const line = [[0, 0], [5, 0.2], [10, 0], [10, 10]];
  assert.deepEqual(douglasPeucker(line, 0.5), [[0, 0], [10, 0], [10, 10]]);
  assert.equal(douglasPeucker(line, 0.1).length, 4);
});

test("simplifyRing keeps a square's corners", () => {
  const sq = [[0, 0], [5, 0.1], [10, 0], [10, 5], [10, 10], [5, 10.1], [0, 10], [0, 5]];
  const out = simplifyRing(sq, 0.5);
  assert.equal(out.length, 4);
  assert.ok(Math.abs(signedArea(out)) > 99);
});

test("pointInPolygon", () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.ok(pointInPolygon(5, 5, sq));
  assert.ok(!pointInPolygon(15, 5, sq));
  const l = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  assert.ok(!pointInPolygon(8, 8, l));
  assert.ok(pointInPolygon(2, 8, l));
});

test("largestOuterRing drops holes and picks the biggest part", () => {
  const g = {
    type: "MultiPolygon",
    coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]],
    ],
  };
  assert.equal(largestOuterRing(g)[2][0], 4);
});

test("processRing: open, CCW, rounded, and rejects tiny areas", () => {
  const cw = [[0, 0], [0, 20.04], [20.04, 20.04], [20.04, 0], [0, 0]];
  const r = processRing(cw);
  assert.equal(r.length, 4);
  assert.ok(signedArea(r) > 0);
  assert.ok(r.every(([x, y]) => x === Math.round(x * 10) / 10 && y === Math.round(y * 10) / 10));
  assert.equal(processRing([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]), null);
});

test("rectRing has the requested area and is CCW", () => {
  const r = rectRing(100, 50, 20, 10, -29);
  assert.ok(Math.abs(signedArea(r) - 200) < 1e-9);
});

test("atlas: anchor maps near Trinity Church; material heights", () => {
  const [x, y] = atlasToLocal([2594152, 6034711]);
  const [tx, ty] = project(-74.01212, 40.70812);
  assert.ok(Math.hypot(x - tx, y - ty) < 30);
  assert.equal(atlasHeightM("brick or stone"), 14);
  assert.equal(atlasHeightM("wood & brick front"), 9);
  assert.equal(atlasHeightM(null), 11);
});

// --- baked dataset ---------------------------------------------------------
const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const ORIGINS = new Set(["current", "historic", "atlas1854", "manual"]);
const KINDS = new Set(["record", "fuzzy", "bound", "open"]);

test("baked: top-level schema", () => {
  assert.deepEqual(Object.keys(data).sort(), ["extent", "maxHeightM", "origin", "prisms", "sources", "years"]);
  assert.deepEqual(data.origin, { lat: 40.708, lon: -74.01 });
  assert.equal(data.years.present, 2026);
  assert.ok(data.sources.length > 0 && data.sources.every((s) => s.id && s.label && s.url && /^\d{4}-\d\d-\d\d$/.test(s.fetched)));
});

test("baked: every prism matches the contract", () => {
  const ids = new Set();
  const keys = ["heightEstimated", "heightM", "id", "origin", "ring", "t0", "t0Kind", "t1", "t1Kind"];
  for (const p of data.prisms) {
    assert.deepEqual(Object.keys(p).sort(), keys, p.id);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(ORIGINS.has(p.origin));
    assert.ok(p.id.startsWith({ current: "c:", historic: "h:", atlas1854: "p:", manual: "m:" }[p.origin]), p.id);
    assert.ok(p.ring.length >= 6 && p.ring.length % 2 === 0, p.id);
    const pts = [];
    for (let i = 0; i < p.ring.length; i += 2) pts.push([p.ring[i], p.ring[i + 1]]);
    assert.ok(signedArea(pts) > 0, `${p.id} not CCW`);
    assert.ok(!(pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]), `${p.id} closed`);
    assert.ok(p.heightM > 0 && p.heightM <= 550, p.id);
    assert.ok(Number.isInteger(p.t0) && Number.isInteger(p.t1) && p.t0 < p.t1 && p.t1 <= data.years.present, p.id);
    assert.ok(KINDS.has(p.t0Kind) && p.t0Kind !== "open" && KINDS.has(p.t1Kind), p.id);
    assert.equal(p.t1Kind === "open", p.t1 === data.years.present && p.origin === "current", p.id);
    assert.equal(p.heightEstimated, p.origin === "atlas1854", p.id);
  }
});

test("baked: extent, years.min and maxHeightM are consistent", () => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minT = Infinity, maxH = 0;
  for (const p of data.prisms) {
    for (let i = 0; i < p.ring.length; i += 2) {
      minX = Math.min(minX, p.ring[i]); maxX = Math.max(maxX, p.ring[i]);
      minY = Math.min(minY, p.ring[i + 1]); maxY = Math.max(maxY, p.ring[i + 1]);
    }
    minT = Math.min(minT, p.t0);
    maxH = Math.max(maxH, p.heightM);
  }
  assert.deepEqual(data.extent, { minX, maxX, minY, maxY });
  assert.equal(data.years.min, minT);
  assert.equal(data.maxHeightM, maxH);
});

test("baked: tall records are present", () => {
  const byId = (o) => data.prisms.filter((p) => p.origin === o);
  const top = byId("current").sort((a, b) => b.heightM - a.heightM)[0];
  assert.ok(top.heightM > 420 && top.heightM <= 550, `tallest current ${top.heightM}`); // One WTC roof (1408 ft in the layer)
  const manual = byId("manual");
  assert.ok(manual.some((p) => p.id === "m:singer-building" && p.heightM === 187 && p.t1 === 1968));
  assert.ok(manual.some((p) => p.id === "m:wtc-1-north-tower" && p.heightM === 417 && p.t1 === 2001));
  assert.ok(byId("historic").length > 0);
});

test("baked: atlas records are bounds with estimated heights", () => {
  const atlas = data.prisms.filter((p) => p.origin === "atlas1854");
  if (!atlas.length) return; // atlas source optional
  assert.ok(atlas.every((p) => p.t0 === 1854 && p.t0Kind === "bound" && p.t1Kind === "bound" && [9, 11, 14].includes(p.heightM)));
});

test("baked: file stays small", () => {
  assert.ok(fs.statSync(JSON_PATH).size < 3_000_000);
});

test("baked: construction-year corrections apply and reference existing prisms", async () => {
  const { CORRECTIONS } = await import("./corrections.mjs");
  const byId = new Map(data.prisms.map((p) => [p.id, p]));
  for (const c of CORRECTIONS) {
    const p = byId.get(c.id);
    assert.ok(p, `missing ${c.id}`);
    assert.equal(p.t0, c.t0);
    assert.equal(p.t0Kind, "record");
    assert.ok(data.sources.some((s) => s.id === `correction:${c.id}` && s.url === c.url));
  }
  assert.equal(byId.get("c:1114961").t0, 2014);
});
