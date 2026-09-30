/**
 * The View's geographic state: centre, zoom (maxDist) and the eased targets used by
 * double-tap zoom and aircraft following. Projection is viz1090's local
 * equirectangular approximation (pxFromLonLat + screenCoords), kept in floating point
 * so motion stays smooth, and made exactly invertible so drags track the pointer.
 */

import {
  clamp,
  LATLONMULT,
  MAX_MAX_DIST_KM,
  MIN_MAX_DIST_KM,
} from "../config";

const DEG = Math.PI / 180;

export type CameraSnapshot = {
  centerLon: number;
  centerLat: number;
  maxDist: number;
  width: number;
  height: number;
};

export class Camera {
  width = 1;
  height = 1;
  centerLon: number;
  centerLat: number;
  maxDist: number;

  private targetLon: number | null = null;
  private targetLat: number | null = null;
  private targetMaxDist: number | null = null;

  /** Increments whenever the projection changes. */
  version = 0;
  /** performance.now() of the last projection change. */
  changedAt = 0;

  constructor(lat: number, lon: number, maxDist: number) {
    this.centerLat = lat;
    this.centerLon = lon;
    this.maxDist = maxDist;
  }

  /** Screen pixels per kilometre. */
  get scale() {
    return (0.5 * Math.max(this.width, this.height)) / this.maxDist;
  }

  get animating() {
    return this.targetMaxDist !== null || this.targetLon !== null;
  }

  snapshot(): CameraSnapshot {
    return {
      centerLon: this.centerLon,
      centerLat: this.centerLat,
      maxDist: this.maxDist,
      width: this.width,
      height: this.height,
    };
  }

  private touch() {
    this.version++;
    this.changedAt = performance.now();
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.touch();
  }

  /** Writes screen coordinates of (lon, lat) into out[0], out[1]. */
  project(lon: number, lat: number, out: Float64Array | number[]) {
    const scale = this.scale;
    const dx = LATLONMULT * (lon - this.centerLon) * Math.cos(((lat + this.centerLat) / 2) * DEG);
    const dy = LATLONMULT * (lat - this.centerLat);
    out[0] = this.width / 2 + dx * scale;
    out[1] = this.height / 2 - dy * scale;
  }

  /** Inverse of project: writes [lon, lat] into out. */
  unproject(x: number, y: number, out: Float64Array | number[]) {
    const scale = this.scale;
    const lat = this.centerLat + (this.height / 2 - y) / scale / LATLONMULT;
    const lon =
      this.centerLon +
      (x - this.width / 2) / scale / (LATLONMULT * Math.cos(((lat + this.centerLat) / 2) * DEG));
    out[0] = lon;
    out[1] = lat;
  }

  /** Geographic bounds of the screen, padded by `margin` pixels. */
  bounds(margin = 0) {
    const corner = [0, 0];
    let lonMin = Infinity;
    let lonMax = -Infinity;
    let latMin = Infinity;
    let latMax = -Infinity;
    const xs = [-margin, this.width / 2, this.width + margin];
    const ys = [-margin, this.height / 2, this.height + margin];
    for (const x of xs) {
      for (const y of ys) {
        this.unproject(x, y, corner);
        lonMin = Math.min(lonMin, corner[0]);
        lonMax = Math.max(lonMax, corner[0]);
        latMin = Math.min(latMin, corner[1]);
        latMax = Math.max(latMax, corner[1]);
      }
    }
    return {
      lonMin,
      lonMax,
      latMin: Math.max(-90, latMin),
      latMax: Math.min(90, latMax),
    };
  }

  /** Drag by a screen-space delta (View::moveCenterRelative). */
  moveRelative(dx: number, dy: number) {
    const scale = this.scale;
    this.centerLat = clamp(this.centerLat + dy / scale / LATLONMULT, -85, 85);
    this.centerLon -= dx / scale / (LATLONMULT * Math.cos(this.centerLat * DEG));
    this.centerLon = ((((this.centerLon + 180) % 360) + 360) % 360) - 180;
    this.targetLon = null;
    this.targetLat = null;
    this.touch();
  }

  zoomBy(factor: number) {
    this.maxDist = clamp(this.maxDist * factor, MIN_MAX_DIST_KM, MAX_MAX_DIST_KM);
    this.targetMaxDist = null;
    this.touch();
  }

  /** Double tap: glide to the tapped point while zooming in 4× (View::animateCenterAbsolute). */
  animateToScreenPoint(x: number, y: number) {
    const point = [0, 0];
    this.unproject(x, y, point);
    this.targetLon = point[0];
    this.targetLat = point[1];
    this.targetMaxDist = clamp(0.25 * this.maxDist, MIN_MAX_DIST_KM, MAX_MAX_DIST_KM);
  }

  /** Eased zoom about the centre, used when double-tapping a selected aircraft. */
  animateZoom(factor: number) {
    this.targetMaxDist = clamp(factor * this.maxDist, MIN_MAX_DIST_KM, MAX_MAX_DIST_KM);
  }

  follow(lon: number, lat: number) {
    this.targetLon = lon;
    this.targetLat = lat;
  }

  /** One fixed tick of moveMapToTarget + zoomMapToTarget. */
  step() {
    let changed = false;
    if (this.targetLon !== null && this.targetLat !== null) {
      const dLon = this.targetLon - this.centerLon;
      const dLat = this.targetLat - this.centerLat;
      if (Math.abs(dLon) > 0.0001 || Math.abs(dLat) > 0.0001) {
        this.centerLon += 0.1 * dLon;
        this.centerLat += 0.1 * dLat;
        changed = true;
      } else {
        this.targetLon = null;
        this.targetLat = null;
      }
    }
    if (this.targetMaxDist !== null) {
      const dDist = this.targetMaxDist - this.maxDist;
      if (Math.abs(dDist) > 0.0001 * this.maxDist) {
        this.maxDist += 0.1 * dDist;
        changed = true;
      } else {
        this.targetMaxDist = null;
      }
    }
    if (changed) this.touch();
  }
}
