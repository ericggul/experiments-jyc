"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./recursive-clock.module.css";
import {
  CLOCK_HANDS,
  CLOCK_RECURSION_DEPTH,
  DEFAULT_CHILD_RADIUS_RATIO,
  MAX_CHILD_RADIUS_RATIO,
  MIN_CHILD_RADIUS_RATIO,
  SIMULATED_SECONDS_PER_SECOND,
  localClockSeconds,
  rootClockRadiusForViewport,
  type Point,
} from "./model";
import {
  aimMinutes,
  applyStroke,
  createClockField,
  createClockStructure,
  layoutClockField,
  resizeClockFieldDepth,
  stepClockField,
  type ClockField,
} from "./model/skating";

const MAX_INTERACTIVE_RECURSION_DEPTH = 6;
const PERFORMANCE_REPORT_MS = 500;

const HAND_COLOURS = ["#d2a64c", "#f0eadf", "#c96a58"] as const;
const HAND_WIDTH_RATIO = [0.035, 0.023, 0.012] as const;

/** One clock face: rim, then quarter ticks, then fainter hour ticks (ticks never overlap, so batching them is lossless). */
function drawClockFace(context: CanvasRenderingContext2D, field: ClockField, index: number) {
  const x = field.x[index]!;
  const y = field.y[index]!;
  const radius = field.radius[index]!;
  const opacity = Math.max(0.22, 0.72 - field.structure.depth[index]! * 0.1);
  const rimWidth = Math.max(0.55, Math.min(1.35, radius * 0.008));

  context.globalAlpha = opacity;
  context.lineWidth = rimWidth;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();

  if (radius < 18) return;
  context.beginPath();
  for (let tick = 0; tick < 12; tick += 3) addTick(context, x, y, radius, tick, radius * 0.1, rimWidth);
  context.stroke();

  context.globalAlpha = opacity * 0.72;
  context.lineWidth = Math.max(0.45, rimWidth * 0.7);
  context.beginPath();
  for (let tick = 1; tick < 12; tick += 1) {
    if (tick % 3 !== 0) addTick(context, x, y, radius, tick, radius * 0.06, rimWidth);
  }
  context.stroke();
}

function addTick(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  tick: number,
  length: number,
  rimWidth: number,
) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * tick) / 12;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  context.moveTo(x + cos * (radius - length), y + sin * (radius - length));
  context.lineTo(x + cos * (radius - rimWidth), y + sin * (radius - rimWidth));
}

function drawClockHands(context: CanvasRenderingContext2D, field: ClockField, index: number) {
  const x = field.x[index]!;
  const y = field.y[index]!;
  const radius = field.radius[index]!;
  context.globalAlpha = Math.max(0.32, 0.96 - field.structure.depth[index]! * 0.1);

  for (let hand = 0; hand < 3; hand += 1) {
    const angle = field.angle[index * 3 + hand]!;
    const length = radius * CLOCK_HANDS[hand as 0 | 1 | 2].length;
    context.strokeStyle = HAND_COLOURS[hand]!;
    context.lineWidth = Math.max(0.55, Math.min(3.4, radius * HAND_WIDTH_RATIO[hand]!));
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }

  context.beginPath();
  context.arc(x, y, Math.max(0.8, Math.min(2.8, radius * 0.02)), 0, Math.PI * 2);
  context.fill();
}

function drawClockField(
  context: CanvasRenderingContext2D,
  field: ClockField,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  context.save();
  context.strokeStyle = "#e7dfd2";
  context.lineCap = "butt";
  for (let index = field.structure.count - 1; index >= 0; index -= 1) {
    drawClockFace(context, field, index);
  }
  context.lineCap = "round";
  context.fillStyle = "#f0eadf";
  for (let index = 0; index < field.structure.count; index += 1) {
    drawClockHands(context, field, index);
  }
  context.restore();
}

function recordClockTraces(
  context: CanvasRenderingContext2D,
  field: ClockField,
  previousCenters: Map<string, Point>,
) {
  const { structure, x, y, radius } = field;
  context.save();
  context.lineCap = "round";

  for (let index = 1; index < structure.count; index += 1) {
    const key = structure.keys[index]!;
    const previousCenter = previousCenters.get(key);
    if (previousCenter) {
      context.strokeStyle = HAND_COLOURS[structure.hand[index]!]!;
      context.globalAlpha = Math.max(0.018, 0.1 - structure.depth[index]! * 0.014);
      context.lineWidth = Math.max(0.45, Math.min(1.25, radius[index]! * 0.009));
      context.beginPath();
      context.moveTo(previousCenter.x, previousCenter.y);
      context.lineTo(x[index]!, y[index]!);
      context.stroke();
    }
    previousCenters.set(key, { x: x[index]!, y: y[index]! });
  }
  context.restore();
}

