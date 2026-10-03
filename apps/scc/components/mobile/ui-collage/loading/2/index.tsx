"use client";

import { useEffect, useRef, useState } from "react";
import { createLoads, resizeLoads, seekAlong, stepLoads, type Bounds, type Loads, type Point } from "./model/bars";
import { createPainter, type Choice } from "./screen/painter";
import styles from "./screen.module.css";

// Oldest first, as in `lookOrder`; 섞기 cycles them by row.
const choices: readonly { id: Choice; label: string }[] = [
  { id: "dos", label: "MS-DOS" },
  { id: "system7", label: "System 7" },
  { id: "win31", label: "Win 3.1" },
  { id: "win95", label: "Win 95" },
  { id: "mac9", label: "Mac OS 9" },
  { id: "metal", label: "Java Metal" },
  { id: "xp", label: "Win XP" },
  { id: "aqua", label: "Aqua" },
  { id: "vista", label: "Win 7" },
  { id: "ubuntu", label: "Ubuntu" },
  { id: "holo", label: "Holo" },
  { id: "bootstrap", label: "Bootstrap" },
  { id: "ios", label: "iOS" },
  { id: "win10", label: "Win 10" },
  { id: "youtube", label: "YouTube" },
  { id: "material", label: "Material" },
  { id: "win11", label: "Win 11" },
  { id: "wavy", label: "Wavy" },
  { id: "mix", label: "섞기" },
];
const thicknesses = [8, 16, 24, 40] as const;
type Thickness = (typeof thicknesses)[number];

const maximumPixelRatio = 2;

export default function MobileUiCollageLoadingTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice>("mix");
  const [thickness, setThickness] = useState<Thickness>(24);
  const [showPercent, setShowPercent] = useState(true);
  const [open, setOpen] = useState(false);
  const settingsRef = useRef({ choice, thickness, showPercent });
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = { choice, thickness, showPercent };
    applyRef.current?.();
  }, [choice, thickness, showPercent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const safe = safeRef.current;
    if (!canvas || !safe) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const painter = createPainter(context);
    const pointers = new Map<number, Point>();
    let bounds: Bounds = { left: 0, top: 0, right: 1, bottom: 1 };
    let ratio = 1;
    let loads: Loads | null = null;
    let frame: number | null = null;
    let last = 0;
    let time = 0;

    const draw = () => {
      if (loads) painter.draw(loads.progress, time);
    };

    const tick = (now: number) => {
      frame = null;
      if (!loads) return;
      const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      time += seconds;
      const loading = stepLoads(loads, seconds);
      draw();
      // Once every bar holds at 100% the stack is still (stripes and sweeps stop with it) until a finger restarts one.
      if (loading) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    };

    // Rebuilds loads when the thickness or bounds change, then re-prepares the looks.
    const apply = () => {
      const { choice, thickness, showPercent } = settingsRef.current;
      if (!loads || loads.rows.thickness !== thickness) loads = createLoads(bounds, thickness, Math.floor(Math.random() * 2 ** 32));
      else loads = resizeLoads(loads, bounds);
      painter.configure(loads.rows, choice, showPercent, ratio);
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

  const current = choices.find((item) => item.id === choice)!;

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Rows of horizontal progress bars in historic interface styles, each filling from 0 to 100%; skating a finger across a bar sets it to where the finger crosses it"
        role="img"
      />
      <div ref={safeRef} className={styles.safe} aria-hidden="true" />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.looks} role="group" aria-label="Look">
              {choices.map((item) => (
                <button key={item.id} type="button" aria-pressed={choice === item.id} onClick={() => setChoice(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.sizes} role="group" aria-label="Thickness">
              {thicknesses.map((value) => (
                <button key={value} type="button" aria-pressed={thickness === value} onClick={() => setThickness(value)}>
                  {value}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={showPercent} onClick={() => setShowPercent((value) => !value)}>
              % 표시
            </button>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          옵션 · {current.label} {thickness}
        </button>
      </div>
    </main>
  );
}
