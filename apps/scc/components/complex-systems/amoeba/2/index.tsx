"use client";

import { useEffect, useRef } from "react";
import styles from "./amoeba.module.css";
import {
  NEWBORN_RADIUS,
  TICKS_PER_SECOND,
  clearance,
  defaultParameters,
  insideZone,
  createColony,
  findEmptyPoint,
  spawnCell,
  stepColony,
} from "./model";
import { createAmoebaRenderer } from "./rendering";
import { QUALITY_LEVELS, createPacer, pace } from "./rendering/pacing";

const SEED = 7;
const TICK_MS = 1000 / TICKS_PER_SECOND;
// A late frame catches up at most this many model ticks, so one slow frame
// never turns into a burst of simulation work on the next.
const MAX_TICKS_PER_FRAME = 2;

export default function AmoebaTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The zone takes the screen's shape when it is created, within sane bounds.
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const halfWidth = Math.min(3, Math.max(0.5, aspect));
    const colony = createColony(SEED, defaultParameters, [[0, 0]], halfWidth);
    const renderer = createAmoebaRenderer(canvas, halfWidth);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let carried = 0;
    let pacer = createPacer();
    let lastDraw = 0;

    // A still frame (first paint, resize, a click while paused) settles bodies fully.
    const draw = (alpha: number, settle = false) => {
      const now = performance.now();
      const dt = settle || !lastDraw ? 2 : (now - lastDraw) / 1000;
      lastDraw = now;
      renderer.render(colony, alpha, now / 1000, dt);
    };
    const resize = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
      draw(1, !frame);
    };

    // Renders on display vsyncs (no 24 fps judder); the model keeps its fixed
    // tick rate and the spring bodies interpolate between ticks.
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const { render, elapsed, changed } = pace(pacer, now);
      if (changed) renderer.setQuality(QUALITY_LEVELS[pacer.level].scale);
      if (!render) return;
      carried += Math.min(elapsed, TICK_MS * MAX_TICKS_PER_FRAME);
      while (carried >= TICK_MS) {
        stepColony(colony);
        carried -= TICK_MS;
      }
      draw(carried / TICK_MS);
    };

    const start = () => {
      if (frame || motion.matches || document.hidden) return;
      carried = 0;
      pacer = { ...createPacer(), level: pacer.level, refresh: pacer.refresh };
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const syncRunning = () => (motion.matches || document.hidden ? stop() : start());

    const place = (x: number, y: number) => {
      if (spawnCell(colony, x, y) && !frame) draw(1, true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      place(...renderer.toWorld(event.clientX - rect.left, event.clientY - rect.top));
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const [x, y] = renderer.toWorld(event.clientX - rect.left, event.clientY - rect.top);
      const free = insideZone(colony, x, y, NEWBORN_RADIUS) && clearance(colony, x, y) >= NEWBORN_RADIUS;
      canvas.style.cursor = free ? "crosshair" : "default";
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      place(...findEmptyPoint(colony));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    syncRunning();
    motion.addEventListener("change", syncRunning);
    document.addEventListener("visibilitychange", syncRunning);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("keydown", onKeyDown);

    return () => {
      stop();
      observer.disconnect();
      motion.removeEventListener("change", syncRunning);
      document.removeEventListener("visibilitychange", syncRunning);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("keydown", onKeyDown);
      renderer.dispose();
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="Amoebae of very different sizes eating a bacterial lawn across the whole screen. Click empty medium, or press Enter, to place a new founder cell."
      />
    </main>
  );
}
