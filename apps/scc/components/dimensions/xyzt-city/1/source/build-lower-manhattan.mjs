// Offline bake: Lower Manhattan building lifespans -> public/data/xyzt-city/lower-manhattan.json
//   node apps/scc/components/dimensions/xyzt-city/1/source/build-lower-manhattan.mjs [--cache <dir>]
// With --cache the raw downloads are stored/reused there (offline reruns). Contract: ../model/city.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATLAS_FIT,
  BBOX,
  FT_TO_M,
  ORIGIN,
  RingIndex,
  atlasHeightM,
  atlasToLocal,
  flatten,
  largestOuterRing,
  processRing,
  project,
  rectRing,
  ringBounds,
  ringCentroid,
  pointInPolygon,
  unflatten,
} from "./geometry.mjs";
import { MANUAL_TOWERS } from "./manual-towers.mjs";
import { CORRECTIONS } from "./corrections.mjs";

export const PRESENT = 2026;
export const ATLAS_YEAR = 1854;
const FUZZY_YEARS = new Set([1900, 1910, 1920, 1925, 1930]);
const MAX_HEIGHT_M = 550;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../../../public/data/xyzt-city/lower-manhattan.json");

const SOCRATA_WHERE = `within_box(the_geom, ${BBOX.north}, ${BBOX.west}, ${BBOX.south}, ${BBOX.east})`;
export const URLS = {
  current: "https://data.cityofnewyork.us/resource/5zhs-2jue.geojson",
  historic: "https://data.cityofnewyork.us/resource/ipkp-snf6.geojson",
  atlasPage: "https://geodata.library.columbia.edu/catalog/cul_nyc_nypl_1854_buildings",
  atlasWfs:
    "https://geoserver.cul.columbia.edu/geoserver/sde/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=sde:columbia.cul_nyc_nypl_1854_buildings&outputFormat=application/json",
};

const bboxLocal = (() => {
  const [x0, y0] = project(BBOX.west, BBOX.south);
  const [x1, y1] = project(BBOX.east, BBOX.north);
  return { minX: x0, maxX: x1, minY: y0, maxY: y1 };
})();
const inBBox = ([x, y]) => x >= bboxLocal.minX && x <= bboxLocal.maxX && y >= bboxLocal.minY && y <= bboxLocal.maxY;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const bump = (log, key) => {
  log[key] = (log[key] ?? 0) + 1;
};

/** Manhattan BINs start with 1 (Brooklyn 3); BBL borough digit as fallback. */
function isManhattan(p) {
  const bin = String(p.bin ?? "");
  if (bin && bin !== "0") return bin[0] === "1";
  const bbl = String(p.base_bbl ?? p.mappluto_bbl ?? "");
  return bbl ? bbl[0] === "1" : true;
}

function prismFromFootprint(feature, localRing, extra) {
  const ring = processRing(localRing);
  return ring ? { ring: flatten(ring), ...extra } : null;
}

