"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./physarum-network.module.css";
import {
  addFood,
  busiestTube,
  createMould,
  cutTube,
  DEFAULT_PARAMETERS,
  EXPONENT_RANGE,
  farthestFromFood,
  LIVING,
  MAX_FOODS,
  MAX_JUNCTIONS,
  MAX_STEP,
  measureMould,
  moveFood,
  nearestJunction,
  removeFood,
  seedFood,
  stepMould,
  strokeAcross,
  tubesCrossing,
  type Mould,
} from "./model";

/** Model time units per second; a tube left without flow thins out in about 2 s. */
const TEMPO = 1.5;
const INK = "17, 17, 15";
/** Protoplasm: the food and the flow it drives share one colour. */
const FLOW = "226, 150, 0";
const MARK_LIFETIME = 0.8;
const MAX_MARKS = 240;
/** At most this many pressure solves per frame, so a stalled tab cannot pile up work. */
const MAX_SOLVES_PER_FRAME = 3;
/** Screen area per junction; the sheet is denser on large screens up to the cap. */
const AREA_PER_JUNCTION = 1_700;
const MIN_JUNCTIONS = 200;
const SHEET_MARGIN = 20;
const DRAG_THRESHOLD = 6;
const WIDTH_LEVELS = 14;
/** Space kept clear for the collapsed options toggle. */
const CONTROL_BAND = 56;

type Frame = { width: number; height: number };

type Placement = { scale: number; left: number; top: number };

type Mark =
  | { kind: "cut"; a: number; b: number; width: number; at: number }
  | { kind: "food"; junction: number; added: boolean; at: number };

type Gesture = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  /** The food being carried, or null when the gesture started on bare sheet. */
  food: number | null;
  moved: boolean;
};

function layoutFrame(size: Frame): Frame {
  return { width: size.width, height: Math.max(size.height * 0.5, size.height - CONTROL_BAND) };
}

function placementFor(mould: Mould, field: Frame): Placement {
  const scale = Math.max(
    1,
    Math.min((field.width - SHEET_MARGIN * 2) / mould.width, (field.height - SHEET_MARGIN * 2) / mould.height),
  );
  return {
    scale,
    left: (field.width - mould.width * scale) / 2,
    top: (field.height - mould.height * scale) / 2,
  };
}

function mouldFor(field: Frame) {
  const inner = { width: field.width - SHEET_MARGIN * 2, height: field.height - SHEET_MARGIN * 2 };
  const junctions = Math.round(
    Math.min(MAX_JUNCTIONS, Math.max(MIN_JUNCTIONS, (inner.width * inner.height) / AREA_PER_JUNCTION)),
  );
  const mould = createMould(junctions, Math.max(0.3, inner.width / Math.max(1, inner.height)));
  seedFood(mould);
  return mould;
}

function foodRadius(place: Placement) {
  return Math.max(5, place.scale * 0.17);
}

