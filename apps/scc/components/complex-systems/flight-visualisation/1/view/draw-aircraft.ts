/**
 * View::drawPlanes and AircraftLabel::draw.
 *
 * Lifecycle of one aircraft on screen:
 *  - first 500 ms after its first position: eight points contract onto it;
 *  - active: icon on its track, sliding from the previous fix over 500 ms while a
 *    grey ring expands from the new one; colour greys out as messages stop, and after
 *    half of DISPLAY_ACTIVE an arc counts down the remaining time;
 *  - last 500 ms: a shrinking grey ring, then only the fading trail remains.
 * Aircraft beyond the screen edge are drawn as a double chevron on the edge.
 */

import { DISPLAY_ACTIVE, lerp, lerpAngle, lerpColor, rgba, STYLE, type Rgb } from "../config";
import { AircraftLabel } from "../model/aircraft-label";
import type { Aircraft } from "../model/aircraft";
import type { Camera } from "./camera";
import type { Typography } from "./typography";

const ACTIVE_MS = DISPLAY_ACTIVE * 1000;
const DEG = Math.PI / 180;

export type AircraftFrame = {
  context: CanvasRenderingContext2D;
  camera: Camera;
  typography: Typography;
  now: number;
  ui: number;
  metric: boolean;
  selected: Aircraft | null;
  /** Fraction of the current physics tick elapsed, for label interpolation. */
  alpha: number;
};

function triangle(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.lineTo(x3, y3);
  context.closePath();
}

/** View::drawPlaneIcon: fuselage, wings and tailplane as four triangles. */
function drawPlaneIcon(context: CanvasRenderingContext2D, x: number, y: number, heading: number, colour: Rgb, ui: number) {
  const body = 8 * ui;
  const wing = 6 * ui;
  const tail = 3 * ui;
  const bodyWidth = ui;
  const vx = Math.sin(heading * DEG);
  const vy = -Math.cos(heading * DEG);
  const ox = vy;
  const oy = -vx;

  context.fillStyle = rgba(colour);
  context.beginPath();
  triangle(context, x - bodyWidth * ox, y - bodyWidth * oy, x + bodyWidth * ox, y + bodyWidth * oy, x - body * vx, y - body * vy);
  triangle(context, x - bodyWidth * ox, y - bodyWidth * oy, x + bodyWidth * ox, y + bodyWidth * oy, x + body * vx, y + body * vy);
  triangle(context, x - wing * ox, y - wing * oy, x + wing * ox, y + wing * oy, x + body * 0.5 * vx, y + body * 0.5 * vy);
  triangle(
    context,
    x - body * 0.75 * vx - tail * ox,
    y - body * 0.75 * vy - tail * oy,
    x - body * 0.75 * vx + tail * ox,
    y - body * 0.75 * vy + tail * oy,
    x - body * 0.35 * vx,
    y - body * 0.35 * vy,
  );
  context.fill();
}

/** View::drawPlaneOffMap: two chevrons where the bearing to the aircraft meets the edge. */
function drawPlaneOffMap(context: CanvasRenderingContext2D, camera: Camera, x: number, y: number, colour: Rgb, ui: number, out: number[]) {
  const arrow = 6 * ui;
  const cx = camera.width / 2;
  const cy = camera.height / 2;
  const inx = x - cx;
  const iny = y - cy;
  let edgeX: number;
  let edgeY: number;
  if (Math.abs(inx) > (Math.abs(iny) * cx) / cy) {
    edgeX = cx * Math.sign(inx);
    edgeY = (edgeX * iny) / inx;
  } else {
    edgeY = cy * Math.sign(iny);
    edgeX = (edgeY * inx) / iny;
  }
  const magnitude = Math.hypot(inx, iny) || 1;
  const vx = inx / magnitude;
  const vy = iny / magnitude;
  const ox = vy;
  const oy = -vx;
  const baseX = cx + edgeX;
  const baseY = cy + edgeY;

  context.fillStyle = rgba(colour);
  context.beginPath();
  triangle(
    context,
    baseX - 2 * arrow * vx - arrow * ox,
    baseY - 2 * arrow * vy - arrow * oy,
    baseX - 2 * arrow * vx + arrow * ox,
    baseY - 2 * arrow * vy + arrow * oy,
    baseX - arrow * vx,
    baseY - arrow * vy,
  );
  triangle(
    context,
    baseX - 3 * arrow * vx - arrow * ox,
    baseY - 3 * arrow * vy - arrow * oy,
    baseX - 3 * arrow * vx + arrow * ox,
    baseY - 3 * arrow * vy + arrow * oy,
    baseX - 2 * arrow * vx,
    baseY - 2 * arrow * vy,
  );
  context.fill();
  out[0] = baseX - 2 * arrow * vx;
  out[1] = baseY - 2 * arrow * vy;
}

