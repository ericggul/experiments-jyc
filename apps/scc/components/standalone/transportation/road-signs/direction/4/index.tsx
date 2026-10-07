"use client";

import { useEffect, useRef, useState } from "react";
import { CENTER, arrowFor } from "../1/model/arrow";
import {
  aimAtFingers,
  applyStroke,
  holdExitsOnScreen,
  createSignGrid,
  resizeSignGrid,
  signCenter,
  stepSignGrid,
  resetSignGrid,
  type Point,
  type SignGrid,
} from "./model/grid";
import styles from "./screen/direction-skating.module.css";

/** Archive instruction-sign blue; white sheeting is slightly warm. */
const BLUE = "#1e50a3";
const WHITE = "#f5f5f1";
const RIM = "#a9afb4";
const MAXIMUM_PIXEL_RATIO = 2;
/** Path length (px) over which opt 4 reads the finger's travel direction. */
const TRAVEL_SPAN = 12;
/** Arrow shapes are cached per half degree of heading. */
const BUCKETS_PER_TURN = 720;

type Logic = "exit" | "follow";
/** What drives the arrow's bend, and the whole sign's rotation (upright when null). */
const modes = [
  { key: "exit", label: "opt 1", detail: "arrow exit", arrow: "exit", sign: null, inSignFrame: false },
  { key: "follow", label: "opt 2", detail: "arrow follow", arrow: "follow", sign: null, inSignFrame: false },
  { key: "exit-follow", label: "opt 3", detail: "arrow exit · sign follow", arrow: "exit", sign: "follow", inSignFrame: false },
  // The arrow records the finger's travel direction as it leaves and keeps
  // pointing there on screen while the sign goes on following the finger.
  { key: "exit-follow-rotated", label: "opt 4", detail: "arrow keeps finger's travel · sign follow", arrow: "exit", sign: "follow", inSignFrame: true },
] as const satisfies readonly {
  key: string;
  label: string;
  detail: string;
  arrow: Logic;
  sign: "follow" | null;
  inSignFrame: boolean;
}[];
type Mode = (typeof modes)[number];

type ArrowPath = { shaft: Path2D; head: Path2D; width: number };

function sizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ratio: number,
) {
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawPlates(context: CanvasRenderingContext2D, grid: SignGrid) {
  const { radius } = grid;
  context.clearRect(0, 0, grid.width, grid.height);
  const layers: [string, number][] = [
    [RIM, radius],
    [WHITE, radius * (496 / 500)],
    [BLUE, radius * (470 / 500)],
  ];
  for (const [color, size] of layers) {
    context.fillStyle = color;
    context.beginPath();
    for (let index = 0; index < grid.columns * grid.rows; index += 1) {
      const center = signCenter(grid, index);
      context.moveTo(center.x + size, center.y);
      context.arc(center.x, center.y, size, 0, Math.PI * 2);
    }
    context.fill();
  }
}

export default function RoadSignDirectionSkating() {
  const plateCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>(modes[1]);
  const [open, setOpen] = useState(false);
  const modeRef = useRef<Mode>(mode);
  const applyModeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    applyModeRef.current?.();
  }, [mode]);

  useEffect(() => {
    const plateCanvas = plateCanvasRef.current;
    const canvas = canvasRef.current;
    if (!plateCanvas || !canvas) return;
    const plateContext = plateCanvas.getContext("2d");
    const context = canvas.getContext("2d");
    if (!plateContext || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrows = new Map<number, ArrowPath>();
    const pointers = new Map<number, Point>();
    // Recent points per finger, newest last, spanning about TRAVEL_SPAN px.
    const trails = new Map<number, Point[]>();
    const travelHeading = (trail: Point[]) => {
      const head = trail[trail.length - 1]!;
      const tail = trail[0]!;
      return Math.atan2(head.x - tail.x, -(head.y - tail.y));
    };
    const extendTrail = (id: number, to: Point) => {
      const trail = trails.get(id) ?? [];
      trail.push(to);
      let length = 0;
      let keep = trail.length - 1;
      while (keep > 0 && length < TRAVEL_SPAN) {
        length += Math.hypot(trail[keep]!.x - trail[keep - 1]!.x, trail[keep]!.y - trail[keep - 1]!.y);
        keep -= 1;
      }
      trail.splice(0, keep);
      trails.set(id, trail);
      return trail;
    };
    let grid: SignGrid | null = null;
    let ratio = 1;
    let frame: number | null = null;
    let lastFrame = 0;

    const arrowPath = (heading: number) => {
      const bucket = Math.round((heading / (Math.PI * 2)) * BUCKETS_PER_TURN);
      let path = arrows.get(bucket);
      if (!path) {
        const shape = arrowFor((bucket / BUCKETS_PER_TURN) * Math.PI * 2);
        path = { shaft: new Path2D(shape.shaft), head: new Path2D(shape.head), width: shape.width };
        arrows.set(bucket, path);
      }
      return path;
    };

    const drawArrows = (current: SignGrid) => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = WHITE;
      context.fillStyle = WHITE;
      context.lineCap = "butt";
      const scale = (current.radius / CENTER) * ratio;
      for (let index = 0; index < current.columns * current.rows; index += 1) {
        const center = signCenter(current, index);
        const path = arrowPath(current.heading[index]!);
        const rotation = current.rotation[index]!;
        const cos = Math.cos(rotation) * scale;
        const sin = Math.sin(rotation) * scale;
        // Rotate the 1000-unit face about its centre, then place it on the sign.
        context.setTransform(
          cos,
          sin,
          -sin,
          cos,
          center.x * ratio - CENTER * (cos - sin),
          center.y * ratio - CENTER * (sin + cos),
        );
        context.lineWidth = path.width;
        context.stroke(path.shaft);
        context.fill(path.head);
      }
    };

    const render = (now: number) => {
      frame = null;
      if (!grid) return;
      if (pointers.size > 0) {
        const fingers = [...pointers.values()];
        if (modeRef.current.arrow === "follow") aimAtFingers(grid, fingers, "arrow");
        if (modeRef.current.sign === "follow") aimAtFingers(grid, fingers, "sign");
      }
      if (modeRef.current.inSignFrame) holdExitsOnScreen(grid);
      const moving = stepSignGrid(grid, lastFrame ? (now - lastFrame) / 1000 : 1 / 60, reduced);
      drawArrows(grid);
      if (moving || pointers.size > 0) {
        lastFrame = now;
        frame = window.requestAnimationFrame(render);
      } else {
        lastFrame = 0;
      }
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, MAXIMUM_PIXEL_RATIO);
      sizeCanvas(plateCanvas, plateContext, width, height, ratio);
      sizeCanvas(canvas, context, width, height, ratio);
      grid = grid ? resizeSignGrid(grid, width, height) : createSignGrid(width, height);
      drawPlates(plateContext, grid);
      pointers.clear();
      trails.clear();
      schedule();
    };
    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const onDown = (event: PointerEvent) => {
      if (!grid || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const start = point(event, canvas.getBoundingClientRect());
      pointers.set(event.pointerId, start);
      trails.set(event.pointerId, [start]);
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous || !grid) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      let from = previous;
      for (const sample of [...samples, event]) {
        const to = point(sample, bounds);
        if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue;
        const trail = extendTrail(event.pointerId, to);
        if (modeRef.current.arrow === "exit") {
          const { inSignFrame } = modeRef.current;
          applyStroke(grid, from, to, "arrow", inSignFrame, inSignFrame ? travelHeading(trail) : undefined);
        }
        from = to;
      }
      pointers.set(event.pointerId, from);
      schedule();
    };
    const onUp = (event: PointerEvent) => {
      onMove(event);
      pointers.delete(event.pointerId);
      trails.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      trails.delete(event.pointerId);
    };
    const onBlur = () => {
      pointers.clear();
      trails.clear();
    };

    applyModeRef.current = () => {
      if (!grid) return;
      // Each option starts again from a clean grid.
      resetSignGrid(grid);
      trails.clear();
      schedule();
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
      applyModeRef.current = null;
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas ref={plateCanvasRef} className={styles.plates} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Drag across the signs: each arrow points where your finger left it"
      />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel} role="group" aria-label="Finger skating options">
            {modes.map((value) => (
              <button key={value.key} type="button" aria-pressed={mode.key === value.key} onClick={() => setMode(value)}>
                <strong>{value.label}</strong>
                <span>{value.detail}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="Options"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="7" cy="6" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="13" cy="14" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </main>
  );
}