function fromNyc(features, origin, log, aux) {
  const out = [];
  const seen = new Map();
  for (const f of features) {
    const p = f.properties ?? {};
    const prefix = origin === "current" ? "c" : "h";
    const outer = largestOuterRing(f.geometry);
    if (!outer) {
      bump(log, `${origin}: no geometry`);
      continue;
    }
    const local = outer.map(([lon, lat]) => project(lon, lat));
    if (!inBBox(ringCentroid(local))) {
      bump(log, `${origin}: centroid outside bbox`);
      continue;
    }
    if (!isManhattan(p)) {
      bump(log, `${origin}: not Manhattan`);
      continue;
    }
    const hFt = num(p.height_roof);
    if (hFt <= 0 && num(p.construction_year) > 0) {
      // Height unknown: not a prism, but its footprint and start year still locate atlas successors.
      const r = processRing(local);
      if (r) aux.push({ ring: flatten(r), t0: num(p.construction_year) });
    }
    if (hFt <= 0) {
      bump(log, origin === "current" ? "current: height missing/<=0" : "historic: height missing");
      continue;
    }
    const heightM = Math.round(hFt * FT_TO_M * 10) / 10;
    if (heightM > MAX_HEIGHT_M) {
      bump(log, `${origin}: height > ${MAX_HEIGHT_M} m`);
      continue;
    }
    const t0 = num(p.construction_year);
    if (t0 <= 0) {
      bump(log, `${origin}: construction_year missing/0`);
      continue;
    }
    let t1;
    let t1Kind;
    if (origin === "current") {
      if (t0 > PRESENT) {
        bump(log, "current: construction_year in the future");
        continue;
      }
      t1 = PRESENT;
      t1Kind = "open";
    } else {
      t1 = num(p.demolition_year);
      t1Kind = "record";
      if (t1 <= 0) {
        bump(log, "historic: demolition_year missing");
        continue;
      }
      if (t1 <= t0) {
        bump(log, "historic: demolition_year <= construction_year");
        continue;
      }
    }
    let id = `${prefix}:${p.doitt_id ?? p.objectid}`;
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    const prism = prismFromFootprint(f, local, {
      id,
      origin,
      heightM,
      heightEstimated: false,
      t0,
      t1,
      t0Kind: FUZZY_YEARS.has(t0) ? "fuzzy" : "record",
      t1Kind,
    });
    if (!prism) {
      bump(log, `${origin}: ring degenerate/area < 10 m2`);
      continue;
    }
    out.push(prism);
  }
  return out;
}

function fromManual(log) {
  const out = [];
  for (const m of MANUAL_TOWERS) {
    const [cx, cy] = project(m.lon, m.lat);
    if (!inBBox([cx, cy])) {
      bump(log, "manual: outside bbox");
      continue;
    }
    const ring = processRing(rectRing(cx, cy, m.w, m.d, m.rot));
    out.push({
      id: `m:${m.slug}`,
      origin: "manual",
      ring: flatten(ring),
      heightM: m.heightM,
      heightEstimated: false,
      t0: m.t0,
      t1: m.t1,
      t0Kind: "record",
      t1Kind: "record",
    });
  }
  return out;
}

function fromAtlas(features, successors, log) {
  const index = new RingIndex(50);
  for (const s of successors) {
    const ring = unflatten(s.ring);
    index.add({ prism: s, ring, bounds: ringBounds(ring), centroid: ringCentroid(ring) });
  }
  const out = [];
  for (const f of features) {
    const outer = largestOuterRing(f.geometry);
    if (!outer) {
      bump(log, "atlas1854: no geometry");
      continue;
    }
    const local = outer.map((p) => atlasToLocal(p));
    if (!inBBox(ringCentroid(local))) {
      bump(log, "atlas1854: centroid outside bbox");
      continue;
    }
    const ringPts = processRing(local);
    if (!ringPts) {
      bump(log, "atlas1854: ring degenerate/area < 10 m2");
      continue;
    }
    const [cx, cy] = ringCentroid(ringPts);
    let sameBuilding = false;
    let tNext = Infinity;
    for (const c of index.query(ringBounds(ringPts))) {
      const hit = pointInPolygon(cx, cy, c.ring) || pointInPolygon(c.centroid[0], c.centroid[1], ringPts);
      if (!hit) continue;
      if (c.prism.t0 <= ATLAS_YEAR) sameBuilding = true;
      else if (c.prism.t0 < tNext) tNext = c.prism.t0;
    }
    if (sameBuilding) {
      bump(log, "atlas1854: dropped, same building still in current/historic (t0 <= 1854)");
      continue;
    }
    let t1 = tNext;
    if (!Number.isFinite(t1)) {
      t1 = ATLAS_YEAR + 1;
      bump(log, "atlas1854: no successor found, t1 = 1855 (bound)");
    }
    const id = String(f.id ?? "").split(".").pop();
    out.push({
      id: `p:${id}`,
      origin: "atlas1854",
      ring: flatten(ringPts),
      heightM: atlasHeightM(f.properties?.materials),
      heightEstimated: true,
      t0: ATLAS_YEAR,
      t1,
      t0Kind: "bound",
      t1Kind: "bound",
    });
  }
  return out;
}

