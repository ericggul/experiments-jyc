/**
 * Screen furniture from View.cpp: logarithmic scale bars (drawScaleBars), the status
 * row of label/value boxes (drawStatusBox / drawStatus), the tap ripple and the
 * spring-in selection brackets (drawClick).
 */

import { PAD, ROUND_RADIUS, rgba, STYLE, type Rgb } from "../config";
import type { Aircraft, ReceiverStatus } from "../model/aircraft";
import type { Camera } from "./camera";
import type { Typography } from "./typography";

const KM_PER_MILE = 1.609344;

export function drawScaleBars(context: CanvasRenderingContext2D, camera: Camera, typography: Typography, metric: boolean) {
  const ui = typography.ui;
  const unit = metric ? 1 : KM_PER_MILE;
  const suffix = metric ? "km" : "mi";
  const origin = 10;
  const minimumSpacing = typography.charWidth * 6;

  let power = -2;
  while (power < 5 && 10 ** power * unit * camera.scale < minimumSpacing) power++;

  context.strokeStyle = rgba(STYLE.scaleBar);
  context.fillStyle = rgba(STYLE.scaleBar);
  context.lineWidth = 1;
  context.font = typography.regular;
  context.textBaseline = "top";

  context.beginPath();
  context.moveTo(origin + 0.5, 8);
  context.lineTo(origin + 0.5, 16 * ui);
  let lastDistance = 0;
  for (; ; power++) {
    const distance = Math.round(10 ** power * unit * camera.scale);
    if (distance >= camera.width - origin) break;
    context.moveTo(origin + distance + 0.5, 8);
    context.lineTo(origin + distance + 0.5, 16 * ui);
    const value = 10 ** power;
    context.fillText(`${power < 0 ? value.toFixed(-power) : value}${suffix}`, origin + distance, 15 * ui);
    lastDistance = distance;
  }
  const lineY = Math.round(10 + 5 * ui) + 0.5;
  context.moveTo(origin, lineY);
  context.lineTo(origin + lastDistance, lineY);
  context.stroke();
}

type Cursor = { left: number; top: number };

function drawStatusBox(context: CanvasRenderingContext2D, typography: Typography, width: number, cursor: Cursor, label: string, message: string, colour: Rgb) {
  const charWidth = typography.boldCharWidth;
  const height = typography.lineHeight;
  const labelWidth = (label.length + (label.length > 0 ? 1 : 0)) * charWidth;
  const messageWidth = (message.length + (message.length > 0 ? 1 : 0)) * charWidth;

  if (cursor.left + labelWidth + messageWidth + PAD > width) {
    cursor.left = PAD;
    cursor.top -= height + PAD;
  }
  const { left, top } = cursor;
  const radius = ROUND_RADIUS * typography.ui;

  if (messageWidth) {
    context.fillStyle = rgba(STYLE.buttonBackground);
    context.beginPath();
    context.roundRect(left, top, labelWidth + messageWidth, height, radius);
    context.fill();
  }
  if (labelWidth) {
    context.fillStyle = rgba(colour);
    context.beginPath();
    context.roundRect(left, top, labelWidth, height, radius);
    context.fill();
  }
  if (messageWidth) {
    context.strokeStyle = rgba(colour);
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(left + 0.5, top + 0.5, labelWidth + messageWidth - 1, height - 1, radius);
    context.stroke();
  }

  context.font = typography.bold;
  context.textBaseline = "top";
  context.fillStyle = rgba(STYLE.buttonBackground);
  context.fillText(label, left + charWidth / 2, top);
  context.fillStyle = rgba(colour);
  context.fillText(message, left + labelWidth + charWidth / 2, top);

  cursor.left = left + labelWidth + messageWidth + PAD;
}

export type StatusFrame = {
  camera: Camera;
  typography: Typography;
  connected: boolean;
  source: string;
  status: ReceiverStatus;
  mapLoaded: number;
  fps: number | null;
};

export function drawStatus(context: CanvasRenderingContext2D, frame: StatusFrame) {
  const { camera, typography, status } = frame;
  const cursor = { left: PAD, top: camera.height - typography.lineHeight - PAD };
  const box = (label: string, message: string, colour: Rgb) =>
    drawStatusBox(context, typography, camera.width, cursor, label, message, colour);

  if (frame.fps !== null) box("fps", frame.fps.toFixed(1), STYLE.fps);

  if (!frame.connected) {
    box("init", "connecting", STYLE.warning);
  } else {
    const lat = camera.centerLat;
    const lon = camera.centerLon;
    box("loc", `${Math.abs(lat).toFixed(3)}${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(3)}${lon >= 0 ? "E" : "W"}`, STYLE.button);
    box("disp", `${status.visible}/${status.total}`, STYLE.button);
    box("rate", `${status.messageRate.toFixed(0)}/s`, STYLE.button);
    if (status.signal >= 0) box("sAvg", `${(100 * status.signal).toFixed(0)}%`, STYLE.button);
    box("feed", frame.source, STYLE.button);
  }

  if (frame.mapLoaded < 100) box("init", `loading map ${frame.mapLoaded}%`, STYLE.loading);
}

export type ClickState = { x: number; y: number; time: number; visible: boolean };

export function drawClick(context: CanvasRenderingContext2D, click: ClickState, selected: Aircraft | null, now: number, ui: number) {
  const elapsed = now - click.time;
  if (click.visible) {
    const alpha = 128 - 0.5 * elapsed;
    if (alpha <= 0) {
      click.visible = false;
    } else {
      context.fillStyle = rgba(STYLE.click, alpha / 255);
      context.beginPath();
      context.arc(click.x, click.y, 0.25 * elapsed, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (!selected || !selected.drawn) return;
  const size =
    (elapsed < 300 ? 20 * (1 - (1 - elapsed / 300) * Math.cos(Math.sqrt(elapsed))) : 20) * ui;
  const half = size / 2;
  const x = Math.round(selected.x) + 0.5;
  const y = Math.round(selected.y) + 0.5;

  context.strokeStyle = rgba(STYLE.selected);
  context.lineWidth = 1;
  context.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cornerX = x + sx * size;
    const cornerY = y + sy * size;
    context.moveTo(cornerX - sx * half, cornerY);
    context.lineTo(cornerX, cornerY);
    context.lineTo(cornerX, cornerY - sy * half);
  }
  context.stroke();
}
