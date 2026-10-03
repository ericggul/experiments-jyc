// Pure geometry helpers for the Lower Manhattan bake. No I/O.

export const ORIGIN = { lat: 40.708, lon: -74.01 };
export const BBOX = { south: 40.6995, north: 40.7165, west: -74.02, east: -73.998 };
export const FT_TO_M = 0.3048;

const COS_LAT0 = Math.cos((ORIGIN.lat * Math.PI) / 180);

/** Local equirectangular metres: x east, y north. */
export function project(lon, lat) {
  return [(lon - ORIGIN.lon) * COS_LAT0 * 111320, (lat - ORIGIN.lat) * 110540];
}

export function round1(v) {
  return Math.round(v * 10) / 10;
}

/** Shoelace area; positive for CCW (x east, y north). `pts` is an array of [x, y], open or closed. */
export function signedArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return a / 2;
}

export function dropClosing(pts) {
  const n = pts.length;
  if (n > 1 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1]) return pts.slice(0, n - 1);
  return pts;
}

export function ensureCCW(pts) {
  return signedArea(pts) < 0 ? pts.slice().reverse() : pts;
}

function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker on an open polyline; keeps both endpoints. */
export function douglasPeucker(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segDist(pts[i], pts[s], pts[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tol) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplify a closed ring (open representation); the ring is split at its two farthest-apart anchors. */
export function simplifyRing(ring, tol) {
  if (ring.length < 4) return ring.slice();
  let a = 0;
  let b = 0;
  let best = -1;
  // Anchor 0 and the point farthest from it, then DP both halves.
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > best) {
      best = d;
      b = i;
    }
  }
  const h1 = douglasPeucker(ring.slice(a, b + 1), tol);
  const h2 = douglasPeucker([...ring.slice(b), ring[0]], tol);
  return [...h1.slice(0, -1), ...h2.slice(0, -1)];
}

/** Even-odd point-in-polygon. `ring` is an array of [x, y]. */
export function pointInPolygon(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function ringCentroid(ring) {
  // Area-weighted centroid; falls back to vertex mean for degenerate rings.
  const a = signedArea(ring);
  if (Math.abs(a) < 1e-9) {
    return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function ringBounds(ring) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/** Largest (by area) outer ring of a GeoJSON Polygon/MultiPolygon, as [lon, lat] points (holes dropped). */
export function largestOuterRing(geometry) {
  if (!geometry) return null;
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  let best = null;
  let bestArea = -1;
  for (const poly of polys) {
    const outer = poly?.[0];
    if (!outer || outer.length < 4) continue;
    const area = Math.abs(signedArea(outer));
    if (area > bestArea) {
      bestArea = area;
      best = outer;
    }
  }
  return best;
}

/**
 * Standard processing of a planar ring (local metres): drop closing point, round to 0.1 m,
 * CCW, Douglas-Peucker 0.5 m. Returns `null` when under 3 points or area < 10 m².
 */
export function processRing(points, { tol = 0.5, minArea = 10 } = {}) {
  let ring = dropClosing(points).map(([x, y]) => [round1(x), round1(y)]);
  ring = ensureCCW(ring);
  ring = simplifyRing(ring, tol);
  ring = ring.map(([x, y]) => [round1(x), round1(y)]);
  if (ring.length < 3) return null;
  ring = ensureCCW(ring);
  if (Math.abs(signedArea(ring)) < minArea) return null;
  return ring;
}

export const flatten = (ring) => ring.flatMap(([x, y]) => [x, y]);
export const unflatten = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
  return out;
};

/** Rectangle (w along its own x, d along its own y) centred at `c`, rotated by `rotDeg` CCW from east. */
export function rectRing(cx, cy, w, d, rotDeg) {
  const r = (rotDeg * Math.PI) / 180;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([x, y]) => [cx + x * cs - y * sn, cy + x * sn + y * cs]);
}

/**
 * Columbia's 1854 layer is labelled EPSG:2263 but its coordinates are not: they are feet in a
 * grid offset and rotated ~4.6 degrees from true. Fitted offline by registering atlas
 * centroids to the 73 surviving pre-1855 NYC footprints (56 within 6 m, mean error ~5 m):
 * anchor = Trinity Church in the layer; rotation clockwise.
 */
export const ATLAS_FIT = {
  anchorFt: [2594152, 6034711],
  anchorLonLat: [-74.01212, 40.70812],
  shiftM: [-2, -18],
  rotationDeg: 4.625,
};

export function atlasToLocal([x, y], fit = ATLAS_FIT) {
  const [ax, ay] = project(fit.anchorLonLat[0], fit.anchorLonLat[1]);
  const dx = (x - fit.anchorFt[0]) * FT_TO_M;
  const dy = (y - fit.anchorFt[1]) * FT_TO_M;
  const t = (fit.rotationDeg * Math.PI) / 180;
  return [Math.cos(t) * dx + Math.sin(t) * dy + ax + fit.shiftM[0], -Math.sin(t) * dx + Math.cos(t) * dy + ay + fit.shiftM[1]];
}

/** Atlas height rule (heightEstimated): brick/stone ~14 m, frame/wood ~9 m, else ~11 m. */
export function atlasHeightM(materials) {
  const m = String(materials ?? "").toLowerCase();
  if (/wood|frame/.test(m)) return 9;
  if (/brick|stone/.test(m)) return 14;
  return 11;
}

/** Simple uniform grid over ring bounds for centroid/ring lookups. */
export class RingIndex {
  constructor(cell = 50) {
    this.cell = cell;
    this.cells = new Map();
    this.items = [];
  }
  add(item) {
    const b = item.bounds;
    const k = this.items.push(item) - 1;
    for (let gx = Math.floor(b.minX / this.cell); gx <= Math.floor(b.maxX / this.cell); gx++) {
      for (let gy = Math.floor(b.minY / this.cell); gy <= Math.floor(b.maxY / this.cell); gy++) {
        const key = `${gx},${gy}`;
        const list = this.cells.get(key);
        if (list) list.push(k);
        else this.cells.set(key, [k]);
      }
    }
  }
  /** Items whose bounds intersect `b`. */
  query(b) {
    const seen = new Set();
    for (let gx = Math.floor(b.minX / this.cell); gx <= Math.floor(b.maxX / this.cell); gx++) {
      for (let gy = Math.floor(b.minY / this.cell); gy <= Math.floor(b.maxY / this.cell); gy++) {
        for (const k of this.cells.get(`${gx},${gy}`) ?? []) seen.add(k);
      }
    }
    return [...seen].map((k) => this.items[k]);
  }
}
