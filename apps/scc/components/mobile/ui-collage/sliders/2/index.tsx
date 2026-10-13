"use client";

import { useEffect, useRef, useState } from "react";
import { createColumns, followColumns, relayoutColumns, setAlong, type Bounds, type Columns, type Follow, type Point } from "./model/columns";
import { castColumns, type Language } from "./screen/cast";
import { loadFaces } from "./screen/fonts";
import { createPainter, type Mode } from "./screen/painter";
import { createSliderSound } from "./screen/sound";
import styles from "./screen.module.css";

const languages: readonly { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "multi", label: "다국어" },
];
const modes: readonly { id: Mode; label: string }[] = [
  { id: "stretch", label: "펼침" },
  { id: "shade", label: "농담" },
];
const follows: readonly { id: Follow; label: string }[] = [
  { id: "smooth", label: "부드럽게" },
  { id: "spring", label: "용수철" },
];
const widths = [12, 16, 20, 28] as const;
type Width = (typeof widths)[number];
// Words per column, chosen on a slider.
const fewestRepeats = 10;
const mostRepeats = 30;

const maximumPixelRatio = 2;

export default function MobileUiCollageSlidersTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [width, setWidth] = useState<Width>(16);
  const [repeats, setRepeats] = useState(14);
  const [sound, setSound] = useState(true);
  const [mode, setMode] = useState<Mode>("stretch");
  const modeRef = useRef(mode);
  const [follow, setFollow] = useState<Follow>("spring");
  const followRef = useRef(follow);
  const [open, setOpen] = useState(false);
  const settingsRef = useRef({ language, width, repeats });
  const applyRef = useRef<(() => void) | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const soundRef = useRef<ReturnType<typeof createSliderSound> | null>(null);

  useEffect(() => {
    settingsRef.current = { language, width, repeats };
    applyRef.current?.();
  }, [language, width, repeats]);

  useEffect(() => {
    const voice = createSliderSound();
    soundRef.current = voice;
    return () => {
      soundRef.current = null;
      voice.dispose();
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setEnabled(sound);
  }, [sound]);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  useEffect(() => {
    modeRef.current = mode;
    redrawRef.current?.();
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const safe = safeRef.current;
    if (!canvas || !safe) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const painter = createPainter(context);
    const pointers = new Map<number, Point>();
    // One random cast per visit; every column's language and face are drawn from it.
    const seed = Math.floor(Math.random() * 2 ** 32);
    let bounds: Bounds = { left: 0, top: 0, right: 1, bottom: 1 };
    let ratio = 1;
    let columns: Columns | null = null;
    let frame: number | null = null;
    let last = 0;
    let ready = false;
    let request = 0;
    let disposed = false;

    const draw = () => {
      if (columns) painter.draw(columns.shown, modeRef.current);
    };

    const tick = (now: number) => {
      frame = null;
      if (!columns) return;
      const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const moving = followColumns(columns, seconds, followRef.current);
      draw();
      // The loop runs only while a column glides toward the finger, and sleeps otherwise.
      if (moving) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (ready && frame === null) frame = window.requestAnimationFrame(tick);
    };

    // Relayouts the columns (values stay in place on screen), then re-rasterises the lines once their faces are
    // ready. Until then the previous lines stay on screen (the first time, the columns stay blank).
    const apply = () => {
      const { language, width, repeats } = settingsRef.current;
      columns = columns ? relayoutColumns(columns, bounds, width) : createColumns(bounds, width);
      const layout = columns.layout;
      const lines = castColumns(seed, layout.count, language);
      const current = (request += 1);
      void loadFaces(lines).then((loaded) => {
        if (disposed || current !== request) return;
        painter.configure(layout, ratio, loaded, repeats);
        ready = true;
        draw();
      });
      draw();
    };
    applyRef.current = apply;
    redrawRef.current = draw;

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

    // Each column that moves to a new scale step sounds its note (see model/pitch.ts).
    const sounded = (column: number, previous: number) => {
      soundRef.current?.play(columns!.target[column]!, previous);
    };

    const skate = (from: Point, to: Point) => {
      if (columns && setAlong(columns, from, to, sounded) > 0) wake();
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      soundRef.current?.resume();
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
      // iOS Safari may only unlock audio on the end of a touch.
      soundRef.current?.resume();
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

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Columns of the word SLIDER repeated and turned on its side, each in a randomly drawn typeface (or, in 다국어, a randomly drawn language), squeezed from the bottom edge up to its value; skating a finger across the columns stretches each to the finger's height and sounds its note"
        role="img"
      />
      <div ref={safeRef} className={styles.safe} aria-hidden="true" />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.row} role="group" aria-label="Mode">
              {modes.map((item) => (
                <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Follow">
              {follows.map((item) => (
                <button key={item.id} type="button" aria-pressed={follow === item.id} onClick={() => setFollow(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Language">
              {languages.map((item) => (
                <button key={item.id} type="button" aria-pressed={language === item.id} onClick={() => setLanguage(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Column width">
              {widths.map((value) => (
                <button key={value} type="button" aria-pressed={width === value} onClick={() => setWidth(value)}>
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
                aria-label="Words per column"
                onChange={(event) => setRepeats(Number(event.target.value))}
              />
              <output>×{repeats}</output>
            </label>
            <button type="button" aria-pressed={sound} onClick={() => setSound((value) => !value)}>
              소리
            </button>
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
