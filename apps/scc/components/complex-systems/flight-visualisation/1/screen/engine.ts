/**
 * The viz1090 main loop for one canvas: receive → input → View::draw.
 *
 * Rendering runs at the display's refresh rate; everything viz1090 advanced once per
 * ~30 ms frame (camera easing, the eight label-relaxation passes, label fades) runs
 * on a fixed 30 Hz tick so its dynamics match the original regardless of refresh
 * rate, with labels interpolated between ticks.
 */

import {
  LABEL_ITERATIONS,
  TICK_MS,
  type FlightVisualisationOptions,
} from "../config";
import { attachControls } from "../input/controls";
import { GeographyLayer } from "../map/geography-layer";
import { MapStore } from "../map/tiles";
import { relaxLabels } from "../model/aircraft-label";
import { AircraftList, type Aircraft, type ReceiverMessage } from "../model/aircraft";
import { LiveReceiver } from "../transport/live-receiver";
import { SimulatedReceiver } from "../transport/simulated-receiver";
import type { Receiver } from "../transport/types";
import { Camera } from "../view/camera";
import { drawPlanes } from "../view/draw-aircraft";
import { drawClick, drawScaleBars, drawStatus, type ClickState } from "../view/draw-hud";
import { drawTrails } from "../view/draw-trails";
import { loadFonts, Typography } from "../view/typography";

const MAX_CATCH_UP_MS = 250;
const PRUNE_MS = 1000;
const STATUS_MS = 250;
const SELECT_RADIUS = 30;