function draw(
  context: CanvasRenderingContext2D,
  size: Frame,
  mould: Mould,
  place: Placement,
  decay: number,
  marks: readonly Mark[],
  time: number,
) {
  context.clearRect(0, 0, size.width, size.height);
  context.lineCap = "round";
  const { scale, left, top } = place;
  const px = (node: number) => left + mould.x[node]! * scale;
  const py = (node: number) => top + mould.y[node]! * scale;
  const widest = scale * 0.2;

  // The bare sheet: every intact tube as a hairline, so cuts read as gaps.
  context.strokeStyle = `rgba(${INK}, 0.07)`;
  context.lineWidth = 0.6;
  context.beginPath();
  for (const tube of mould.tubes) {
    if (tube.cutUntil !== null) continue;
    context.moveTo(px(tube.a), py(tube.a));
    context.lineTo(px(tube.b), py(tube.b));
  }
  context.stroke();

  // Tube walls in ink, width ∝ √D, batched into width levels. Thin tubes fade
  // out as they fall below the living threshold.
  const levels: number[][] = Array.from({ length: WIDTH_LEVELS }, () => []);
  for (const tube of mould.tubes) {
    if (tube.cutUntil !== null) continue;
    const root = Math.sqrt(tube.conductance);
    if (root < 0.04) continue;
    levels[Math.min(WIDTH_LEVELS - 1, Math.floor(root * WIDTH_LEVELS))]!.push(tube.id);
  }
  levels.forEach((ids, level) => {
    if (ids.length === 0) return;
    const root = (level + 0.5) / WIDTH_LEVELS;
    context.strokeStyle = `rgba(${INK}, ${0.88 * Math.min(1, root / Math.sqrt(LIVING * 2))})`;
    context.lineWidth = 0.6 + widest * root;
    context.beginPath();
    for (const id of ids) {
      const tube = mould.tubes[id]!;
      context.moveTo(px(tube.a), py(tube.a));
      context.lineTo(px(tube.b), py(tube.b));
    }
    context.stroke();
  });

  // The flow inside each tube: width ∝ √(drive / γ), the thickness the flow is
  // asking for, drawn at 55% so a settled tube shows an ink rim around it. A
  // core wider than its wall is a tube still thickening; a bare wall is
  // starving.
  const cores: number[][] = Array.from({ length: WIDTH_LEVELS }, () => []);
  for (const tube of mould.tubes) {
    if (tube.cutUntil !== null) continue;
    const root = Math.sqrt(Math.min(1, tube.drive / decay));
    if (root * widest * 0.55 < 0.5) continue;
    cores[Math.min(WIDTH_LEVELS - 1, Math.floor(root * WIDTH_LEVELS))]!.push(tube.id);
  }
  context.strokeStyle = `rgba(${FLOW}, 0.95)`;
  cores.forEach((ids, level) => {
    if (ids.length === 0) return;
    context.lineWidth = widest * 0.55 * ((level + 0.5) / WIDTH_LEVELS);
    context.beginPath();
    for (const id of ids) {
      const tube = mould.tubes[id]!;
      context.moveTo(px(tube.a), py(tube.a));
      context.lineTo(px(tube.b), py(tube.b));
    }
    context.stroke();
  });

  for (const mark of marks) {
    const progress = (time - mark.at) / MARK_LIFETIME;
    if (progress < 0 || progress >= 1) continue;
    const fade = 1 - progress;
    if (mark.kind === "cut") {
      // The two severed ends pull back from the cut.
      const ax = px(mark.a);
      const ay = py(mark.a);
      const bx = px(mark.b);
      const by = py(mark.b);
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const reach = 1 - Math.min(1, progress * 1.4);
      context.strokeStyle = `rgba(${INK}, ${0.8 * fade})`;
      context.lineWidth = mark.width;
      context.beginPath();
      context.moveTo(ax, ay);
      context.lineTo(ax + (mx - ax) * reach * 0.85, ay + (my - ay) * reach * 0.85);
      context.moveTo(bx, by);
      context.lineTo(bx + (mx - bx) * reach * 0.85, by + (my - by) * reach * 0.85);
      context.stroke();
    } else {
      const radius = foodRadius(place);
      const spread = mark.added ? radius + progress * radius * 2.4 : radius * (1 + 2.4 * fade);
      context.strokeStyle = `rgba(${FLOW}, ${0.8 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(px(mark.junction), py(mark.junction), spread, 0, Math.PI * 2);
      context.stroke();
    }
  }

  context.fillStyle = `rgb(${FLOW})`;
  for (const food of mould.foods) {
    context.beginPath();
    context.arc(px(food), py(food), foodRadius(place), 0, Math.PI * 2);
    context.fill();
  }
}

export default function PhysarumNetworkFour() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouldRef = useRef<Mould | null>(null);
  const sizeRef = useRef<Frame>({ width: 0, height: 0 });
  const marksRef = useRef<Mark[]>([]);
  const timeRef = useRef(0);
  const pendingRef = useRef(0);
  const exponentRef = useRef(DEFAULT_PARAMETERS.exponent);
  const gestureRef = useRef<Gesture | null>(null);
  const reduceMotionRef = useRef(false);
  const [exponent, setExponent] = useState(DEFAULT_PARAMETERS.exponent);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    exponentRef.current = exponent;
  }, [exponent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let sinceSummary = 0;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(next.width * ratio);
      canvas.height = Math.round(next.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // The sheet is cut once for the first screen; later resizes only rescale it.
      if (!mouldRef.current && next.width > 0 && next.height > 0) {
        mouldRef.current = mouldFor(layoutFrame(next));
      }
      sizeRef.current = next;
    };

    const render = (now: number) => {
      const delta = Math.min((now - previous) / 1_000, 0.05);
      previous = now;
      reduceMotionRef.current = reduceMotion.matches;
      const tempo = reduceMotion.matches ? 0.3 : 1;
      timeRef.current += delta;
      const mould = mouldRef.current;
      if (mould) {
        // Whole solver steps only, so the cost is about TEMPO ÷ MAX_STEP solves a second.
        pendingRef.current = Math.min(
          pendingRef.current + delta * tempo * TEMPO,
          MAX_STEP * MAX_SOLVES_PER_FRAME,
        );
        const steps = Math.floor(pendingRef.current / MAX_STEP);
        if (steps > 0) {
          pendingRef.current -= steps * MAX_STEP;
          stepMould(mould, steps * MAX_STEP, { ...DEFAULT_PARAMETERS, exponent: exponentRef.current });
        }
        const fresh = marksRef.current.filter((mark) => timeRef.current - mark.at < MARK_LIFETIME);
        marksRef.current = fresh.slice(Math.max(0, fresh.length - MAX_MARKS));

        const size = sizeRef.current;
        const place = placementFor(mould, layoutFrame(size));
        draw(context, size, mould, place, DEFAULT_PARAMETERS.decay, marksRef.current, timeRef.current);

        sinceSummary += delta;
        if (sinceSummary > 2) {
          sinceSummary = 0;
          const measure = measureMould(mould);
          const foods = mould.foods.length;
          setSummary(
            foods < 2
              ? `${foods} food source${foods === 1 ? "" : "s"}; nothing flows, so the tubes are thinning away.`
              : `${foods} food sources${measure.connected ? " joined" : ", not yet all joined,"} by ${measure.living} living tubes with ${measure.loops} loops. ${Math.round(measure.fragile * 100)}% of those tubes would split the food apart if cut.`,
          );
        }
      }
      frame = requestAnimationFrame(render);
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const pushMark = useCallback((mark: Mark) => {
    if (!reduceMotionRef.current) marksRef.current.push(mark);
  }, []);

  /** Cuts tubes, each leaving a mark as thick as the tube was. */
  const sever = useCallback((mould: Mould, ids: readonly number[]) => {
    const place = placementFor(mould, layoutFrame(sizeRef.current));
    for (const id of ids) {
      const tube = mould.tubes[id]!;
      const width = 0.6 + place.scale * 0.2 * Math.sqrt(tube.conductance);
      if (cutTube(mould, id)) pushMark({ kind: "cut", a: tube.a, b: tube.b, width, at: timeRef.current });
    }
  }, [pushMark]);

  /** Screen point → sheet units. */
  const toSheet = (mould: Mould, x: number, y: number) => {
    const place = placementFor(mould, layoutFrame(sizeRef.current));
    return { x: (x - place.left) / place.scale, y: (y - place.top) / place.scale, place };
  };

  const placeFood = useCallback((mould: Mould, junction: number) => {
    if (addFood(mould, junction)) pushMark({ kind: "food", junction, added: true, at: timeRef.current });
  }, [pushMark]);

  const takeFood = useCallback((mould: Mould, junction: number) => {
    if (removeFood(mould, junction)) pushMark({ kind: "food", junction, added: false, at: timeRef.current });
  }, [pushMark]);

  const pointAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  // A press on food picks it up; a drag carries it, a tap removes it. A press
  // on bare sheet places food on a tap, and a drag cuts every tube it crosses.
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const mould = mouldRef.current;
    if (!mould || gestureRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = pointAt(event);
    const sheet = toSheet(mould, x, y);
    const reach = Math.max(18, sheet.place.scale * 0.5) / sheet.place.scale;
    let food: number | null = null;
    let best = reach * reach;
    for (const junction of mould.foods) {
      const distance = (mould.x[junction]! - sheet.x) ** 2 + (mould.y[junction]! - sheet.y) ** 2;
      if (distance <= best) {
        best = distance;
        food = junction;
      }
    }
    gestureRef.current = { id: event.pointerId, startX: x, startY: y, lastX: x, lastY: y, food, moved: false };
    setTouched(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const mould = mouldRef.current;
    const gesture = gestureRef.current;
    if (!mould || !gesture || gesture.id !== event.pointerId) return;
    const { x, y } = pointAt(event);
    if (!gesture.moved && Math.hypot(x - gesture.startX, y - gesture.startY) < DRAG_THRESHOLD) return;
    gesture.moved = true;
    const sheet = toSheet(mould, x, y);
    if (gesture.food !== null) {
      const target = nearestJunction(mould, sheet.x, sheet.y);
      if (moveFood(mould, gesture.food, target)) gesture.food = target;
    } else {
      const last = toSheet(mould, gesture.lastX, gesture.lastY);
      sever(mould, tubesCrossing(mould, last.x, last.y, sheet.x, sheet.y));
    }
    gesture.lastX = x;
    gesture.lastY = y;
  };

  const endGesture = (event: PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    const mould = mouldRef.current;
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    gestureRef.current = null;
    if (!mould || cancelled || gesture.moved) return;
    if (gesture.food !== null) {
      takeFood(mould, gesture.food);
      return;
    }
    const sheet = toSheet(mould, gesture.startX, gesture.startY);
    if (mould.foods.length < MAX_FOODS) placeFood(mould, nearestJunction(mould, sheet.x, sheet.y));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const mould = mouldRef.current;
    if (!mould) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (mould.foods.length < MAX_FOODS) placeFood(mould, farthestFromFood(mould));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      const newest = mould.foods.at(-1);
      if (newest !== undefined) takeFood(mould, newest);
    } else if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      const tube = busiestTube(mould);
      if (tube) sever(mould, strokeAcross(mould, tube));
    } else {
      return;
    }
    setTouched(true);
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-describedby="physarum-network-summary"
        aria-label="Slime-mould transport network. Amber dots are food; tubes thicken where protoplasm flows between food and thin away where it does not. Tap bare space to place food, tap food to remove it, drag food to move it, drag across tubes to cut them; cut tubes grow back after about half a minute. Press Enter to place food far from the rest, Delete to remove the newest food, X to cut across the busiest tube. The option below sets whether many parallel tubes or single paths survive."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endGesture(event, false)}
        onPointerCancel={(event) => endGesture(event, true)}
        onKeyDown={onKeyDown}
      />
      <p id="physarum-network-summary" className={styles.screenReaderOnly}>
        {summary}
      </p>

      <div className={styles.controls}>
        {!touched && !optionsOpen && (
          <p className={styles.hint}>누르면 먹이를 놓고, 그으면 관을 자릅니다</p>
        )}
        {optionsOpen && (
          <div id="physarum-network-options" className={styles.options}>
            <p className={styles.about}>
              먹이 사이로 원형질이 흐르고, 많이 흐르는 관은 굵어지며 적게 흐르는 관은 가늘어져
              사라집니다. 굵어진 관은 다음 흐름을 더 끌어오기 때문에, 흐름과 관의 굵기가 서로를
              바꾸며 먹이를 잇는 짧고도 끊김에 강한 그물을 남깁니다. 지수가 높으면 가장 센 길만,
              낮으면 여러 갈래가 함께 살아남습니다. (점균 수송망 모델, Tero·Kobayashi·Nakagaki 2007;
              Tero 외 2010)
            </p>
            <label className={styles.balance}>
              <span>여러 갈래</span>
              <input
                aria-label="센 흐름의 관만 남기는 정도 (흐름 지수)"
                aria-valuetext={`지수 ${exponent.toFixed(2)}`}
                max={EXPONENT_RANGE[1]}
                min={EXPONENT_RANGE[0]}
                step="0.01"
                type="range"
                value={exponent}
                onChange={(event) => setExponent(Number(event.target.value))}
              />
              <span>한 길</span>
            </label>
          </div>
        )}
        <button
          type="button"
          className={`${styles.control} ${styles.toggle}`}
          aria-expanded={optionsOpen}
          aria-controls="physarum-network-options"
          onClick={() => setOptionsOpen((open) => !open)}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </main>
  );
}
