"use client";

import { useEffect, useRef } from "react";
import { createFlowField, injectFlow, resizeFlowField, stepFlow, type FlowField, type Point } from "./model/flow";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;

function drawArrow(context: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, spacing: number) {
  const speed = Math.hypot(vx, vy);
  if (speed < 0.015) return;
  const ux = vx / speed;
  const uy = vy / speed;
  const halfLength = spacing * (0.14 + 0.25 * Math.min(speed / 2.8, 1));
  const headLength = Math.min(spacing * 0.17, halfLength * 0.75);
  const headWidth = spacing * 0.105;
  const tipX = x + ux * halfLength;
  const tipY = y + uy * halfLength;
  context.beginPath();
  context.moveTo(x - ux * halfLength, y - uy * halfLength);
  context.lineTo(tipX, tipY);
  context.moveTo(tipX - ux * headLength - uy * headWidth, tipY - uy * headLength + ux * headWidth);
  context.lineTo(tipX, tipY);
  context.lineTo(tipX - ux * headLength + uy * headWidth, tipY - uy * headLength - ux * headWidth);
  context.stroke();
}

function drawField(context: CanvasRenderingContext2D, field: FlowField, dirty: ReadonlySet<number> | null) {
  const { width, height, grid, vectors } = field;
  context.fillStyle = "#f3f1eb";
  context.strokeStyle = "#252521";
  context.lineWidth = Math.max(1.2, Math.min(1.65, grid.spacing * 0.046));
  context.lineCap = "round";
  context.lineJoin = "round";
  const paint = (cell: number, clear: boolean) => {
    const row = Math.floor(cell / grid.columns);
    const column = cell % grid.columns;
    const x = grid.left + column * grid.spacing;
    const y = grid.top + row * grid.spacing;
    if (clear) context.fillRect(x - grid.spacing / 2, y - grid.spacing / 2, grid.spacing, grid.spacing);
    const index = cell * 2;
    drawArrow(context, x, y, vectors[index]!, vectors[index + 1]!, grid.spacing);
  };
  if (dirty === null) {
    context.fillRect(0, 0, width, height);
    for (let cell = 0; cell < grid.columns * grid.rows; cell += 1) paint(cell, false);
  } else {
    for (const cell of dirty) paint(cell, true);
  }
}

export default function FingerSkatingOpt2({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;
    const pointers = new Map<number, Point>();
    let field: FlowField | null = null;
    let frame: number | null = null;
    let lastFrame = 0;
    let fullRedraw = true;
    const dirty = new Set<number>();

    const render = (now: number) => {
      frame = null;
      if (!field) return;
      const moving = stepFlow(field, lastFrame ? (now - lastFrame) / 1000 : 1 / 60, dirty);
      lastFrame = now;
      if (fullRedraw || dirty.size > field.grid.columns * field.grid.rows * 0.45) {
        drawField(context, field, null);
      } else if (dirty.size > 0) {
        drawField(context, field, dirty);
      }
      fullRedraw = false;
      dirty.clear();
      if (moving) frame = window.requestAnimationFrame(render);
      else lastFrame = 0;
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
      field = field ? resizeFlowField(field, width, height) : createFlowField(width, height);
      pointers.clear();
      fullRedraw = true;
      dirty.clear();
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
      pointers.set(event.pointerId, point(event, canvas.getBoundingClientRect()));
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous || !field) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [event];
      let from = previous;
      for (const sample of [...samples, event]) {
        const to = point(sample, bounds);
        if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue;
        injectFlow(field, from, to);
        from = to;
      }
      pointers.set(event.pointerId, from);
      if (field.active.size > 0) schedule();
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
    };
  }, []);

  return (
    <main className={`${styles.field} ${active ? "" : styles.inactive}`} aria-hidden={!active}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Drag to leave a persistent, circulating flow in the arrow field" />
    </main>
  );
}