export function startFlightVisualisation(canvas: HTMLCanvasElement, options: FlightVisualisationOptions) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return () => {};

  const camera = new Camera(options.lat, options.lon, options.maxDist);
  const typography = new Typography();
  const store = new MapStore();
  const geography = new GeographyLayer();
  const aircraft = new AircraftList();
  const receiver: Receiver =
    options.feed === "sim"
      ? new SimulatedReceiver(options.lat, options.lon, () => store.airportNames)
      : new LiveReceiver();

  let dpr = 1;
  let ui = 1;
  let selected: Aircraft | null = null;
  let following = false;
  const click: ClickState = { x: 0, y: 0, time: -Infinity, visible: false };
  const inbox: ReceiverMessage[] = [];

  let frame = 0;
  let lastFrame = performance.now();
  let accumulator = 0;
  let lastPrune = 0;
  let lastStatus = -Infinity;
  let status = aircraft.status(lastFrame);
  let areaVersion = -1;
  let fps = 0;
  let disposed = false;

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    camera.resize(width, height);
    geography.resize(width, height, dpr);
    ui = options.uiScale || Math.max(1, Math.round(Math.min(width, height) / 1000));
    typography.configure(context, ui);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  void loadFonts().then(() => {
    if (!disposed) typography.configure(context, ui);
  });

  // Labels ride along with their aircraft whenever the camera moves (drag, zoom,
  // follow, double tap); the force model then only resolves conflicts. viz1090 did
  // this for drags alone, which left labels stranded across the screen after zooms.
  const point = [0, 0];
  const carryLabels = () => {
    for (const p of aircraft.list) {
      if (!p.label || !p.drawn || p.projectedCamera === camera.version) continue;
      camera.project(p.lon, p.lat, point);
      // The label's anchor is the icon, or the edge chevron for off-screen aircraft;
      // clamping approximates the chevron well enough for the spring to finish.
      const x = Math.min(camera.width - 1, Math.max(0, point[0]));
      const y = Math.min(camera.height - 1, Math.max(0, point[1]));
      p.label.move(x - p.x, y - p.y);
      p.x = x;
      p.y = y;
      p.projectedX = point[0];
      p.projectedY = point[1];
      p.projectedCamera = camera.version;
    }
  };

  const detachControls = attachControls(canvas, {
    pan(dx, dy) {
      following = false;
      camera.moveRelative(dx, dy);
    },
    zoomBy(factor) {
      camera.zoomBy(factor);
    },
    tap(x, y, count) {
      const now = performance.now();
      if (count === 1) {
        // View::registerClick: nearest drawn aircraft within 30px, or nothing.
        let best: Aircraft | null = null;
        let bestDistance = (SELECT_RADIUS * ui) ** 2;
        for (const p of aircraft.list) {
          if (!p.drawn) continue;
          const distance = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (distance < bestDistance) {
            best = p;
            bestDistance = distance;
          }
        }
        selected = best;
        following = best !== null;
      } else if (count === 2) {
        if (selected && following) camera.animateZoom(0.25);
        else camera.animateToScreenPoint(x, y);
      }
      click.x = x;
      click.y = y;
      click.time = now;
      click.visible = true;
    },
    deselect() {
      selected = null;
      following = false;
    },
  });


  const onVisibility = () => receiver.setActive(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", onVisibility);

  const tick = (now: number) => {
    if (selected && following) camera.follow(selected.lon, selected.lat);
    camera.step();
    carryLabels();

    const entries: { p: Aircraft; label: NonNullable<Aircraft["label"]> }[] = [];
    for (const p of aircraft.list) {
      if (!p.drawn || !p.label) continue;
      p.label.previousX = p.label.x;
      p.label.previousY = p.label.y;
      entries.push({ p, label: p.label });
    }
    for (let i = 0; i < LABEL_ITERATIONS; i++) {
      relaxLabels(entries, camera.width, camera.height, now, typography);
    }
    for (const { p, label } of entries) label.ease(p === selected, typography);
  };

  const render = (now: number) => {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    geography.update(camera, store, typography, now);
    geography.draw(context, camera);
    drawTrails(context, aircraft.list, camera, now, ui);
    drawScaleBars(context, camera, typography, options.metric);
    if (receiver.state.connected) {
      drawPlanes(
        {
          context,
          camera,
          typography,
          now,
          ui,
          metric: options.metric,
          selected,
          alpha: accumulator / TICK_MS,
        },
        aircraft.list,
      );
    }
    drawStatus(context, {
      camera,
      typography,
      connected: receiver.state.connected,
      source: receiver.state.source,
      status,
      mapLoaded: store.failed ? 100 : geography.loaded,
      fps: options.fps ? fps : null,
    });
    drawClick(context, click, selected, now, ui);
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const delta = Math.min(MAX_CATCH_UP_MS, now - lastFrame);
    lastFrame = now;
    if (delta > 0) fps += 0.1 * (1000 / delta - fps);

    if (camera.version !== areaVersion) {
      areaVersion = camera.version;
      const halfDiagonalKm = (camera.maxDist * Math.hypot(camera.width, camera.height)) / Math.max(camera.width, camera.height);
      receiver.setArea(camera.centerLat, camera.centerLon, (halfDiagonalKm * 1.1) / 1.852);
    }

    carryLabels();
    receiver.drain(now, inbox);
    for (const message of inbox) aircraft.apply(message, now);
    inbox.length = 0;

    if (now - lastPrune > PRUNE_MS) {
      lastPrune = now;
      aircraft.prune(now, (p) => {
        if (p === selected) {
          selected = null;
          following = false;
        }
      });
    }
    if (now - lastStatus > STATUS_MS) {
      lastStatus = now;
      status = aircraft.status(now);
    }

    // Never replay more than a few ticks at once; a slow frame drops simulated time
    // rather than stalling the next one.
    accumulator = Math.min(accumulator + delta, 3 * TICK_MS);
    while (accumulator >= TICK_MS) {
      tick(now - accumulator + TICK_MS);
      accumulator -= TICK_MS;
    }

    render(now);
  };
  frame = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    detachControls();
    document.removeEventListener("visibilitychange", onVisibility);
    receiver.dispose();
    store.dispose();
  };
}
