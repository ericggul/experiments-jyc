"use client";

import { useEffect, useRef, useState } from "react";
import {
  CENTER, LENGTH_RATIO, MAX_LEVELS, WIDTH_RATIO, createArrow, layoutArrow, traceArrow,
} from "./model/branching";
import Options, { type OptionRow } from "./screen/options";
import styles from "./screen/direction-branching.module.css";

/** Archive instruction-sign blue; white sheeting is slightly warm. */
const BLUE = "#1e50a3";
const WHITE = "#f5f5f1";
const RIM = "#8b9196";
/** Narrower turns crush the branches together; wider ones fold back onto the stem. */
const MIN_SPREAD_DEG = 60;
const MAX_SPREAD_DEG = 160;
const FOLLOW = 9;
const DEAD_ZONE = 6;
/** Automatic depth keeps leaf shafts at least this many device px wide. */
const MIN_LEAF_PX = 3;
const MAX_DPR = 2;
/** Bends are sampled about this many device px apart, so deep branches cost few points. */
const BEND_SPACING_PX = 3;
/** Grow mode pauses this long when fully grown and when withdrawn to nothing. */
const HOLD_OPEN = 1.6;
const HOLD_CLOSED = 0.8;

type Mode = "still" | "grow";

type Settings = {
  size: number;
  lengthRatio: number;
  widthRatio: number;
  /** null follows the automatic depth for the current size and ratios. */
  depth: number | null;
  mode: Mode;
  /** Seconds for the arrow to grow from nothing to every tip. */
  growth: number;
};

