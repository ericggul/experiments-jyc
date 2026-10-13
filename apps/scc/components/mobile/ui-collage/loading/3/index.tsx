"use client";

import { useEffect, useRef, useState } from "react";
import { createLoads, followLoads, resizeLoads, seekAlong, stepLoads, type Bounds, type Loads, type Point } from "./model/bars";
import { castRows, type Language } from "./screen/cast";
import { loadFaces } from "./screen/fonts";
import { createPainter } from "./screen/painter";
import styles from "./screen.module.css";

const languages: readonly { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "multi", label: "다국어" },
];
const thicknesses = [8, 16, 24, 40] as const;
type Thickness = (typeof thicknesses)[number];
// Words per row, chosen on a slider.
const fewestRepeats = 5;
const mostRepeats = 15;

const maximumPixelRatio = 2;

export default function MobileUiCollageLoadingThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [thickness, setThickness] = useState<Thickness>(16);
  const [repeats, setRepeats] = useState(10);
  const [open, setOpen] = useState(false);
  const settingsRef = useRef({ language, thickness, repeats });
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = { language, thickness, repeats };
    applyRef.current?.();
  }, [language, thickness, repeats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const safe = safeRef.current;
    if (!canvas || !safe) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const painter = createPainter(context);
    const pointers = new Map<number, Point>();
    // One random cast per visit; every row's language and face are drawn from it.
    const seed = Math.floor(Math.random() * 2 ** 32);
    let bounds: Bounds = { left: 0, top: 0, right: 1, bottom: 1 };
    let ratio = 1;
    let loads: Loads | null = null;
    let frame: number | null = null;
    let last = 0;
    let ready = false;
    let request = 0;
    let disposed = false;

    const draw = () => {
      if (loads) painter.draw(loads.shown);
    };

    const tick = (now: number) => {
      frame = null;
      if (!loads) return;
      const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const loading = stepLoads(loads, seconds);
      const moving = followLoads(loads, seconds);
      draw();
      // Once every row is fully inked and has caught up, the loop sleeps until a finger moves one.
      if (loading || moving) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (ready && frame === null) frame = window.requestAnimationFrame(tick);
    };

    // Rebuilds loads when the thickness or bounds change, then re-rasterises the lines once their faces are ready.
    // Until then the previous lines stay on screen (the first time, the rows stay blank and nothing loads).
    const apply = () => {
      const { language, thickness, repeats } = settingsRef.current;
      if (!loads || loads.rows.thickness !== thickness) loads = createLoads(bounds, thickness, Math.floor(Math.random() * 2 ** 32));
      else loads = resizeLoads(loads, bounds);
      const rows = loads.rows;
      const lines = castRows(seed, rows.count, language);
      const current = (request += 1);
      void loadFaces(lines).then((loaded) => {
        if (disposed || current !== request) return;
        painter.configure(rows, ratio, loaded, repeats);
        ready = true;
        draw();
        wake();
      });
      draw();
      wake();
    };
    applyRef.current = apply;

    const resize = () => {
      const area = canvas.getBoundingClientRect();
      const inset = safe.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      canvas.width = Math.max(1, Math.round(area.width * ratio));
      canvas.height = Math.max(1, Math.round(area.height * ratio));
      bounds = {
        left: inset.left - area.left,
        top: inset.top - area.top,
        right: inset.right - area.left,
        bottom: inset.bottom - area.top,
      };
      apply();
    };

    const point = (event: PointerEvent, area: DOMRect): Point => ({
      x: event.clientX - area.left,
      y: event.clientY - area.top,
    });

    const skate = (from: Point, to: Point) => {
      if (loads && seekAlong(loads, from, to) > 0) wake();
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
      const area = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of [...samples, event]) {
        const next = point(sample, area);
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
    observer.observe(safe);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("blur", onBlur);
    resize();

    return () => {
      disposed = true;
      applyRef.current = null;
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
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Rows of the word LOADING repeated, each row in a randomly drawn typeface (or, in 다국어, a randomly drawn language), inking in from left to right like a progress bar; skating a finger across a row sends it gliding to where the finger crosses it"
        role="img"
      />
      <div ref={safeRef} className={styles.safe} aria-hidden="true" />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.row} role="group" aria-label="Language">
              {languages.map((item) => (
                <button key={item.id} type="button" aria-pressed={language === item.id} onClick={() => setLanguage(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Thickness">
              {thicknesses.map((value) => (
                <button key={value} type="button" aria-pressed={thickness === value} onClick={() => setThickness(value)}>
                  {value}
                </button>
              ))}
            </div>
            <label className={styles.slider}>
              <input
                type="range"
                min={fewestRepeats}
                max={mostRepeats}
                step={1}
                value={repeats}
                aria-label="Words per row"
                onChange={(event) => setRepeats(Number(event.target.value))}
              />
              <output>×{repeats}</output>
            </label>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-label="옵션" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <svg width="18" height="4" viewBox="0 0 18 4" aria-hidden="true">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
            <circle cx="9" cy="2" r="2" fill="currentColor" />
            <circle cx="16" cy="2" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </main>
  );
}