export default function RecursiveClockOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const performanceRef = useRef<HTMLPreElement>(null);
  const ratioRef = useRef(DEFAULT_CHILD_RADIUS_RATIO);
  const recursionDepthRef = useRef(CLOCK_RECURSION_DEPTH);
  const traceEnabledRef = useRef(false);
  const paintRef = useRef<(() => void) | null>(null);
  const clearTraceRef = useRef<(() => void) | null>(null);
  const setDepthRef = useRef<((depth: number) => void) | null>(null);
  const setSkatingRef = useRef<((enabled: boolean) => void) | null>(null);
  const [childRadiusRatio, setChildRadiusRatio] = useState(
    DEFAULT_CHILD_RADIUS_RATIO,
  );
  const [recursionDepth, setRecursionDepth] = useState(CLOCK_RECURSION_DEPTH);
  const [traceEnabled, setTraceEnabled] = useState(false);
  const [skateEnabled, setSkateEnabled] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);

  useEffect(() => {
    ratioRef.current = childRadiusRatio;
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [childRadiusRatio]);

  useEffect(() => {
    recursionDepthRef.current = recursionDepth;
    setDepthRef.current?.(recursionDepth);
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [recursionDepth]);

  useEffect(() => {
    traceEnabledRef.current = traceEnabled;
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [traceEnabled]);

  useEffect(() => {
    setSkatingRef.current?.(skateEnabled);
  }, [skateEnabled]);

  useEffect(() => {
    const field = fieldRef.current;
    const traceCanvas = traceCanvasRef.current;
    const canvas = canvasRef.current;
    if (!field || !traceCanvas || !canvas) return;
    const traceContext = traceCanvas.getContext("2d");
    const context = canvas.getContext("2d");
    if (!traceContext || !context) return;

    let viewport = { width: 0, height: 0 };
    let clocks = createClockField(createClockStructure(recursionDepthRef.current));
    let frameId: number | null = null;
    let elapsedSeconds = localClockSeconds(new Date());
    let previousFrame = performance.now();
    const pointers = new Map<number, Point>();
    const previousTraceCenters = new Map<string, Point>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Opt-in `?perf=1` readout of actual device frame cost.
    const performanceOutput = new URLSearchParams(window.location.search).has("perf")
      ? performanceRef.current
      : null;
    if (performanceOutput) setShowPerformance(true);
    const workSamples: number[] = [];
    const intervalSamples: number[] = [];
    let lastReport = performance.now();
    const reportPerformance = (now: number, work: number, interval: number) => {
      if (!performanceOutput) return;
      workSamples.push(work);
      if (interval > 0) intervalSamples.push(interval);
      if (now - lastReport < PERFORMANCE_REPORT_MS) return;
      const sorted = [...workSamples].sort((a, b) => a - b);
      const meanInterval =
        intervalSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, intervalSamples.length);
      performanceOutput.textContent = [
        `clocks ${clocks.structure.count}`,
        `fps ${meanInterval > 0 ? (1000 / meanInterval).toFixed(0) : "–"}`,
        `frame work ${(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(2)} ms median`,
        `           ${(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(2)} ms p95`,
        `fingers ${pointers.size}`,
      ].join("\n");
      workSamples.length = 0;
      intervalSamples.length = 0;
      lastReport = now;
    };

    const clearTrace = () => {
      traceContext.clearRect(0, 0, viewport.width, viewport.height);
      previousTraceCenters.clear();
    };

    const layout = () => {
      layoutClockField(clocks, {
        center: { x: viewport.width / 2, y: viewport.height / 2 },
        rootRadius: rootClockRadiusForViewport(viewport.width, viewport.height),
        childRadiusRatio: ratioRef.current,
        elapsedSeconds,
      });
    };

    const paint = () => {
      if (viewport.width === 0 || viewport.height === 0) return;
      layout();
      if (traceEnabledRef.current) {
        recordClockTraces(traceContext, clocks, previousTraceCenters);
      }
      drawClockField(context, clocks, viewport.width, viewport.height);
    };

    const animate = (time: number) => {
      frameId = null;
      const workStart = performance.now();
      const interval = time - previousFrame;
      const seconds = interval / 1000;
      previousFrame = time;
      if (!reducedMotion.matches) elapsedSeconds += seconds * SIMULATED_SECONDS_PER_SECOND;
      if (pointers.size > 0) aimMinutes(clocks, [...pointers.values()], elapsedSeconds);
      const moving = stepClockField(clocks, seconds);
      paint();
      reportPerformance(time, performance.now() - workStart, interval);
      if (!reducedMotion.matches || moving || pointers.size > 0) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const schedule = () => {
      if (frameId !== null) return;
      previousFrame = performance.now();
      frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      viewport = { width: bounds.width, height: bounds.height };
      const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
      traceCanvas.width = Math.round(bounds.width * deviceRatio);
      traceCanvas.height = Math.round(bounds.height * deviceRatio);
      canvas.width = Math.round(bounds.width * deviceRatio);
      canvas.height = Math.round(bounds.height * deviceRatio);
      traceContext.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      pointers.clear();
      clearTrace();
      paint();
    };

    const handleMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      paint();
      if (!reducedMotion.matches) schedule();
    };

    const point = (event: PointerEvent, bounds: DOMRect): Point => ({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, point(event, canvas.getBoundingClientRect()));
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const bounds = canvas.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [];
      let from = previous;
      for (const sample of [...samples, event]) {
        const to = point(sample, bounds);
        if (Math.hypot(to.x - from.x, to.y - from.y) < 0.5) continue;
        applyStroke(clocks, from, to, elapsedSeconds);
        from = to;
      }
      pointers.set(event.pointerId, from);
      schedule();
    };
    const onUp = (event: PointerEvent) => {
      onMove(event);
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const onCancel = (event: PointerEvent) => pointers.delete(event.pointerId);
    const onBlur = () => pointers.clear();

    setSkatingRef.current = (enabled) => {
      if (enabled) return;
      // Leaving skate mode returns every clock to its clock/1 time.
      pointers.clear();
      clocks.offsetTarget.fill(0);
      schedule();
    };
    paintRef.current = () => {
      paint();
      schedule();
    };
    clearTraceRef.current = clearTrace;
    setDepthRef.current = (depth) => {
      if (depth !== clocks.structure.depthLimit) clocks = resizeClockFieldDepth(clocks, depth);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    reducedMotion.addEventListener("change", handleMotionPreference);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("blur", onBlur);
    resize();
    if (!reducedMotion.matches) schedule();

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel);
      window.removeEventListener("blur", onBlur);
      if (frameId !== null) cancelAnimationFrame(frameId);
      paintRef.current = null;
      clearTraceRef.current = null;
      setDepthRef.current = null;
      setSkatingRef.current = null;
    };
  }, []);

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={traceCanvasRef}
        className={styles.traceCanvas}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${skateEnabled ? styles.skating : ""}`}
        role="img"
        aria-label={
          skateEnabled
            ? "Drag through the recursive clocks: hour hands keep the direction you left each clock, minute hands follow your finger"
            : "Recursive analogue clocks held at the tips of parent hands"
        }
      />
      <pre ref={performanceRef} className={styles.performance} hidden={!showPerformance} />
      <div className={styles.controlDock}>
        <div
          id="clock-controls"
          className={styles.controlPanel}
          hidden={!controlsExpanded}
        >
          <label className={styles.parameter} htmlFor="clock-radius-ratio">
            <span>scale</span>
            <input
              id="clock-radius-ratio"
              className={styles.slider}
              type="range"
              min={MIN_CHILD_RADIUS_RATIO}
              max={MAX_CHILD_RADIUS_RATIO}
              step="0.01"
              value={childRadiusRatio}
              onChange={(event) => setChildRadiusRatio(Number(event.target.value))}
            />
            <output htmlFor="clock-radius-ratio">
              {childRadiusRatio.toFixed(2)}
            </output>
          </label>
          <label className={styles.parameter} htmlFor="clock-recursion-depth">
            <span>depth</span>
            <input
              id="clock-recursion-depth"
              className={styles.slider}
              type="range"
              min="1"
              max={MAX_INTERACTIVE_RECURSION_DEPTH}
              step="1"
              value={recursionDepth}
              onChange={(event) => setRecursionDepth(Number(event.target.value))}
            />
            <output htmlFor="clock-recursion-depth">{recursionDepth}</output>
          </label>
          <button
            className={styles.traceButton}
            type="button"
            aria-pressed={traceEnabled}
            onClick={() => setTraceEnabled((current) => !current)}
          >
            trace {traceEnabled ? "on" : "off"}
          </button>
          <button
            className={styles.traceButton}
            type="button"
            aria-pressed={skateEnabled}
            onClick={() => setSkateEnabled((current) => !current)}
          >
            skate {skateEnabled ? "on" : "off"}
          </button>
        </div>
        <button
          className={styles.expandButton}
          type="button"
          aria-controls="clock-controls"
          aria-expanded={controlsExpanded}
          onClick={() => setControlsExpanded((current) => !current)}
        >
          {controlsExpanded ? "collapse" : "expand"}
        </button>
      </div>
    </main>
  );
}
