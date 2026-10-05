"use client";

import { useEffect, useRef } from "react";
import styles from "./clock-grid.module.css";
import {
  HOUR_HAND_LENGTH,
  MINUTE_HAND_LENGTH,
  aimMinutes,
  applyStroke,
  clockCenter,
  createClockGrid,
  handAngles,
  localClockSeconds,
  resizeClockGrid,
  stepClockGrid,
  type ClockGrid,
  type Point,
} from "./model";

const MAXIMUM_PIXEL_RATIO = 1.5;
const IDLE_REDRAW_MS = 1000;
const FACE_OPACITY = 0.72;
const HAND_OPACITY = 0.96;
const RIM = "#e7dfd2";
const HOUR = "#d2a64c";
const MINUTE = "#f0eadf";

function sizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ratio: number,
) {
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawFaces(context: CanvasRenderingContext2D, grid: ClockGrid) {
  const { radius } = grid;
  const count = grid.columns * grid.rows;
  const rimWidth = Math.max(0.55, Math.min(1.35, radius * 0.008));
  context.clearRect(0, 0, grid.width, grid.height);
  context.save();
  context.strokeStyle = RIM;
  context.lineCap = "butt";

  for (const major of [true, false]) {
    context.globalAlpha = major ? FACE_OPACITY : FACE_OPACITY * 0.72;
    context.lineWidth = major ? rimWidth : Math.max(0.45, rimWidth * 0.7);
    const tickLength = radius * (major ? 0.1 : 0.06);
    context.beginPath();
    for (let index = 0; index < count; index += 1) {
      const center = clockCenter(grid, index);
      if (major) {
        context.moveTo(center.x + radius, center.y);
        context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      }
      for (let tick = major ? 0 : 1; tick < 12; tick += major ? 3 : 1) {
        if (!major && tick % 3 === 0) continue;
        const angle = (Math.PI * 2 * tick) / 12;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        context.moveTo(center.x + cos * (radius - tickLength), center.y + sin * (radius - tickLength));
        context.lineTo(center.x + cos * (radius - rimWidth), center.y + sin * (radius - rimWidth));
      }
    }
    context.stroke();
  }
  context.restore();
}

function drawHands(
  context: CanvasRenderingContext2D,
  grid: ClockGrid,
  realSeconds: number,
) {
  const { radius } = grid;
  const count = grid.columns * grid.rows;
  const hourLength = radius * HOUR_HAND_LENGTH;
  const minuteLength = radius * MINUTE_HAND_LENGTH;
  context.clearRect(0, 0, grid.width, grid.height);
  context.save();
  context.globalAlpha = HAND_OPACITY;
  context.lineCap = "round";

  const hours = new Path2D();
  const minutes = new Path2D();
  for (let index = 0; index < count; index += 1) {
    const center = clockCenter(grid, index);
    const { hour, minute } = handAngles(realSeconds + grid.offset[index]!);
    hours.moveTo(center.x, center.y);
    hours.lineTo(center.x + Math.cos(hour) * hourLength, center.y + Math.sin(hour) * hourLength);
    minutes.moveTo(center.x, center.y);
    minutes.lineTo(center.x + Math.cos(minute) * minuteLength, center.y + Math.sin(minute) * minuteLength);
  }
  context.strokeStyle = HOUR;
  context.lineWidth = Math.max(1.2, radius * 0.052);
  context.stroke(hours);
  context.strokeStyle = MINUTE;
  context.lineWidth = Math.max(0.8, radius * 0.035);
  context.stroke(minutes);

  const dot = Math.max(1.1, Math.min(2.8, radius * 0.05));
  context.fillStyle = MINUTE;
  context.beginPath();
  for (let index = 0; index < count; index += 1) {
    const center = clockCenter(grid, index);
    context.moveTo(center.x + dot, center.y);
    context.arc(center.x, center.y, dot, 0, Math.PI * 2);
  }
  context.fill();
  context.restore();
}

export default function FingerSkatingClockGrid() {
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const faceCanvas = faceCanvasRef.current;
    const canvas = canvasRef.current;
    if (!faceCanvas || !canvas) return;
    const faceContext = faceCanvas.getContext("2d");
    const context = canvas.getContext("2d");
    if (!faceContext || !context) return;

    const pointers = new Map<number, Point>();
    let grid: ClockGrid | null = null;
    let frame: number | null = null;
    let idleTimer: number | null = null;
    let lastFrame = 0;
    const realSeconds = () => localClockSeconds(new Date());

    const render = (now: number) => {
      frame = null;
      if (!grid) return;
      const real = realSeconds();
      if (pointers.size > 0) aimMinutes(grid, [...pointers.values()], real);
      const moving = stepClockGrid(grid, lastFrame ? (now - lastFrame) / 1000 : 1 / 60);
      drawHands(context, grid, real);
      if (moving || pointers.size > 0) {
        lastFrame = now;
        frame = window.requestAnimationFrame(render);
      } else {
        lastFrame = 0;
        idleTimer = window.setTimeout(schedule, IDLE_REDRAW_MS);
      }
    };
    const schedule = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (frame === null) frame = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, MAXIMUM_PIXEL_RATIO);
      sizeCanvas(faceCanvas, faceContext, width, height, ratio);
      sizeCanvas(canvas, context, width, height, ratio);
      grid = grid ? resizeClockGrid(grid, width, height) : createClockGrid(width, height);
      drawFaces(faceContext, grid);
      pointers.clear();
      schedule();
    };
    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const onDown = (event: PointerEvent) => {
      if (!grid || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, point(event, canvas.getBoundingClientRect()));
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous || !grid) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      const real = realSeconds();
      let from = previous;
      for (const sample of [...samples, event]) {
        const to = point(sample, bounds);
        if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue;
        applyStroke(grid, from, to, real);
        from = to;
      }
      pointers.set(event.pointerId, from);
      schedule();
    };
    const onUp = (event: PointerEvent) => {
      onMove(event);
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onCancel = (event: PointerEvent) => pointers.delete(event.pointerId);
    const onBlur = () => pointers.clear();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("blur", onBlur);
    resize();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel);
      window.removeEventListener("blur", onBlur);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={faceCanvasRef} className={styles.faces} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Drag across the clocks: hour hands keep the direction you left each clock, minute hands follow your finger"
      />
    </main>
  );
}
