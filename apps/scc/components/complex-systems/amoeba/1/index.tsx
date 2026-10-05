"use client";

import { useEffect, useRef } from "react";
import styles from "./amoeba.module.css";
import {
  NEWBORN_RADIUS,
  TICKS_PER_SECOND,
  clearance,
  createColony,
  findEmptyPoint,
  spawnCell,
  stepColony,
} from "./model";
import { createAmoebaRenderer } from "./rendering";

const SEED = 7;
const FRAME_MS = 1000 / 24;
const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_TICKS_PER_FRAME = 4;

export default function AmoebaOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colony = createColony(SEED);
    const renderer = createAmoebaRenderer(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;
    let carried = 0;

    const draw = (alpha: number) => renderer.render(colony, alpha, performance.now() / 1000);
    const resize = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
      draw(1);
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - lastFrame < FRAME_MS) return;
      carried += lastFrame ? Math.min(now - lastFrame, TICK_MS * MAX_TICKS_PER_FRAME) : 0;
      lastFrame = now;
      while (carried >= TICK_MS) {
        stepColony(colony);
        carried -= TICK_MS;
      }
      draw(carried / TICK_MS);
    };

    const start = () => {
      if (frame || motion.matches || document.hidden) return;
      lastFrame = 0;
      carried = 0;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const syncRunning = () => (motion.matches || document.hidden ? stop() : start());

    const place = (x: number, y: number) => {
      if (spawnCell(colony, x, y) && !frame) draw(1);
    };
    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      place(...renderer.toWorld(event.clientX - rect.left, event.clientY - rect.top));
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const [x, y] = renderer.toWorld(event.clientX - rect.left, event.clientY - rect.top);
      const free = Math.hypot(x, y) < 1 - NEWBORN_RADIUS && clearance(colony, x, y) >= NEWBORN_RADIUS;
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
        aria-label="A dish of amoebae eating a bacterial lawn. Click empty medium, or press Enter, to place a new founder cell."
      />
    </main>
  );
}