const INITIAL: Settings = {
  size: 96,
  lengthRatio: LENGTH_RATIO,
  widthRatio: WIDTH_RATIO,
  depth: null,
  mode: "still",
  growth: 7,
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const ease = (t: number) => t * t * (3 - 2 * t);

/** Share of the arrow grown over one cycle: grow, hold, withdraw, hold. Eased once, not per level. */
function grownAt(time: number, span: number) {
  const cycle = 2 * span + HOLD_OPEN + HOLD_CLOSED;
  const t = time % cycle;
  if (t < span) return ease(t / span);
  if (t < span + HOLD_OPEN) return 1;
  if (t < 2 * span + HOLD_OPEN) return 1 - ease((t - span - HOLD_OPEN) / span);
  return 0;
}

export default function RoadSignDirectionBranching() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<Settings>(INITIAL);
  const [angle, setAngle] = useState(90);
  const [autoDepth, setAutoDepth] = useState(1);
  const settingsRef = useRef(settings);
  const engineRef = useRef<{ aim: (deg: number) => void; refresh: () => void } | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    engineRef.current?.refresh();
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrow = createArrow();
    let automatic = 1;
    let pixels = 1;
    let target = toRadians(90);
    let shown = target;
    let frame = 0;
    let last = 0;
    let clock = 0;

    const levelsNow = () => settingsRef.current.depth ?? automatic;

    const draw = () => {
      const { lengthRatio, widthRatio, mode } = settingsRef.current;
      const levels = levelsNow();
      // Face units to device px.
      const face = pixels / (2 * CENTER);
      layoutArrow(arrow, shown, levels, lengthRatio, widthRatio);
      const outline = new Path2D();
      const grown = mode === "grow" ? arrow.reach * grownAt(clock, settingsRef.current.growth) : Infinity;
      traceArrow(arrow, shown, outline, grown, BEND_SPACING_PX / face);

      context.setTransform(face, 0, 0, face, 0, 0);
      context.clearRect(0, 0, 2 * CENTER, 2 * CENTER);
      context.beginPath();
      context.arc(CENTER, CENTER, 498, 0, Math.PI * 2);
      context.fillStyle = WHITE;
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = RIM;
      context.stroke();
      context.beginPath();
      context.arc(CENTER, CENTER, 470, 0, Math.PI * 2);
      context.fillStyle = BLUE;
      context.fill();
      context.save();
      context.clip();
      context.fillStyle = WHITE;
      context.fill(outline, "nonzero");
      context.restore();
    };

    const step = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
      last = time;
      shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-FOLLOW * dt));
      if (Math.abs(target - shown) < 1e-4) shown = target;
      const unfolding = settingsRef.current.mode === "grow";
      if (unfolding) clock += dt;
      draw();
      const busy = unfolding || shown !== target;
      frame = busy ? requestAnimationFrame(step) : 0;
      if (!busy) last = 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    /** Deepest level whose leaves stay MIN_LEAF_PX wide at a right-angle turn. */
    const measureDepth = () => {
      const { lengthRatio, widthRatio } = settingsRef.current;
      const face = pixels / (2 * CENTER);
      automatic = 1;
      for (let candidate = 1; candidate <= MAX_LEVELS; candidate += 1) {
        layoutArrow(arrow, Math.PI / 2, candidate, lengthRatio, widthRatio);
        if (arrow.to[arrow.count - 1] * face < MIN_LEAF_PX) break;
        automatic = candidate;
      }
      setAutoDepth(automatic);
    };

    const resize = () => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      pixels = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.width = pixels;
      canvas.height = pixels;
      measureDepth();
      draw();
    };

    const aim = (deg: number) => {
      target = toRadians(Math.min(MAX_SPREAD_DEG, Math.max(MIN_SPREAD_DEG, deg)));
      kick();
    };

    const onPointer = (event: PointerEvent) => {
      // The options panel is operated with the pointer too; it must not steer the arrow.
      if (event.target instanceof Element && event.target.closest("[data-direction-options]")) return;
      const box = canvas.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) <= DEAD_ZONE) return;
      // Straight ahead is up; the pointer's angle off it, either side, is the turn.
      const deg = Math.min(MAX_SPREAD_DEG, Math.max(MIN_SPREAD_DEG, Math.abs(Math.atan2(dx, -dy)) * 180 / Math.PI));
      setAngle(Math.round(deg));
      aim(deg);
    };

    engineRef.current = {
      aim,
      refresh: () => {
        measureDepth();
        if (settingsRef.current.mode === "still") clock = 0;
        draw();
        kick();
      },
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      engineRef.current = null;
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const rows: OptionRow[] = [
    {
      id: "mode", section: "motion", label: "모드", value: settings.mode,
      choices: [{ id: "still", label: "정지" }, { id: "grow", label: "성장" }],
      onChange: (id) => update("mode", id as Mode),
    },
    {
      kind: "range", id: "growth", section: "motion", label: "성장 시간", value: settings.growth,
      min: 2, max: 20, step: 0.5, unit: "초", onChange: (value) => update("growth", value),
    },
    {
      kind: "range", id: "angle", section: "shape", label: "각도", value: angle,
      min: MIN_SPREAD_DEG, max: MAX_SPREAD_DEG, step: 1, unit: "°",
      onChange: (value) => {
        setAngle(value);
        engineRef.current?.aim(value);
      },
    },
    {
      kind: "range", id: "length", section: "shape", label: "길이 배율", value: settings.lengthRatio,
      min: 0.3, max: 0.7, step: 0.01, unit: "", onChange: (value) => update("lengthRatio", value),
    },
    {
      kind: "range", id: "width", section: "shape", label: "굵기 배율", value: settings.widthRatio,
      min: 0.3, max: 0.8, step: 0.01, unit: "", onChange: (value) => update("widthRatio", value),
    },
    {
      kind: "range", id: "depth", section: "shape", label: "단계", value: settings.depth ?? autoDepth,
      min: 1, max: MAX_LEVELS, step: 1, unit: "", onChange: (value) => update("depth", value),
    },
    {
      kind: "action", id: "depth-auto", section: "shape", label: "", action: settings.depth === null ? "단계 자동" : "자동으로",
      onAction: () => update("depth", null),
    },
    {
      kind: "range", id: "size", section: "sign", label: "크기", value: settings.size,
      min: 40, max: 100, step: 1, unit: "%", onChange: (value) => update("size", value),
    },
  ];

  return <main className={styles.stage} style={{ "--size": `${settings.size}vmin` } as React.CSSProperties}>
    <div className={styles.pole} aria-hidden />
    <div className={styles.shade} aria-hidden />
    <div className={styles.sign}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="직진, 좌회전, 우회전으로 끝없이 갈라지는 화살표 지시표지" />
    </div>
    <div data-direction-options>
      <Options rows={rows} />
    </div>
  </main>;
}