/** Pure assembly from parsed GeoJSON inputs (atlas may be null). */
export function buildDataset({ current, historic, atlas, fetched }) {
  const log = {};
  const aux = []; // height-less footprints, used only to find atlas successors
  const cur = fromNyc(current.features, "current", log, aux);
  const his = fromNyc(historic.features, "historic", log, aux);
  const man = fromManual(log);
  const applied = [];
  for (const c of CORRECTIONS) {
    const p = cur.find((q) => q.id === c.id);
    if (!p) continue;
    p.t0 = c.t0;
    p.t0Kind = "record";
    applied.push(c);
  }
  log["corrections applied"] = applied.length;
  const atl = atlas ? fromAtlas(atlas.features, [...cur, ...his, ...man, ...aux], log) : [];
  // Corrections were applied above, before atlas succession reads t0.
  const prisms = [...cur, ...his, ...man, ...atl];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minYear = Infinity;
  let maxH = 0;
  for (const p of prisms) {
    for (let i = 0; i < p.ring.length; i += 2) {
      const x = p.ring[i];
      const y = p.ring[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (p.t0 < minYear) minYear = p.t0;
    if (p.heightM > maxH) maxH = p.heightM;
  }
  const sources = [
    { id: "current", label: "NYC Building Footprints (standing)", url: "https://data.cityofnewyork.us/resource/5zhs-2jue", fetched },
    { id: "historic", label: "NYC Building Footprints, historic (demolished since 1991)", url: "https://data.cityofnewyork.us/resource/ipkp-snf6", fetched },
    ...(atlas ? [{ id: "atlas1854", label: "New York City Building Footprints to 42nd Street, 1854 (NYPL / Columbia)", url: URLS.atlasPage, fetched }] : []),
    ...applied.map((c) => ({ id: `correction:${c.id}`, label: `Construction year correction: ${c.name}`, url: c.url, fetched })),
    ...[...new Map(MANUAL_TOWERS.map((m) => [m.url, m])).values()].map((m) => ({
      id: `manual:${m.slug}`,
      label: `Manual entry: ${m.name}`,
      url: m.url,
      fetched,
    })),
  ];
  const data = {
    origin: { ...ORIGIN },
    extent: { minX, maxX, minY, maxY },
    years: { min: minYear, present: PRESENT },
    maxHeightM: maxH,
    sources,
    prisms,
  };
  const counts = { current: cur.length, historic: his.length, manual: man.length, atlas1854: atl.length };
  return { data, log, counts };
}

async function getJson(url, cacheFile) {
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "xyzt-city-bake/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const text = await res.text();
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, text);
      }
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function atlasUrl() {
  // The layer's native grid (see ATLAS_FIT): a box around the anchor covers the bbox with margin.
  const [ax, ay] = ATLAS_FIT.anchorFt;
  const r = 5500;
  return `${URLS.atlasWfs}&bbox=${ax - r},${ay - r},${ax + r},${ay + r}`;
}

async function main() {
  const args = process.argv.slice(2);
  const cacheDir = args[args.indexOf("--cache") + 1] && args.includes("--cache") ? args[args.indexOf("--cache") + 1] : null;
  const q = `$where=${encodeURIComponent(SOCRATA_WHERE)}&$limit=50000`;
  const c = (n) => (cacheDir ? path.join(cacheDir, n) : null);
  const current = await getJson(`${URLS.current}?${q}`, c("current.geojson"));
  const historic = await getJson(`${URLS.historic}?${q}`, c("historic.geojson"));
  let atlas = null;
  try {
    atlas = await getJson(atlasUrl(), c("atlas1854.json"));
  } catch (e) {
    console.warn(`1854 atlas unavailable, continuing without it: ${e.message}`);
  }
  const fetched = new Date().toISOString().slice(0, 10);
  const { data, log, counts } = buildDataset({ current, historic, atlas, fetched });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const json = JSON.stringify(data);
  fs.writeFileSync(OUT, json);
  console.log("counts", counts, "total", data.prisms.length);
  console.log("dropped", log);
  console.log(`years.min ${data.years.min}, maxHeightM ${data.maxHeightM}, ${(json.length / 1e6).toFixed(2)} MB -> ${OUT}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
