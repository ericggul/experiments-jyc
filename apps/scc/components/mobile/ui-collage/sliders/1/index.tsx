"use client";

import { useEffect, useRef, useState } from "react";
import { createSliders, densities, layoutFor, relayoutSliders, setAlong, sliderLeft, sliderTop, stepSliders, thumbY, type Density, type Insets, type Point, type Sliders } from "./model/sliders";
import { lookSpecs, type LookId } from "./model/looks";
import { Kit } from "./screen/kit";
import { looks, type Box } from "./screen/looks";
import { createSliderSound } from "./screen/sound";
import styles from "./screen.module.css";

type Choice = LookId | "mix";

const choices: readonly { id: Choice; label: string }[] = [...lookSpecs.map(({ id, label }) => ({ id, label })), { id: "mix", label: "섞기" }];
const widths = [16, 20, 28] as const;
type Width = (typeof widths)[number];
const lengths = [
  { rows: 1, label: "1단" },
  { rows: 2, label: "2단" },
  { rows: 4, label: "4단" },
] as const;
type Rows = (typeof lengths)[number]["rows"];
const densityLabels: Record<Density, string> = { 1: "보통", 1.5: "1.5×", 2: "2×" };

// Hairline rims and 1 px bevels need up to 2× density.
const maximumPixelRatio = 2;
const background = "#fff";

export default function MobileUiCollageSlidersOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice>("mix");
  const [width, setWidth] = useState<Width>(20);
  const [rows, setRows] = useState<Rows>(1);
  const [density, setDensity] = useState<Density>(1.5);
  const [sound, setSound] = useState(true);
  const [open, setOpen] = useState(false);
  const soundRef = useRef<ReturnType<typeof createSliderSound> | null>(null);
  const choiceRef = useRef(choice);
  const widthRef = useRef(width);
  const rowsRef = useRef(rows);
  const densityRef = useRef(density);
  const relayoutRef = useRef<(() => void) | null>(null);
  const restyleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    choiceRef.current = choice;
    restyleRef.current?.();
  }, [choice]);

  useEffect(() => {
    widthRef.current = width;
    rowsRef.current = rows;
    densityRef.current = density;
    relayoutRef.current?.();
  }, [width, rows, density]);

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
    const canvas = canvasRef.current;
    const probe = probeRef.current;
    if (!canvas || !probe) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const kit = new Kit();
    const pointers = new Map<number, Point>();
    let viewWidth = 1;
    let viewHeight = 1;
    let sliders: Sliders | null = null;
    let dirty = new Uint8Array(0);
    let full = true;
    let frame: number | null = null;
    let last = 0;
    const groups = new Map<LookId, Box[]>();

    const insets = (): Insets => {
      const style = getComputedStyle(probe);
      return {
        top: parseFloat(style.paddingTop) || 16,
        right: parseFloat(style.paddingRight) || 16,
        bottom: parseFloat(style.paddingBottom) || 16,
        left: parseFloat(style.paddingLeft) || 16,
      };
    };

    const lookFor = (index: number) => {
      const current = choiceRef.current;
      if (current !== "mix") return current;
      return looks[(index % sliders!.layout.columns) % looks.length]!.id;
    };

    const draw = () => {
      if (!sliders) return;
      const { layout, shown } = sliders;
      const { width: w, gap, rowGap, height } = layout;
      if (full) {
        context.fillStyle = background;
        context.fillRect(0, 0, viewWidth, viewHeight);
      }
      for (const group of groups.values()) group.length = 0;
      context.fillStyle = background;
      for (let index = 0; index < shown.length; index += 1) {
        if (!full && !dirty[index]) continue;
        dirty[index] = 0;
        const x = sliderLeft(layout, index);
        const top = sliderTop(layout, index);
        // Every look stays inside its column plus half the gaps, so a dirty slider repaints only its cell.
        if (!full) context.fillRect(x - gap / 2, top - rowGap / 2, w + gap, height + rowGap);
        const value = shown[index]!;
        const box: Box = { x, cx: x + w / 2, top, bottom: top + height, row: Math.floor(index / layout.columns), value, thumb: kit.snap(thumbY(layout, top, value)) };
        const id = lookFor(index);
        let group = groups.get(id);
        if (!group) groups.set(id, (group = []));
        group.push(box);
      }
      full = false;
      const geometry = { w, u: w / 20, inset: layout.inset };
      for (const look of looks) {
        const group = groups.get(look.id);
        if (group?.length) look.draw(context, group, geometry, kit);
      }
    };

    const tick = (now: number) => {
      frame = null;
      if (!sliders) return;
      const seconds = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const moving = stepSliders(sliders, seconds, dirty);
      draw();
      // Once every thumb has arrived the loop sleeps until a finger moves one.
      if (moving) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    };

    const relayout = () => {
      const layout = layoutFor(viewWidth, viewHeight, widthRef.current, densityRef.current, rowsRef.current, insets());
      sliders = sliders ? relayoutSliders(sliders, layout) : createSliders(layout);
      dirty = new Uint8Array(sliders.target.length);
      kit.clearGradients();
      full = true;
      wake();
    };
    relayoutRef.current = relayout;
    restyleRef.current = () => {
      full = true;
      wake();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      viewWidth = Math.max(1, bounds.width);
      viewHeight = Math.max(1, bounds.height);
      canvas.width = Math.round(viewWidth * ratio);
      canvas.height = Math.round(viewHeight * ratio);
      context.setTransform(canvas.width / viewWidth, 0, 0, canvas.height / viewHeight, 0, 0);
      kit.setRatio(ratio);
      relayout();
    };

    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    // Each slider that moves to a new scale step sounds its note (see model/pitch.ts).
    const mark = (index: number, previous: number) => {
      dirty[index] = 1;
      soundRef.current?.play(sliders!.target[index]!, previous);
    };

    const skate = (from: Point, to: Point) => {
      if (sliders && setAlong(sliders, from, to, mark) > 0) wake();
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
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of [...samples, event]) {
        const next = point(sample, bounds);
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
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("blur", onBlur);
    resize();

    return () => {
      relayoutRef.current = null;
      restyleRef.current = null;
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
      <div ref={probeRef} className={styles.probe} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Columns of vertical sliders in historic and current designs; skating a finger across them sets each crossed slider to the finger's height and sounds its note, low at the bottom and high at the top"
        role="img"
      />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.group} role="group" aria-label="Slider">
              {choices.map((item) => (
                <button key={item.id} type="button" aria-pressed={choice === item.id} onClick={() => setChoice(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Width">
              {widths.map((value) => (
                <button key={value} type="button" aria-pressed={width === value} onClick={() => setWidth(value)}>
                  {value}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Density">
              {densities.map((value) => (
                <button key={value} type="button" aria-pressed={density === value} onClick={() => setDensity(value)}>
                  {densityLabels[value]}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Length">
              {lengths.map((item) => (
                <button key={item.rows} type="button" aria-pressed={rows === item.rows} onClick={() => setRows(item.rows)}>
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={sound} onClick={() => setSound((value) => !value)}>
              소리
            </button>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          옵션 · {current.label} {width}
          {density === 1 ? "" : ` · ${densityLabels[density]}`}
        </button>
      </div>
    </main>
  );
}
