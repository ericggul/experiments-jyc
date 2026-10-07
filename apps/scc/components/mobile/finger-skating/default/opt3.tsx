"use client";

import { useEffect, useRef } from "react";
import {
  beginStroke,
  continueStroke,
  createVortexField,
  resizeVortexField,
  sampleVelocity,
  stepVortexField,
  type Point,
  type StrokeState,
  type VortexField,
} from "./model/vortex";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
// Autonomous evolution after release stays within the repository's 24 Hz budget.
const autonomousInterval = 1000 / 24;

// Arrow length grows with local fluid speed and saturates; a fluid point at rest is a dot.
function drawVector(context: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, spacing: number) {
  const speed = Math.hypot(vx, vy);
  if (speed < 2) {
    context.moveTo(x + 0.9, y);
    context.arc(x, y, 0.9, 0, Math.PI * 2);
    return;
  }
  const ux = vx / speed;
  const uy = vy / speed;
  const halfLength = spacing * (0.08 + 0.34 * (1 - Math.exp(-speed / 180)));
  const headLength = Math.min(spacing * 0.17, halfLength * 0.8);
  const headWidth = headLength * 0.62;
  const tipX = x + ux * halfLength;
  const tipY = y + uy * halfLength;
  context.moveTo(x - ux * halfLength, y - uy * halfLength);
  context.lineTo(tipX, tipY);
  context.moveTo(tipX - ux * headLength - uy * headWidth, tipY - uy * headLength + ux * headWidth);
  context.lineTo(tipX, tipY);
  context.lineTo(tipX - ux * headLength + uy * headWidth, tipY - uy * headLength - ux * headWidth);
}

function drawField(context: CanvasRenderingContext2D, field: VortexField) {
  const { width, height, grid, vectors } = field;
  context.fillStyle = "#f3f1eb";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#252521";
  context.lineWidth = Math.max(1.2, Math.min(1.65, grid.spacing * 0.046));
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const index = (row * grid.columns + column) * 2;
      drawVector(
        context, grid.left + column * grid.spacing, grid.top + row * grid.spacing,
        vectors[index]!, vectors[index + 1]!, grid.spacing,
      );
    }
  }
  context.stroke();
}

export default function FingerSkatingOpt3({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Survives switching options, so a changed field is still there on return.
  const fieldRef = useRef<VortexField | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const strokes = new Map<number, StrokeState>();
    let field = fieldRef.current;
    let frame: number | null = null;
    let lastStep = 0;

    const render = (now: number) => {
      frame = null;
      if (!field) return;
      const touching = strokes.size > 0;
      if (!touching && now - lastStep < autonomousInterval) {
        frame = window.requestAnimationFrame(render);
        return;
      }
      let moving: boolean;
      if (!touching && reducedMotion.matches) {
        sampleVelocity(field);
        moving = false;
      } else {
        moving = stepVortexField(field, lastStep ? (now - lastStep) / 1000 : 1 / 60);
      }
      lastStep = now;
      drawField(context, field);
      if (moving || strokes.size > 0) frame = window.requestAnimationFrame(render);
      else lastStep = 0;
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      field = field ? resizeVortexField(field, width, height) : createVortexField(width, height);
      fieldRef.current = field;
      strokes.clear();
      drawField(context, field);
      schedule();
    };
    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: Math.max(0, Math.min(field?.width ?? 1, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(field?.height ?? 1, event.clientY - bounds.top)),
    });
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      strokes.set(event.pointerId, beginStroke(point(event, canvas.getBoundingClientRect()), event.timeStamp));
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      const stroke = strokes.get(event.pointerId);
      if (!stroke || !field) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of [...samples, event]) continueStroke(field, stroke, point(sample, bounds), sample.timeStamp);
      schedule();
    };
    const onUp = (event: PointerEvent) => {
      onMove(event);
      strokes.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      schedule();
    };
    const onCancel = (event: PointerEvent) => strokes.delete(event.pointerId);
    const onBlur = () => strokes.clear();

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
    };
  }, [active]);

  return (
    <main className={`${styles.field} ${active ? "" : styles.inactive}`} aria-hidden={!active}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Drag through a still fluid layer; the flow you leave keeps moving across the whole field" />
    </main>
  );
}
