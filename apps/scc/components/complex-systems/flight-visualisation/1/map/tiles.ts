/**
 * Geography store. viz1090 loads one mapdata.bin into a quadtree on a background
 * thread and reports "loading map N%"; here the baked geography is split into
 * quantized pack files (see scripts/build-flight-visualisation-map.mjs) that are
 * fetched on demand for the level of detail and area on screen.
 */

import { MAP_DATA_ROOT } from "../config";

export type Strips = {
  /** Interleaved lon, lat. */
  coords: Float32Array;
  /** Per strip: start (point index), count. */
  ranges: Uint32Array;
  /** Per strip: lonMin, latMin, lonMax, latMax. */
  boxes: Float32Array;
};

export type MapTile = {
  lonMin: number;
  latMin: number;
  size: number;
  geo: Strips;
  airport: Strips;
};

type Lod = {
  name: string;
  tileSize: number;
  packSize: number;
  packs: Set<string>;
};

type Manifest = { quant: number; lods: Lod[] };

type PackState = { status: "loading" | "ready" | "failed"; tiles: MapTile[] };

export type MapLabel = { lon: number; lat: number; text: string; population: number };

export type Bounds = { lonMin: number; lonMax: number; latMin: number; latMax: number };

/** Kilometres per screen pixel above which the coarse level of detail is drawn. */
const COARSE_KM_PER_PIXEL = 0.3;

function decodeStream(view: DataView, offset: number, length: number, originLon: number, originLat: number, size: number, quant: number): Strips {
  let strips = 0;
  let points = 0;
  for (let i = 0; i < length; ) {
    const count = view.getInt16(offset + i * 2, true);
    strips++;
    points += count;
    i += 1 + count * 2;
  }

  const coords = new Float32Array(points * 2);
  const ranges = new Uint32Array(strips * 2);
  const boxes = new Float32Array(strips * 4);
  const step = size / quant;
  let point = 0;
  let strip = 0;

  for (let i = 0; i < length; ) {
    const count = view.getInt16(offset + i * 2, true);
    i++;
    let lonMin = Infinity;
    let latMin = Infinity;
    let lonMax = -Infinity;
    let latMax = -Infinity;
    ranges[strip * 2] = point;
    ranges[strip * 2 + 1] = count;
    for (let p = 0; p < count; p++, i += 2) {
      const lon = originLon + view.getInt16(offset + i * 2, true) * step;
      const lat = originLat + view.getInt16(offset + i * 2 + 2, true) * step;
      coords[point * 2] = lon;
      coords[point * 2 + 1] = lat;
      point++;
      if (lon < lonMin) lonMin = lon;
      if (lon > lonMax) lonMax = lon;
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
    }
    boxes.set([lonMin, latMin, lonMax, latMax], strip * 4);
    strip++;
  }

  return { coords, ranges, boxes };
}

function decodePack(buffer: ArrayBuffer, tileSize: number, quant: number): MapTile[] {
  const view = new DataView(buffer);
  const count = view.getUint32(0, true);
  const headers = [];
  for (let i = 0; i < count; i++) {
    const base = 4 + i * 12;
    headers.push({
      tx: view.getUint16(base, true),
      ty: view.getUint16(base + 2, true),
      geoLength: view.getUint32(base + 4, true),
      airportLength: view.getUint32(base + 8, true),
    });
  }

  let offset = 4 + count * 12;
  return headers.map((header) => {
    const lonMin = header.tx * tileSize - 180;
    const latMin = header.ty * tileSize - 90;
    const geo = decodeStream(view, offset, header.geoLength, lonMin, latMin, tileSize, quant);
    offset += header.geoLength * 2;
    const airport = decodeStream(view, offset, header.airportLength, lonMin, latMin, tileSize, quant);
    offset += header.airportLength * 2;
    return { lonMin, latMin, size: tileSize, geo, airport };
  });
}

