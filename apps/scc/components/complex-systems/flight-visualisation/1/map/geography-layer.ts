/**
 * Cached map layer (View::drawGeography). Lines and place names are rendered into an
 * offscreen canvas and blitted every frame; while the camera moves, the cached image
 * is shifted and scaled to follow it and re-rendered on a throttle derived from the
 * measured cost of the last render, so cheap views redraw every frame and dense ones
 * fall back to viz1090's "every 8 frames while animating" behaviour.
 */

import { LATLONMULT, rgba, STYLE, TICK_MS } from "../config";
import type { Camera, CameraSnapshot } from "../view/camera";
import type { Typography } from "../view/typography";
import type { MapLabel, MapStore, MapTile, Strips } from "./tiles";

const DEG = Math.PI / 180;
/** Extra rendered border (CSS px) so short pans reveal cached map instead of black. */
const MARGIN = 96;
const SETTLE_MS = 120;
const MAX_THROTTLE_MS = 8 * TICK_MS;
const PATH_CHUNK = 6000;

export class GeographyLayer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private dpr = 1;
  private rendered: CameraSnapshot | null = null;
  private renderedCamera = -1;
  private renderedStore = -1;
  private renderedFonts = -1;
  private renderedAt = 0;
  private cost = 0;
  /** Share of the needed map packs that are decoded, 0–100. */
  loaded = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("2D canvas unavailable");
    this.context = context;
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.canvas.width = Math.ceil((width + MARGIN * 2) * dpr);
    this.canvas.height = Math.ceil((height + MARGIN * 2) * dpr);
    this.rendered = null;
  }

  update(camera: Camera, store: MapStore, typography: Typography, now: number) {
    const stale =
      !this.rendered ||
      this.renderedCamera !== camera.version ||
      this.renderedStore !== store.version ||
      this.renderedFonts !== typography.version ||
      this.loaded < 100;
    if (!stale) return;

    const moving = camera.animating || now - camera.changedAt < SETTLE_MS;
    const throttle = Math.min(MAX_THROTTLE_MS, this.cost * 4);
    const loadingThrottle = this.loaded < 100 && this.renderedCamera === camera.version ? 250 : 0;
    if (this.rendered && (moving || loadingThrottle) && now - this.renderedAt < Math.max(throttle, loadingThrottle)) {
      return;
    }

    const start = performance.now();
    this.render(camera, store, typography);
    this.cost = performance.now() - start;
    this.renderedAt = now;
    this.renderedCamera = camera.version;
    this.renderedStore = store.version;
    this.renderedFonts = typography.version;
  }

  private render(camera: Camera, store: MapStore, typography: Typography) {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.fillStyle = rgba(STYLE.background);
    context.fillRect(0, 0, camera.width + MARGIN * 2, camera.height + MARGIN * 2);

    const kmPerPixel = 1 / camera.scale;
    const bounds = camera.bounds(MARGIN);
    const { tiles, loaded } = store.visible(bounds, kmPerPixel);
    this.loaded = loaded;
    const projection = {
      centerLon: camera.centerLon,
      centerLat: camera.centerLat,
      scale: camera.scale,
      originX: camera.width / 2 + MARGIN,
      originY: camera.height / 2 + MARGIN,
      bounds,
    };

    context.lineWidth = 1;
    context.lineJoin = "round";
    context.strokeStyle = rgba(STYLE.geo);
    strokeLayer(context, tiles, "geo", projection);
    context.strokeStyle = rgba(STYLE.airport);
    strokeLayer(context, tiles, "airport", projection);

    context.font = typography.regular;
    context.textBaseline = "top";
    context.fillStyle = rgba(STYLE.geo);
    const minimumPopulation = 100000 * Math.max(1, camera.maxDist / 100) ** 1.5;
    drawNames(context, store.places, projection, (label) => label.population >= minimumPopulation);
    if (camera.maxDist < 400) drawNames(context, store.airportNames, projection, () => true);

    this.rendered = camera.snapshot();
  }

  /** Blits the cache, transformed from the camera it was rendered with to the current one. */
  draw(target: CanvasRenderingContext2D, camera: Camera) {
    target.fillStyle = rgba(STYLE.background);
    target.fillRect(0, 0, camera.width, camera.height);
    const rendered = this.rendered;
    if (!rendered) return;

    const point = [0, 0];
    camera.project(rendered.centerLon, rendered.centerLat, point);
    const renderedScale = (0.5 * Math.max(rendered.width, rendered.height)) / rendered.maxDist;
    const k = camera.scale / renderedScale;
    const width = (rendered.width + MARGIN * 2) * k;
    const height = (rendered.height + MARGIN * 2) * k;
    const x = point[0] - k * (rendered.width / 2 + MARGIN);
    const y = point[1] - k * (rendered.height / 2 + MARGIN);

    if (k === 1) {
      const snap = (value: number) => Math.round(value * this.dpr) / this.dpr;
      target.drawImage(this.canvas, snap(x), snap(y), width, height);
    } else {
      target.drawImage(this.canvas, x, y, width, height);
    }
  }
}

type Projection = {
  centerLon: number;
  centerLat: number;
  scale: number;
  originX: number;
  originY: number;
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number };
};

function strokeLayer(context: CanvasRenderingContext2D, tiles: MapTile[], layer: "geo" | "airport", p: Projection) {
  const { centerLon, centerLat, scale, originX, originY, bounds } = p;
  const kx = LATLONMULT * scale;
  let segments = 0;
  context.beginPath();

  for (const tile of tiles) {
    const strips: Strips = tile[layer];
    const { coords, ranges, boxes } = strips;
    const stripCount = ranges.length / 2;

    for (let s = 0; s < stripCount; s++) {
      const box = s * 4;
      if (boxes[box] > bounds.lonMax || boxes[box + 2] < bounds.lonMin) continue;
      if (boxes[box + 1] > bounds.latMax || boxes[box + 3] < bounds.latMin) continue;

      const start = ranges[s * 2];
      const count = ranges[s * 2 + 1];
      let lastX = 0;
      let lastY = 0;
      for (let i = 0; i < count; i++) {
        const lon = coords[(start + i) * 2];
        const lat = coords[(start + i) * 2 + 1];
        const x = originX + kx * (lon - centerLon) * Math.cos(((lat + centerLat) / 2) * DEG);
        const y = originY - kx * (lat - centerLat);
        if (i === 0) {
          context.moveTo(x, y);
        } else if (i === count - 1 || Math.abs(x - lastX) + Math.abs(y - lastY) >= 0.75) {
          context.lineTo(x, y);
          segments++;
        } else {
          continue;
        }
        lastX = x;
        lastY = y;
      }

      if (segments > PATH_CHUNK) {
        context.stroke();
        context.beginPath();
        segments = 0;
      }
    }
  }
  context.stroke();
}

function drawNames(context: CanvasRenderingContext2D, labels: MapLabel[], p: Projection, include: (label: MapLabel) => boolean) {
  const { centerLon, centerLat, scale, originX, originY, bounds } = p;
  const kx = LATLONMULT * scale;
  for (const label of labels) {
    if (label.lon < bounds.lonMin || label.lon > bounds.lonMax) continue;
    if (label.lat < bounds.latMin || label.lat > bounds.latMax) continue;
    if (!include(label)) continue;
    const x = originX + kx * (label.lon - centerLon) * Math.cos(((label.lat + centerLat) / 2) * DEG);
    const y = originY - kx * (label.lat - centerLat);
    context.fillText(label.text, Math.round(x), Math.round(y));
  }
}
