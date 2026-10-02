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
  updateChildCenters,
  type ClockGrid,
  type Point,
} from "./model";

const MAXIMUM_PIXEL_RATIO = 2;
const IDLE_REDRAW_MS = 1000;
const RIM = "#e7dfd2";
const HOUR = "#d2a64c";
const MINUTE = "#f0eadf";

/** clock/1's per-generation fade: depth 0 parents, depth 1 children. */
const faceOpacity = (depth: number) => Math.max(0.22, 0.72 - depth * 0.1);
const handOpacity = (depth: number) => Math.max(0.32, 0.96 - depth * 0.1);

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

/** clock/1's face: rim, longer quarter ticks, fainter hour ticks. */
function drawFaces(
  context: CanvasRenderingContext2D,
  centers: readonly Point[],
  radius: number,
  depth: number,
) {
  const opacity = faceOpacity(depth);
  const rimWidth = Math.max(0.55, Math.min(1.35, radius * 0.008));
  context.save();
  context.strokeStyle = RIM;
  context.lineCap = "butt";
  for (const major of [true, false]) {
    context.globalAlpha = major ? opacity : opacity * 0.72;
    context.lineWidth = major ? rimWidth : Math.max(0.45, rimWidth * 0.7);
    const tickLength = radius * (major ? 0.1 : 0.06);
    context.beginPath();
    for (const center of centers) {
      if (major) {
        context.moveTo(center.x + radius, center.y);
        context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      }
      for (let tick = 0; tick < 12; tick += 1) {
        if ((tick % 3 === 0) !== major) continue;
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
  centers: readonly Point[],
  offsets: Float64Array,
  realSeconds: number,
  radius: number,
  depth: number,
  widths: { hour: number; minute: number; dot: number },
) {
  const hourLength = radius * HOUR_HAND_LENGTH;
  const minuteLength = radius * MINUTE_HAND_LENGTH;
  const hours = new Path2D();
  const minutes = new Path2D();
  const dots = new Path2D();
  centers.forEach((center, index) => {
    const { hour, minute } = handAngles(realSeconds + offsets[index]!);
    hours.moveTo(center.x, center.y);
    hours.lineTo(center.x + Math.cos(hour) * hourLength, center.y + Math.sin(hour) * hourLength);
    minutes.moveTo(center.x, center.y);
    minutes.lineTo(center.x + Math.cos(minute) * minuteLength, center.y + Math.sin(minute) * minuteLength);
    dots.moveTo(center.x + widths.dot, center.y);
    dots.arc(center.x, center.y, widths.dot, 0, Math.PI * 2);
  });
  context.save();
  context.globalAlpha = handOpacity(depth);
  context.lineCap = "round";
  context.strokeStyle = HOUR;
  context.lineWidth = widths.hour;
  context.stroke(hours);
  context.strokeStyle = MINUTE;
  context.lineWidth = widths.minute;
  context.stroke(minutes);
  context.fillStyle = MINUTE;
  context.fill(dots);
  context.restore();
}

function parentCenters(grid: ClockGrid) {
  return Array.from({ length: grid.columns * grid.rows }, (_, index) => clockCenter(grid, index));
}

function drawFrame(
  context: CanvasRenderingContext2D,
  grid: ClockGrid,
  parents: readonly Point[],
  realSeconds: number,
) {
  const children = Array.from(grid.childX, (x, index) => ({ x, y: grid.childY[index]! }));
  const { radius, childRadius } = grid;
  context.clearRect(0, 0, grid.width, grid.height);
  drawFaces(context, children, childRadius, 1);
  drawHands(context, parents, grid.parents.offset, realSeconds, radius, 0, {
    hour: Math.max(0.55, Math.min(3.4, radius * 0.035)),
    minute: Math.max(0.55, Math.min(3.4, radius * 0.023)),
    dot: Math.max(0.8, Math.min(2.8, radius * 0.02)),
  });
  drawHands(context, children, grid.children.offset, realSeconds, childRadius, 1, {
    hour: Math.max(1.2, childRadius * 0.052),
    minute: Math.max(0.8, childRadius * 0.035),
    dot: Math.max(1.1, Math.min(2.8, childRadius * 0.05)),
  });
}

export default function FractalSkatingClockGrid() {
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
    let parents: Point[] = [];
    let frame: number | null = null;
    let idleTimer: number | null = null;
    let lastFrame = 0;
    const realSeconds = () => localClockSeconds(new Date());

    const render = (now: number) => {
      frame = null;
      if (!grid) return;
      const real = realSeconds();
      updateChildCenters(grid, real);
      if (pointers.size > 0) aimMinutes(grid, [...pointers.values()], real);
      const moving = stepClockGrid(grid, lastFrame ? (now - lastFrame) / 1000 : 1 / 60);
      updateChildCenters(grid, real);
      drawFrame(context, grid, parents, real);
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
      const real = realSeconds();
      sizeCanvas(faceCanvas, faceContext, width, height, ratio);
      sizeCanvas(canvas, context, width, height, ratio);
      grid = grid ? resizeClockGrid(grid, width, height, real) : createClockGrid(width, height);
      updateChildCenters(grid, real);
      parents = parentCenters(grid);
      faceContext.clearRect(0, 0, width, height);
      drawFaces(faceContext, parents, grid.radius, 0);
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
        aria-label="Drag across the clocks and the clocks they carry: hour hands keep the direction you left each clock, minute hands follow your finger"
      />
    </main>
  );
}