export class MapStore {
  private manifest: Manifest | null = null;
  private packs = new Map<string, PackState>();
  private disposed = false;
  places: MapLabel[] = [];
  airportNames: MapLabel[] = [];
  /** Increments when geometry or labels arrive, so cached map layers know to redraw. */
  version = 0;
  failed = false;

  constructor() {
    void this.initialise();
  }

  private async initialise() {
    try {
      const [manifest, labels] = await Promise.all([
        fetch(`${MAP_DATA_ROOT}/manifest.json`).then((response) => response.json()),
        fetch(`${MAP_DATA_ROOT}/labels.json`).then((response) => response.json()),
      ]);
      if (this.disposed) return;
      this.manifest = {
        quant: manifest.quant,
        lods: manifest.lods.map((lod: { name: string; tileSize: number; packSize: number; packs: string[] }) => ({
          ...lod,
          packs: new Set(lod.packs),
        })),
      };
      const toLabel = ([lon, lat, text, population = 0]: [number, number, string, number?]) => ({ lon, lat, text, population });
      this.places = labels.places.map(toLabel);
      this.airportNames = labels.airports.map(toLabel);
      this.version++;
    } catch {
      this.failed = true;
    }
  }

  dispose() {
    this.disposed = true;
  }

  lodFor(kmPerPixel: number) {
    if (!this.manifest) return null;
    const lods = this.manifest.lods;
    return kmPerPixel > COARSE_KM_PER_PIXEL ? lods[lods.length - 1] : lods[0];
  }

  private packKeys(lod: Lod, bounds: Bounds) {
    const keys: string[] = [];
    const packsX = 360 / lod.packSize;
    const y0 = Math.max(0, Math.floor((bounds.latMin + 90) / lod.packSize));
    const y1 = Math.min(180 / lod.packSize - 1, Math.floor((bounds.latMax + 90) / lod.packSize));
    const x0 = Math.floor((bounds.lonMin + 180) / lod.packSize);
    const x1 = Math.floor((bounds.lonMax + 180) / lod.packSize);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= Math.min(x1, x0 + packsX - 1); x++) {
        const key = `${((x % packsX) + packsX) % packsX}_${y}`;
        if (lod.packs.has(key)) keys.push(key);
      }
    }
    return keys;
  }

  private load(lod: Lod, key: string) {
    const id = `${lod.name}/${key}`;
    const state: PackState = { status: "loading", tiles: [] };
    this.packs.set(id, state);
    fetch(`${MAP_DATA_ROOT}/${id}.bin`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (this.disposed || !this.manifest) return;
        state.tiles = decodePack(buffer, lod.tileSize, this.manifest.quant);
        state.status = "ready";
        this.version++;
      })
      .catch(() => {
        state.status = "failed";
      });
  }

  /**
   * Tiles for the view, requesting any missing packs. `loaded` is the share of the
   * needed packs already decoded (0–100), shown as viz1090's "loading map" status.
   */
  visible(bounds: Bounds, kmPerPixel: number): { tiles: MapTile[]; loaded: number } {
    if (this.failed) return { tiles: [], loaded: 100 };
    const lod = this.lodFor(kmPerPixel);
    if (!lod) return { tiles: [], loaded: 0 };

    const keys = this.packKeys(lod, bounds);
    const tiles: MapTile[] = [];
    let ready = 0;
    for (const key of keys) {
      const state = this.packs.get(`${lod.name}/${key}`);
      if (!state) {
        this.load(lod, key);
        continue;
      }
      if (state.status !== "loading") ready++;
      for (const tile of state.tiles) {
        if (tile.lonMin > bounds.lonMax || tile.lonMin + tile.size < bounds.lonMin) continue;
        if (tile.latMin > bounds.latMax || tile.latMin + tile.size < bounds.latMin) continue;
        tiles.push(tile);
      }
    }
    return { tiles, loaded: keys.length ? Math.floor((100 * ready) / keys.length) : 100 };
  }
}
