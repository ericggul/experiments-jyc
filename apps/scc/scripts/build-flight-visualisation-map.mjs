#!/usr/bin/env node
/**
 * Bakes the flight-visualisation geography, following viz1090's mapconverter.py:
 * Natural Earth lines become the dark map, runway outlines become the airport layer,
 * and populated places / IATA codes become the label lists.
 *
 * Unlike viz1090's single mapdata.bin, the output is split into quantized tiles at two
 * levels of detail so the browser only fetches what is on screen.
 *
 * Usage:
 *   node scripts/build-flight-visualisation-map.mjs <source-dir>
 *
 * <source-dir> must contain (Natural Earth GeoJSON from nvkelso/natural-earth-vector,
 * OurAirports CSV from davidmegginson.github.io/ourairports-data):
 *   ne_10m_admin_1_states_provinces_lines.geojson
 *   ne_10m_admin_0_boundary_lines_land.geojson
 *   ne_10m_coastline.geojson
 *   ne_10m_populated_places_simple.geojson
 *   ne_10m_airports.geojson
 *   runways.csv
 *
 * Tiles are grouped into pack files (one request per pack). Pack format (little endian):
 *   Uint32 tileCount, then per tile: Uint16 tx, Uint16 ty, Uint32 geoLength, Uint32 airportLength,
 *   then, per tile in the same order, two Int16 streams of those lengths.
 *   Each stream is a sequence of [pointCount, x0, y0, x1, y1, ...] strips where
 *   x = round((lon - tileLon) / tileSize * QUANT), y likewise for latitude.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUANT = 16384;
const MAX_STRIP = 8000;

const LODS = [
  { name: "lod0", tileSize: 4, packSize: 20, tolerance: 0.0008, runways: true },
  { name: "lod1", tileSize: 20, packSize: 60, tolerance: 0.012, runways: false },
];

const MIN_PLACE_POPULATION = 100000;

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("usage: build-flight-visualisation-map.mjs <source-dir>");
  process.exit(1);
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(appRoot, "public", "data", "flight-visualisation");

async function readJson(name) {
  return JSON.parse(await readFile(path.join(sourceDir, name), "utf8"));
}

function collectLines(collection) {
  const lines = [];
  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "LineString") lines.push(geometry.coordinates);
    else if (geometry.type === "MultiLineString") lines.push(...geometry.coordinates);
    else if (geometry.type === "Polygon") lines.push(...geometry.coordinates);
    else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates) lines.push(...polygon);
    }
  }
  return lines;
}

// Iterative Douglas–Peucker, matching shapely's simplify(preserve_topology=False).
function simplify(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const toleranceSquared = tolerance * tolerance;

  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    let maxDistance = 0;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      let distance;
      if (lengthSquared === 0) {
        distance = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
        distance = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      }
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (index >= 0 && maxDistance > toleranceSquared) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, i) => [key, values[i]])));
}

// Runway outlines: OurAirports gives both thresholds and a width, which is enough to
// rebuild the rectangular polygons viz1090 took from the FAA runway shapefile.
function runwayOutlines(rows) {
  const outlines = [];
  for (const row of rows) {
    if (row.closed === "1") continue;
    const lat1 = Number.parseFloat(row.le_latitude_deg);
    const lon1 = Number.parseFloat(row.le_longitude_deg);
    const lat2 = Number.parseFloat(row.he_latitude_deg);
    const lon2 = Number.parseFloat(row.he_longitude_deg);
    const widthFeet = Number.parseFloat(row.width_ft);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) continue;

    const kmPerLon = 111.195 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
    const ex = (lon2 - lon1) * kmPerLon;
    const ey = (lat2 - lat1) * 111.195;
    const length = Math.hypot(ex, ey);
    if (length < 0.2 || length > 7) continue;

    const halfWidth = ((Number.isFinite(widthFeet) && widthFeet > 0 ? widthFeet : 100) * 0.0003048) / 2;
    const nx = (-ey / length) * halfWidth;
    const ny = (ex / length) * halfWidth;
    const offsetLon = nx / kmPerLon;
    const offsetLat = ny / 111.195;
    outlines.push([
      [lon1 + offsetLon, lat1 + offsetLat],
      [lon2 + offsetLon, lat2 + offsetLat],
      [lon2 - offsetLon, lat2 - offsetLat],
      [lon1 - offsetLon, lat1 - offsetLat],
      [lon1 + offsetLon, lat1 + offsetLat],
    ]);
  }
  return outlines;
}

function densify(points, maxStep) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / maxStep);
    for (let s = 1; s < steps; s++) {
      out.push([ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps]);
    }
    out.push(points[i]);
  }
  return out;
}

function tileKey(lon, lat, size) {
  return `${Math.floor((lon + 180) / size)}_${Math.floor((lat + 90) / size)}`;
}

// Segments are assigned to the tile containing their midpoint; consecutive segments in
// the same tile are joined back into one strip. Quantization leaves a full tile of
// headroom on every side, so endpoints that spill over an edge still encode exactly.
function addToTiles(tiles, layer, lines, size) {
  for (const raw of lines) {
    if (raw.length < 2) continue;
    const points = densify(raw, size / 2);
    let strip = null;
    let stripKey = null;

    const flush = () => {
      if (strip && strip.length >= 2) {
        if (!tiles.has(stripKey)) tiles.set(stripKey, { geo: [], airport: [] });
        tiles.get(stripKey)[layer].push(strip);
      }
      strip = null;
    };

    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      if (ax === bx && ay === by) continue;
      const key = tileKey((ax + bx) / 2, (ay + by) / 2, size);
      if (key !== stripKey || !strip || strip.length >= MAX_STRIP) {
        flush();
        stripKey = key;
        strip = [points[i - 1]];
      }
      strip.push(points[i]);
    }
    flush();
  }
}

function encodeStream(strips, key, size) {
  const [tx, ty] = key.split("_").map(Number);
  const originLon = tx * size - 180;
  const originLat = ty * size - 90;
  const values = [];
  for (const strip of strips) {
    const encoded = [];
    let lastX = null;
    let lastY = null;
    for (const [lon, lat] of strip) {
      const x = Math.round(((lon - originLon) / size) * QUANT);
      const y = Math.round(((lat - originLat) / size) * QUANT);
      if (x === lastX && y === lastY) continue;
      if (x < -32768 || x > 32767 || y < -32768 || y > 32767) {
        throw new Error(`point out of tile range in ${key}`);
      }
      encoded.push(x, y);
      lastX = x;
      lastY = y;
    }
    if (encoded.length < 4) continue;
    values.push(encoded.length / 2, ...encoded);
  }
  return values;
}

async function writeLod(lod, geoLines, airportLines) {
  const tiles = new Map();
  const simplifiedGeo = geoLines.map((line) => simplify(line, lod.tolerance));
  addToTiles(tiles, "geo", simplifiedGeo, lod.tileSize);
  if (lod.runways) addToTiles(tiles, "airport", airportLines, lod.tileSize);

  const directory = path.join(outDir, lod.name);
  await mkdir(directory, { recursive: true });

  const perTile = lod.packSize / lod.tileSize;
  const packs = new Map();
  for (const key of [...tiles.keys()].sort()) {
    const [tx, ty] = key.split("_").map(Number);
    const packKey = `${Math.floor(tx / perTile)}_${Math.floor(ty / perTile)}`;
    if (!packs.has(packKey)) packs.set(packKey, []);
    packs.get(packKey).push(key);
  }

  let bytes = 0;
  let points = 0;
  const packKeys = [...packs.keys()].sort();
  for (const packKey of packKeys) {
    const entries = packs.get(packKey).map((key) => {
      const tile = tiles.get(key);
      return {
        key,
        geo: encodeStream(tile.geo, key, lod.tileSize),
        airport: encodeStream(tile.airport, key, lod.tileSize),
      };
    });
    const values = entries.reduce((sum, entry) => sum + entry.geo.length + entry.airport.length, 0);
    const buffer = Buffer.alloc(4 + entries.length * 12 + values * 2);
    let offset = buffer.writeUInt32LE(entries.length, 0);
    for (const entry of entries) {
      const [tx, ty] = entry.key.split("_").map(Number);
      offset = buffer.writeUInt16LE(tx, offset);
      offset = buffer.writeUInt16LE(ty, offset);
      offset = buffer.writeUInt32LE(entry.geo.length, offset);
      offset = buffer.writeUInt32LE(entry.airport.length, offset);
    }
    for (const entry of entries) {
      for (const value of entry.geo) offset = buffer.writeInt16LE(value, offset);
      for (const value of entry.airport) offset = buffer.writeInt16LE(value, offset);
    }
    await writeFile(path.join(directory, `${packKey}.bin`), buffer);
    bytes += buffer.length;
    points += values / 2;
  }

  console.log(`${lod.name}: ${tiles.size} tiles in ${packKeys.length} packs, ~${points} points, ${(bytes / 1e6).toFixed(2)} MB`);
  return { name: lod.name, tileSize: lod.tileSize, packSize: lod.packSize, packs: packKeys };
}

const round = (value) => Math.round(value * 10000) / 10000;

async function main() {
  const geoLines = [
    ...collectLines(await readJson("ne_10m_admin_1_states_provinces_lines.geojson")),
    ...collectLines(await readJson("ne_10m_admin_0_boundary_lines_land.geojson")),
    ...collectLines(await readJson("ne_10m_coastline.geojson")),
  ];
  const runways = runwayOutlines(parseCsv(await readFile(path.join(sourceDir, "runways.csv"), "utf8")));
  console.log(`${geoLines.length} map lines, ${runways.length} runway outlines`);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const lods = [];
  for (const lod of LODS) lods.push(await writeLod(lod, geoLines, runways));

  const places = (await readJson("ne_10m_populated_places_simple.geojson")).features
    .filter((feature) => (feature.properties.pop_min ?? 0) > MIN_PLACE_POPULATION)
    .map((feature) => [
      round(feature.geometry.coordinates[0]),
      round(feature.geometry.coordinates[1]),
      feature.properties.name,
      feature.properties.pop_min,
    ]);
  const airports = (await readJson("ne_10m_airports.geojson")).features
    .filter((feature) => /^[A-Z0-9]{3}$/.test(feature.properties.iata_code ?? ""))
    .map((feature) => [
      round(feature.geometry.coordinates[0]),
      round(feature.geometry.coordinates[1]),
      feature.properties.iata_code,
    ]);

  await writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify({ quant: QUANT, lods }),
  );
  await writeFile(path.join(outDir, "labels.json"), JSON.stringify({ places, airports }));
  console.log(`${places.length} place names, ${airports.length} airport names`);
}

await main();