function drawLabel(frame: AircraftFrame, p: Aircraft, label: AircraftLabel) {
  const { context, typography, ui, alpha } = frame;
  const selected = p === frame.selected;
  const x = Math.round(label.previousX + (label.x - label.previousX) * alpha);
  const y = Math.round(label.previousY + (label.y - label.previousY) * alpha);
  if (x === 0 || y === 0 || label.opacity <= 0) return;

  const w = label.w;
  const h = label.h;
  const margin = 4 * ui;
  const tick = 4 * ui;

  if (w > 0 && h > 0) {
    const anchorX = x + w / 2 > p.x ? x : x + w;
    const anchorY = y + h / 2 > p.y ? y - margin : y + h + margin;
    let exitX: number;
    let exitY: number;
    if (Math.abs(anchorX - p.x) > Math.abs(anchorY - p.y)) {
      exitX = (anchorX + p.x) / 2;
      exitY = anchorY;
    } else {
      exitX = anchorX;
      exitY = (anchorY + p.y) / 2;
    }

    context.fillStyle = rgba(STYLE.labelBackground, label.opacity);
    context.fillRect(x, y, w, h);

    context.strokeStyle = selected ? rgba(STYLE.selected) : rgba(STYLE.labelLine, label.opacity);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.quadraticCurveTo(exitX, exitY, anchorX, anchorY);
    const top = y - margin + 0.5;
    const bottom = y + h + margin - 0.5;
    const left = x + 0.5;
    const right = x + w - 0.5;
    context.moveTo(left, top + tick);
    context.lineTo(left, top);
    context.lineTo(right, top);
    context.lineTo(right, top + tick);
    context.moveTo(left, bottom - tick);
    context.lineTo(left, bottom);
    context.lineTo(right, bottom);
    context.lineTo(right, bottom - tick);
    context.stroke();
  }

  context.font = typography.regular;
  context.textBaseline = "top";
  let line = 0;
  if (label.level < 2 || selected) {
    context.fillStyle = rgba(STYLE.label, label.opacity);
    context.fillText(label.flightText, x, y);
    line++;
  }
  if (label.level < 1 || selected) {
    context.fillStyle = rgba(STYLE.subLabel, label.opacity);
    context.fillText(label.altitudeText, x, y + line * typography.lineHeight);
    context.fillText(label.speedText, x, y + (line + 1) * typography.lineHeight);
  }
}

export function drawPlanes(frame: AircraftFrame, aircraft: Aircraft[]) {
  const { context, camera, now, ui } = frame;
  const width = camera.width;
  const height = camera.height;
  const point = [0, 0];
  const previous = [0, 0];

  for (const p of aircraft) {
    p.drawn = false;
    if (!p.hasPosition) continue;

    camera.project(p.lon, p.lat, point);
    const x = point[0];
    const y = point[1];
    p.projectedX = x;
    p.projectedY = y;
    p.projectedCamera = camera.version;
    const age = now - p.created;
    const silence = now - p.seen;

    if (age < 500) {
      const ratio = age / 500;
      const radius = (1 - ratio * ratio) * (width / 8);
      context.fillStyle = rgba(STYLE.plane, ratio);
      for (let theta = 0; theta < 2 * Math.PI - 1e-6; theta += Math.PI / 4) {
        context.fillRect(Math.round(x + radius * Math.cos(theta)), Math.round(y + radius * Math.sin(theta)), ui, ui);
      }
      p.x = x;
      p.y = y;
      continue;
    }

    if (ACTIVE_MS - silence > 500) {
      let colour = lerpColor(STYLE.plane, STYLE.planeGone, silence / ACTIVE_MS);
      if (silence > ACTIVE_MS / 2) {
        context.strokeStyle = rgba(colour);
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, 8 * ui, 0, 2 * Math.PI * 2 * (silence / ACTIVE_MS - 0.5));
        context.stroke();
      }
      if (p === frame.selected) colour = STYLE.selected;

      p.x = x;
      p.y = y;
      if (x < 0 || x >= width || y < 0 || y >= height) {
        drawPlaneOffMap(context, camera, x, y, colour, ui, point);
        p.x = point[0];
        p.y = point[1];
      } else {
        let useX = x;
        let useY = y;
        let heading = p.track;
        const sincePosition = now - p.seenLatLon;
        if (sincePosition < 500) {
          const t = sincePosition / 500;
          context.strokeStyle = rgba(STYLE.planeGone, 1 - t);
          context.lineWidth = 1;
          context.beginPath();
          context.arc(x, y, (sincePosition * width) / 8192, 0, Math.PI * 2);
          context.stroke();
          camera.project(p.lastLon, p.lastLat, previous);
          useX = lerp(previous[0], x, t);
          useY = lerp(previous[1], y, t);
          heading = lerpAngle(p.lastHeading, p.track, t);
        }
        drawPlaneIcon(context, useX, useY, heading, colour, ui);
      }

      if (!p.label) p.label = new AircraftLabel(p, now, ui);
      p.label.updateText(p, frame.metric);
      p.drawn = true;
      drawLabel(frame, p, p.label);
    } else if (ACTIVE_MS - silence > 0) {
      context.strokeStyle = rgba(STYLE.planeGone);
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, (8 * ui * (ACTIVE_MS - silence)) / 500, 0, Math.PI * 2);
      context.stroke();
    }
  }
}
