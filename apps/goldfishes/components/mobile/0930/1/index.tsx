"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./mobile.module.css";

type BubbleConfig = { name: string; size: number; weight: number };

type Bubble = BubbleConfig & {
  id: number;
  column: number;
  row: number;
  /** Target diameter multiplier: decays over time, grows under finger contact. */
  scale: number;
  /** Displayed multiplier, eased toward scale every frame. */
  shown: number;
};

type Point = { x: number; y: number };

// Path travelled since the previous frame; contact is tested against the whole path so a
// fast skate cannot pass through a bubble between two frames.
type ActivePointer = { path: Point[] };

type View = { side: number; cell: number; ratio: number };

type Mode = "idle" | "configuring" | "placing";

// The map is a square window onto an unbounded landscape of grid points (2d/1 spacing,
// primary scale 2). World point (0, 0) sits at the window centre; the window does not pan yet.
const CELL_MIN = 20;
const CELL_MAX = 30;
const CELL_DIVISOR = 30;
const GRID_SCALE = 2;
const DOT_RADIUS = 1.25;
const EDGE_INSET = 8;
const MAX_PIXEL_RATIO = 2;

// A bubble shrinks from 1 to 0 in 8s. Finger contact (resting or skating) grows it by
// 8 per second of contact (a ~60ms skate pass adds about half its base size), up to 2.5×,
// which also extends its life.
const DECAY_PER_SECOND = 1 / 8;
const GROWTH_PER_SECOND = 8;
const SCALE_MAX = 2.5;
const EASE_PER_SECOND = 24;
const FINGER_SLOP = 12;
const MIN_FINGER_RADIUS = 22;

const LABEL_FONT = "11px Menlo, Monaco, Consolas, monospace";
const SIZE_RANGE = { min: 0.5, max: 3, step: 0.1 };
const DEFAULT_CONFIG: BubbleConfig = { name: "", size: 1, weight: 0.5 };

function cellForSide(side: number) {
  return (
    Math.max(CELL_MIN, Math.min(CELL_MAX, Math.round(side / CELL_DIVISOR))) *
    GRID_SCALE
  );
}

function pointAt(view: View, index: number) {
  return view.side / 2 + index * view.cell;
}

function bubbleRadius(bubble: Bubble, cell: number) {
  return (bubble.size * cell * bubble.shown) / 2;
}

function snapIndex(value: number, view: View) {
  const centre = view.side / 2;
  const first = Math.ceil((EDGE_INSET - centre) / view.cell);
  const last = Math.floor((view.side - EDGE_INSET - centre) / view.cell);
  return Math.min(last, Math.max(first, Math.round((value - centre) / view.cell)));
}

// Grid dots are static, so they are rasterised once per size and alpha and blitted per frame.
function renderDots(view: View, alpha: number) {
  const layer = document.createElement("canvas");
  layer.width = Math.round(view.side * view.ratio);
  layer.height = layer.width;
  const context = layer.getContext("2d");
  if (!context) return layer;
  context.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
  context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  context.beginPath();
  const reach = Math.ceil(view.side / 2 / view.cell) + 1;
  for (let column = -reach; column <= reach; column += 1) {
    const x = pointAt(view, column);
    for (let row = -reach; row <= reach; row += 1) {
      const y = pointAt(view, row);
      context.moveTo(x + DOT_RADIUS, y);
      context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
    }
  }
  context.fill();
  return layer;
}

function drawBubbles(
  context: CanvasRenderingContext2D,
  view: View,
  bubbles: Iterable<Bubble>,
) {
  context.font = LABEL_FONT;
  context.textBaseline = "middle";
  context.lineWidth = 1;

  for (const bubble of bubbles) {
    const radius = bubbleRadius(bubble, view.cell);
    if (radius < 0.5) continue;
    const x = pointAt(view, bubble.column);
    const y = pointAt(view, bubble.row);
    const fade = Math.min(1, bubble.shown * 4);

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${bubble.weight * 0.6 * fade})`;
    context.fill();
    context.strokeStyle = `rgba(255, 255, 255, ${fade})`;
    context.stroke();

    if (bubble.name) {
      context.fillStyle = `rgba(221, 221, 221, ${fade})`;
      context.fillText(bubble.name, x + radius + 8, y);
    }
  }
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <label className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--progress": `${progress}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.rowValue}>{display}</span>
    </label>
  );
}

function blurActiveElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export default function GoldfishesMobileKeywordGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<Mode>("idle");
  const draftRef = useRef<BubbleConfig>(DEFAULT_CONFIG);
  const requestDrawRef = useRef<() => void>(() => {});
  const [mode, setModeState] = useState<Mode>("idle");
  const [draft, setDraftState] = useState<BubbleConfig>(DEFAULT_CONFIG);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const setMode = (next: Mode) => {
    modeRef.current = next;
    setModeState(next);
  };

  const setDraft = (next: BubbleConfig) => {
    draftRef.current = next;
    setDraftState(next);
  };

  // Placement mode brightens the grid points; redraw once when the mode changes.
  useEffect(() => {
    requestDrawRef.current();
  }, [mode]);

  useEffect(() => {
    // The whole interface is a fixed surface: no document scroll or rubber-banding.
    const targets = [document.documentElement, document.body];
    const previous = targets.map(({ style }) => [style.overflow, style.overscrollBehavior]);
    for (const { style } of targets) {
      style.overflow = "hidden";
      style.overscrollBehavior = "none";
    }
    return () => {
      targets.forEach(({ style }, index) => {
        [style.overflow, style.overscrollBehavior] = previous[index]!;
      });
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;

    const bubbles = new Map<number, Bubble>();
    const pointers = new Map<number, ActivePointer>();
    let view: View = { side: 0, cell: CELL_MIN * GRID_SCALE, ratio: 1 };
    let dots: HTMLCanvasElement | null = null;
    let placingDots: HTMLCanvasElement | null = null;
    let nextId = 1;
    let frame: number | null = null;
    let previousTime = performance.now();

    const touchesPath = (bubble: Bubble, path: readonly Point[]) => {
      const cx = pointAt(view, bubble.column);
      const cy = pointAt(view, bubble.row);
      const reach = Math.max(MIN_FINGER_RADIUS, bubbleRadius(bubble, view.cell) + FINGER_SLOP);
      const reachSquared = reach * reach;
      for (let index = 0; index < path.length; index += 1) {
        const to = path[index]!;
        const from = path[index - 1] ?? to;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const lengthSquared = dx * dx + dy * dy;
        const along = lengthSquared > 0
          ? Math.max(0, Math.min(1, ((cx - from.x) * dx + (cy - from.y) * dy) / lengthSquared))
          : 0;
        const ox = cx - (from.x + along * dx);
        const oy = cy - (from.y + along * dy);
        if (ox * ox + oy * oy <= reachSquared) return true;
      }
      return false;
    };

    const draw = () => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const layer = modeRef.current === "placing" ? placingDots : dots;
      if (layer) context.drawImage(layer, 0, 0);
      context.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
      if (view.side > 0) drawBubbles(context, view, bubbles.values());
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(render);
    };

    const render = (time: number) => {
      frame = null;
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const ease = 1 - Math.exp(-EASE_PER_SECOND * deltaSeconds);

      for (const bubble of bubbles.values()) {
        let touched = false;
        for (const pointer of pointers.values()) {
          if (touchesPath(bubble, pointer.path)) {
            touched = true;
            break;
          }
        }
        bubble.scale = Math.min(
          SCALE_MAX,
          Math.max(0, bubble.scale + (touched ? GROWTH_PER_SECOND : -DECAY_PER_SECOND) * deltaSeconds),
        );
        bubble.shown += (bubble.scale - bubble.shown) * ease;
        if (bubble.scale <= 0 && bubble.shown <= 0.01) bubbles.delete(bubble.id);
      }

      for (const pointer of pointers.values()) pointer.path = pointer.path.slice(-1);

      draw();
      if (bubbles.size > 0 || pointers.size > 0) schedule();
    };

    requestDrawRef.current = () => {
      if (frame === null) draw();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0) return;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      view = { side: bounds.width, cell: cellForSide(bounds.width), ratio };
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = canvas.width;
      dots = renderDots(view, 0.5);
      placingDots = renderDots(view, 1);
      draw();
    };

    const localPoint = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const place = (point: Point) => {
      const id = nextId;
      nextId += 1;
      bubbles.set(id, {
        ...draftRef.current,
        id,
        column: snapIndex(point.x, view),
        row: snapIndex(point.y, view),
        scale: 1,
        shown: 0,
      });
      modeRef.current = "idle";
      setModeState("idle");
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const point = localPoint(event, canvas.getBoundingClientRect());
      if (bubbles.size === 0 && pointers.size === 0) previousTime = performance.now();
      if (modeRef.current === "placing") place(point);
      pointers.set(event.pointerId, { path: [point] });
      schedule();
    };

    const onMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      for (const sample of samples.length > 0 ? samples : [event]) {
        pointer.path.push(localPoint(sample, bounds));
      }
    };

    const onEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    const onBlur = () => pointers.clear();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    canvas.addEventListener("lostpointercapture", onEnd);
    window.addEventListener("blur", onBlur);
    resize();

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("lostpointercapture", onEnd);
      window.removeEventListener("blur", onBlur);
      if (frame !== null) window.cancelAnimationFrame(frame);
      requestDrawRef.current = () => {};
    };
  }, []);

  const configuring = mode === "configuring";

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.map}
          aria-label={
            mode === "placing"
              ? "Map. Tap a point to place the keyword."
              : "Map. Skate a finger over a bubble to grow it and extend its life."
          }
        />

        <div className={styles.dock}>
          {mode === "placing" ? (
            <p className={styles.hint} role="status">
              tap a point on the map
            </p>
          ) : (
            <button
              type="button"
              className={styles.addButton}
              aria-label="New keyword"
              onClick={() => {
                setDraft(DEFAULT_CONFIG);
                setMode("configuring");
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <div
        className={styles.backdrop}
        data-open={configuring || undefined}
        inert={!configuring}
        aria-hidden={!configuring}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          blurActiveElement();
          setMode("idle");
        }}
      >
        <section
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="New keyword"
          style={{ "--keyboard-inset": `${keyboardInset}px` } as CSSProperties}
        >
          <label className={styles.row}>
            <span className={styles.rowLabel}>name</span>
            <input
              className={styles.textInput}
              type="text"
              value={draft.name}
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => setDraft({ ...draftRef.current, name: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </label>
          <SliderRow
            label="size"
            value={draft.size}
            display={draft.size.toFixed(1)}
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            step={SIZE_RANGE.step}
            onChange={(size) => setDraft({ ...draftRef.current, size })}
          />
          <SliderRow
            label="weight"
            value={draft.weight}
            display={`${Math.round(draft.weight * 100)}%`}
            min={0}
            max={1}
            step={0.01}
            onChange={(weight) => setDraft({ ...draftRef.current, weight })}
          />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              blurActiveElement();
              setMode("placing");
            }}
          >
            place on map
          </button>
        </section>
      </div>
    </main>
  );
}
