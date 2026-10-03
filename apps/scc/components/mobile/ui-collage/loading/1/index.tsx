"use client";

import { useEffect, useRef, useState } from "react";
import { cellCentre, createLoads, resizeLoads, restartAlong, stepLoads, type Loads, type Point } from "./model/loads";
import { Batch, addIndicator, lookOrder, type Look } from "./screen/indicators";
import styles from "./screen.module.css";

type Choice = Look | "mix";

const choices: readonly { id: Choice; label: string }[] = [
  { id: "ios", label: "iOS" },
  { id: "iosClassic", label: "iOS 6" },
  { id: "material", label: "Material" },
  { id: "wavy", label: "Wavy" },
  { id: "appstore", label: "App Store" },
  { id: "pie", label: "Pie" },
  { id: "telegram", label: "Telegram" },
  { id: "watch", label: "Watch" },
  { id: "fluent", label: "Windows 11" },
  { id: "gauge", label: "Gauge" },
  { id: "ticks", label: "Ticks" },
  { id: "liquid", label: "Liquid" },
  { id: "mix", label: "섞기" },
];
const sizes = [32, 48, 64, 100] as const;
type Size = (typeof sizes)[number];

// Indicators are fine strokes, so the canvas keeps up to 2× density.
const maximumPixelRatio = 2;
const background = "#fff";

export default function MobileUiCollageLoadingOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [choice, setChoice] = useState<Choice>("gauge");
  const [size, setSize] = useState<Size>(48);
  const [percent, setPercent] = useState(false);
  const [open, setOpen] = useState(false);
  const choiceRef = useRef(choice);
  const sizeRef = useRef(size);
  const percentRef = useRef(percent);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    choiceRef.current = choice;
    redrawRef.current?.();
  }, [choice]);

  useEffect(() => {
    sizeRef.current = size;
    redrawRef.current?.();
  }, [size]);

  useEffect(() => {
    percentRef.current = percent;
    redrawRef.current?.();
  }, [percent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const pointers = new Map<number, Point>();
    let width = 1;
    let height = 1;
    let loads: Loads | null = null;
    let frame: number | null = null;
    let last = 0;
    let time = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    const batch = new Batch();

    const draw = () => {
      if (!loads) return;
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      const { grid, progress } = loads;
      const choice = choiceRef.current;
      const percent = percentRef.current;
      batch.begin();
      for (let cell = 0; cell < progress.length; cell += 1) {
        const look = choice === "mix" ? lookOrder[cell % lookOrder.length]! : choice;
        addIndicator(batch, look, xs[cell]!, ys[cell]!, grid.size, progress[cell]!, time, percent);
      }
      batch.flush(context, grid.size);
    };

    const tick = (now: number) => {
      frame = null;
      if (!loads) return;
      const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      time += seconds;
      const loading = stepLoads(loads, seconds);
      draw();
      // Once every load holds at 100% the grid is still, so the loop sleeps until a finger restarts one.
      if (loading) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    };

    const rebuild = () => {
      if (!loads || loads.grid.size !== sizeRef.current) loads = createLoads(width, height, sizeRef.current, Math.floor(Math.random() * 2 ** 32));
      else loads = resizeLoads(loads, width, height);
      const count = loads.progress.length;
      xs = new Float32Array(count);
      ys = new Float32Array(count);
      for (let cell = 0; cell < count; cell += 1) {
        const centre = cellCentre(loads.grid, cell);
        xs[cell] = centre.x;
        ys[cell] = centre.y;
      }
      wake();
    };

    redrawRef.current = () => {
      if (loads && loads.grid.size !== sizeRef.current) rebuild();
      else {
        draw();
        wake();
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      rebuild();
      draw();
    };

    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const skate = (from: Point, to: Point) => {
      if (loads && restartAlong(loads, from, to) > 0) wake();
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const start = point(event, canvas.getBoundingClientRect());
      pointers.set(event.pointerId, start);
      skate(start, start);
    };

    const onMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of [...samples, event]) {
        const next = point(sample, bounds);
        skate(pointer, next);
        Object.assign(pointer, next);
      }
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
      redrawRef.current = null;
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

  const current = choices.find((item) => item.id === choice)!;

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A grid of circular loading indicators, each filling from 0 to 100%; skating a finger across one restarts it from 0%"
        role="img"
      />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.group} role="group" aria-label="Loader">
              {choices.map((item) => (
                <button key={item.id} type="button" aria-pressed={choice === item.id} onClick={() => setChoice(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.sizes} role="group" aria-label="Size">
              {sizes.map((value) => (
                <button key={value} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>
                  {value}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={percent} onClick={() => setPercent((value) => !value)}>
              % 숫자
            </button>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          옵션 · {current.label} {size}
        </button>
      </div>
    </main>
  );
}
