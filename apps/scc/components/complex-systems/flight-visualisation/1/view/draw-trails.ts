/**
 * View::drawTrails. Each segment is coloured by its position along the history (red
 * oldest → amber newest, alpha rising over the older half) and by how long ago the
 * aircraft was heard (towards grey over DISPLAY_ACTIVE, then to black). Segments are
 * batched into quantised colour buckets so a frame costs one stroke per bucket.
 */

import { DISPLAY_ACTIVE, lerpColor, rgba, STYLE } from "../config";
import type { Aircraft } from "../model/aircraft";
import type { Camera } from "./camera";

const AGE_STEPS = 16;
const FADE_STEPS = 32;
const MIN_STEP_PX = 1;

const colourCache = new Map<number, string>();

function bucketColour(key: number) {
  let colour = colourCache.get(key);
  if (colour) return colour;
  const ageStep = key % AGE_STEPS;
  const fadeStep = Math.floor(key / AGE_STEPS);
  const age = (ageStep + 0.5) / AGE_STEPS;
  const silence = ((fadeStep + 0.5) / FADE_STEPS) * 2 * DISPLAY_ACTIVE;
  let rgb = lerpColor(STYLE.trailOld, STYLE.trailNew, age);
  rgb = lerpColor(rgb, STYLE.planeGone, silence / DISPLAY_ACTIVE);
  rgb = lerpColor(rgb, STYLE.black, -1 + silence / DISPLAY_ACTIVE);
  colour = rgba(rgb, Math.min(1, 2 * age));
  colourCache.set(key, colour);
  return colour;
}

export function drawTrails(context: CanvasRenderingContext2D, aircraft: Aircraft[], camera: Camera, now: number, ui: number) {
  const paths = new Map<number, Path2D>();
  const width = camera.width;
  const height = camera.height;
  const point = [0, 0];
  const ends: { x: number; y: number; silence: number }[] = [];

  for (const p of aircraft) {
    const size = p.lonHistory.length;
    if (size < 2) continue;
    const silence = (now - p.seen) / 1000;
    const fadeStep = Math.min(FADE_STEPS - 1, Math.floor((silence / (2 * DISPLAY_ACTIVE)) * FADE_STEPS));

    camera.project(p.lonHistory[0], p.latHistory[0], point);
    let previousX = point[0];
    let previousY = point[1];
    let path: Path2D | null = null;
    let pathKey = -1;
    let penX = NaN;
    let penY = NaN;

    for (let i = 1; i < size; i++) {
      camera.project(p.lonHistory[i], p.latHistory[i], point);
      const x = point[0];
      const y = point[1];
      const last = i === size - 1;
      if (!last && Math.abs(x - previousX) + Math.abs(y - previousY) < MIN_STEP_PX) continue;

      const offscreen =
        (previousX < 0 && x < 0) ||
        (previousY < 0 && y < 0) ||
        (previousX > width && x > width) ||
        (previousY > height && y > height);
      if (!offscreen) {
        const key = fadeStep * AGE_STEPS + Math.min(AGE_STEPS - 1, Math.floor(((i - 1) / size) * AGE_STEPS));
        if (key !== pathKey || penX !== previousX || penY !== previousY) {
          path = paths.get(key) ?? null;
          if (!path) {
            path = new Path2D();
            paths.set(key, path);
          }
          pathKey = key;
          path.moveTo(previousX, previousY);
        }
        path!.lineTo(x, y);
        penX = x;
        penY = y;
      }
      previousX = x;
      previousY = y;
    }

    if (silence > DISPLAY_ACTIVE) ends.push({ x: previousX, y: previousY, silence });
  }

  context.lineWidth = 1;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [key, path] of paths) {
    context.strokeStyle = bucketColour(key);
    context.stroke(path);
  }

  // A small ring marks where a silent aircraft was last heard.
  for (const end of ends) {
    context.strokeStyle = rgba(lerpColor(STYLE.planeGone, STYLE.black, -1 + end.silence / DISPLAY_ACTIVE));
    context.beginPath();
    context.arc(end.x, end.y, 5 * ui, 0, Math.PI * 2);
    context.stroke();
  }
}
