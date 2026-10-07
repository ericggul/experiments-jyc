"use client";

import { useEffect, useRef } from "react";
import {
  alignSegment,
  createSampledField,
  resizeField,
  type Point,
  type GestureMemory,
  type SampledField,
} from "./model/field";
import styles from "./screen.module.css";

type ActivePointer = { x: number; y: number; gesture: GestureMemory };
type Size = { width: number; height: number };

const maximumPixelRatio = 1.5;

function drawArrow(context: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, spacing: number) {
  const magnitude = Math.hypot(vx, vy);
  if (magnitude < 0.000001) return;
  const ux = vx / magnitude;
  const uy = vy / magnitude;
  const halfLength = spacing * 0.29;
  const headLength = spacing * 0.17;
  const headWidth = spacing * 0.105;
  const tipX = x + ux * halfLength;
  const tipY = y + uy * halfLength;
  const tailX = x - ux * halfLength;
  const tailY = y - uy * halfLength;

  context.beginPath();
  context.moveTo(tailX, tailY);
  context.lineTo(tipX, tipY);
  context.moveTo(tipX - ux * headLength - uy * headWidth, tipY - uy * headLength + ux * headWidth);
  context.lineTo(tipX, tipY);
  context.lineTo(tipX - ux * headLength + uy * headWidth, tipY - uy * headLength - ux * headWidth);
  context.stroke();
}

function drawField(context: CanvasRenderingContext2D, field: SampledField, dirtyCells: ReadonlySet<number> | null) {
  const { width, height, grid, vectors } = field;

  context.fillStyle = "#f3f1eb";
  context.strokeStyle = "#252521";
  context.lineWidth = Math.max(1.2, Math.min(1.65, grid.spacing * 0.046));
  context.lineCap = "round";
  context.lineJoin = "round";

  const paintCell = (cell: number, clear: boolean) => {
    const row = Math.floor(cell / grid.columns);
    const column = cell % grid.columns;
    const y = grid.top + row * grid.spacing;
    const x = grid.left + column * grid.spacing;
    if (clear) context.fillRect(x - grid.spacing / 2, y - grid.spacing / 2, grid.spacing, grid.spacing);
    const index = cell * 2;
    drawArrow(context, x, y, vectors[index]!, vectors[index + 1]!, grid.spacing);
  };

  if (dirtyCells === null) {
    context.fillRect(0, 0, width, height);
    for (let cell = 0; cell < grid.columns * grid.rows; cell += 1) paintCell(cell, false);
  } else {
    for (const cell of dirtyCells) paintCell(cell, true);
  }
}

export default function FingerSkatingOpt1({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const pointers = new Map<number, ActivePointer>();
    let size: Size = { width: 0, height: 0 };
    let field: SampledField | null = null;
    let frame: number | null = null;
    let fullRedraw = true;
    const dirtyCells = new Set<number>();

    const render = () => {
      frame = null;
      if (!field) return;
      if (fullRedraw || dirtyCells.size > field.grid.columns * field.grid.rows * 0.45) {
        drawField(context, field, null);
      } else if (dirtyCells.size > 0) {
        drawField(context, field, dirtyCells);
      }
      fullRedraw = false;
      dirtyCells.clear();
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(render);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      size = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      field = field ? resizeField(field, size.width, size.height) : createSampledField(size.width, size.height);
      for (const pointer of pointers.values()) pointer.gesture.clear();
      fullRedraw = true;
      dirtyCells.clear();
      schedule();
    };

    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
        x: Math.max(0, Math.min(size.width, event.clientX - bounds.left)),
        y: Math.max(0, Math.min(size.height, event.clientY - bounds.top)),
    });

    const alignPath = (from: Point, to: Point, gesture: GestureMemory) => {
      if (!field) return;
      alignSegment(field, from, to, gesture, dirtyCells);
      if (dirtyCells.size > 0) schedule();
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const start = point(event, canvas.getBoundingClientRect());
      pointers.set(event.pointerId, { ...start, gesture: new Map() });
    };

    const onMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer || !field) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [event];
      for (const sample of [...samples, event]) {
        const next = point(sample, bounds);
        alignPath(pointer, next, pointer.gesture);
        Object.assign(pointer, next);
      }
    };

    const onUp = (event: PointerEvent) => {
      onMove(event);
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onCancel = (event: PointerEvent) => pointers.delete(event.pointerId);
    const onBlur = () => {
      pointers.clear();
    };

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
      <canvas
        ref={canvasRef}
        aria-label="Drag to align nearby arrows with your finger's direction; the new direction remains"
        className={styles.canvas}
        role="img"
      />
    </main>
  );
}
