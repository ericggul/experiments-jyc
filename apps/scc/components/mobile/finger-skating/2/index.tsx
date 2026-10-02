"use client";

import { useEffect, useRef, useState } from "react";
import { curvePolylines, fitStroke, type Fit, type Point } from "./model/fit";
import { formatFit, formulaText, type FormulaPiece } from "./model/formula";
import styles from "./screen.module.css";

const maximumPixelRatio = 2;
/** Plane units across the shorter viewport side. */
const unitsAcrossShortSide = 10;
/** Finger jitter, in pixels, that the fit treats as noise rather than shape. */
const jitterPixels = 1.5;
/** Live fits while drawing are throttled; the release fit is always exact. */
const liveFitInterval = 140;
const paper = "#f3f1eb";
const ink = "#252521";
const accent = "#b43a1c";
const numeralFont = '400 11px "STIX Two Text", "Cambria Math", Cambria, "Times New Roman", serif';
const axisNameFont = 'italic 400 15px "STIX Two Text", "Cambria Math", Cambria, "Times New Roman", serif';

type Plane = { width: number; height: number; unit: number };

const toScreen = (plane: Plane, point: Point) => ({
  x: plane.width / 2 + point.x * plane.unit,
  y: plane.height / 2 - point.y * plane.unit,
});

const numeral = (value: number) => (value < 0 ? `−${-value}` : `${value}`);

function drawAxes(context: CanvasRenderingContext2D, plane: Plane) {
  const { width, height, unit } = plane;
  const originX = width / 2;
  const originY = height / 2;
  const labelStep = [1, 2, 5, 10].find((step) => step * unit >= 34) ?? 10;

  context.strokeStyle = ink;
  context.globalAlpha = 0.55;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, Math.round(originY) + 0.5);
  context.lineTo(width, Math.round(originY) + 0.5);
  context.moveTo(Math.round(originX) + 0.5, 0);
  context.lineTo(Math.round(originX) + 0.5, height);
  const halfX = Math.floor(width / 2 / unit);
  const halfY = Math.floor(height / 2 / unit);
  for (let value = -halfX; value <= halfX; value += 1) {
    if (value === 0) continue;
    const x = Math.round(originX + value * unit) + 0.5;
    context.moveTo(x, originY - 3);
    context.lineTo(x, originY + 3);
  }
  for (let value = -halfY; value <= halfY; value += 1) {
    if (value === 0) continue;
    const y = Math.round(originY - value * unit) + 0.5;
    context.moveTo(originX - 3, y);
    context.lineTo(originX + 3, y);
  }
  context.stroke();

  context.globalAlpha = 1;
  context.fillStyle = "#8b887f";
  context.font = numeralFont;
  context.textAlign = "center";
  context.textBaseline = "top";
  for (let value = -halfX; value <= halfX; value += 1) {
    if (value !== 0 && value % labelStep === 0 && Math.abs(value * unit) < width / 2 - 12) {
      context.fillText(numeral(value), originX + value * unit, originY + 7);
    }
  }
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let value = -halfY; value <= halfY; value += 1) {
    if (value !== 0 && value % labelStep === 0 && Math.abs(value * unit) < height / 2 - 12) {
      context.fillText(numeral(value), originX - 8, originY - value * unit);
    }
  }
  context.fillStyle = ink;
  context.font = axisNameFont;
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.fillText("x", width - 10, originY - 6);
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("y", originX + 8, 10);
}

function drawPath(context: CanvasRenderingContext2D, plane: Plane, points: readonly Point[]) {
  context.beginPath();
  points.forEach((point, index) => {
    const { x, y } = toScreen(plane, point);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawPlane(context: CanvasRenderingContext2D, plane: Plane, stroke: readonly Point[], fit: Fit | null) {
  context.fillStyle = paper;
  context.fillRect(0, 0, plane.width, plane.height);
  drawAxes(context, plane);
  context.lineCap = "round";
  context.lineJoin = "round";
  if (stroke.length > 1) {
    context.strokeStyle = ink;
    context.globalAlpha = 0.16;
    context.lineWidth = 7;
    drawPath(context, plane, stroke);
    context.globalAlpha = 1;
  }
  if (fit) {
    const view = {
      minX: -plane.width / 2 / plane.unit,
      maxX: plane.width / 2 / plane.unit,
      minY: -plane.height / 2 / plane.unit,
      maxY: plane.height / 2 / plane.unit,
    };
    context.strokeStyle = accent;
    context.lineWidth = 2;
    for (const line of curvePolylines(fit, view, 1.5 / plane.unit)) drawPath(context, plane, line);
  }
}

function FormulaView({ pieces }: { pieces: readonly FormulaPiece[] }) {
  return pieces.map((piece) => {
    const content = piece.role === "variable" ? <i>{piece.text}</i> : piece.text;
    return piece.raised ? <sup key={piece.id}>{content}</sup> : <span key={piece.id}>{content}</span>;
  });
}

export default function MobileFingerSkatingTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formula, setFormula] = useState<readonly FormulaPiece[]>([]);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let plane: Plane = { width: 1, height: 1, unit: 1 };
    // The stroke is stored in plane units so it keeps its mathematical meaning across resizes.
    let stroke: Point[] = [];
    let fit: Fit | null = null;
    let pointerId: number | null = null;
    let frame: number | null = null;
    let lastFit = 0;
    let fitPending = false;
    let shownText = "";

    const refit = () => {
      fit = fitStroke(stroke, { noise: jitterPixels / plane.unit });
      fitPending = false;
      const pieces = fit ? formatFit(fit) : [];
      const text = formulaText(pieces);
      if (text !== shownText) {
        shownText = text;
        setFormula(pieces);
      }
    };
    const render = (now: number) => {
      frame = null;
      if (fitPending && (pointerId === null || now - lastFit >= liveFitInterval)) {
        lastFit = now;
        refit();
      }
      drawPlane(context, plane, stroke, fit);
      if (fitPending) frame = window.requestAnimationFrame(render);
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
      plane = { width, height, unit: Math.min(width, height) / unitsAcrossShortSide };
      fitPending = stroke.length > 1;
      schedule();
    };
    const toPlane = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: (event.clientX - bounds.left - plane.width / 2) / plane.unit,
      y: (plane.height / 2 - (event.clientY - bounds.top)) / plane.unit,
    });
    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      pointerId = event.pointerId;
      stroke = [toPlane(event, canvas.getBoundingClientRect())];
      fit = null;
      fitPending = true;
      lastFit = performance.now();
      setDrawn(true);
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const bounds = canvas.getBoundingClientRect();
      for (const sample of [...(event.getCoalescedEvents?.() ?? []), event]) stroke.push(toPlane(sample, bounds));
      fitPending = true;
      schedule();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      onMove(event);
      pointerId = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      schedule();
    };
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === pointerId) onUp(event);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    resize();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const text = formulaText(formula);
  return (
    <main className={styles.plane}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Cartesian plane. Draw a curve to find the function closest to it." />
      <p className={styles.formula} aria-hidden="true"><FormulaView pieces={formula} /></p>
      <p className={styles.hidden} aria-live="polite">{text.replaceAll("^", " to the power ")}</p>
      {!drawn && <p className={styles.instruction}>draw a curve</p>}
    </main>
  );
}
