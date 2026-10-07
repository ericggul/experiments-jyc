"use client";

import { useEffect, useRef } from "react";
import { CENTER, forkFor } from "./model/fork";
import { createSignTree, layoutSignTree } from "./model/tree";
import styles from "./screen/direction-fractal.module.css";

/** Archive instruction-sign blue; white sheeting is slightly warm. */
const BLUE = "#1e50a3";
const WHITE = "#f5f5f1";
const RIM = "#8b9196";
/** Pointer straight up or down would fold the tree onto itself. */
const MIN_SPREAD = (20 * Math.PI) / 180;
const MAX_SPREAD = (160 * Math.PI) / 180;
const FOLLOW = 9;
const DEAD_ZONE = 6;
/** Below this radius (px) a sign is drawn as a plain disc. */
const ARROW_MIN_PX = 4;
const MAX_DPR = 2;

export default function RoadSignDirectionFractal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tree = createSignTree();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let target = Math.PI / 2;
    let shown = target;
    let frame = 0;
    let last = 0;

    const draw = () => {
      const fork = forkFor(shown);
      const shafts = new Path2D(fork.shafts);
      const heads = new Path2D(fork.heads);
      layoutSignTree(tree, width, height, shown);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineCap = "butt";
      // Deepest first, so every parent sits over its children.
      for (let i = tree.count - 1; i >= 0; i -= 1) {
        const radius = tree.radius[i];
        const scale = (radius / CENTER) * dpr;
        const cos = Math.cos(tree.heading[i]) * scale;
        const sin = Math.sin(tree.heading[i]) * scale;
        const x = tree.x[i] * dpr;
        const y = tree.y[i] * dpr;
        context.setTransform(cos, sin, -sin, cos, x - CENTER * (cos - sin), y - CENTER * (sin + cos));
        if (radius < ARROW_MIN_PX) {
          context.fillStyle = BLUE;
          context.beginPath();
          context.arc(CENTER, CENTER, CENTER, 0, Math.PI * 2);
          context.fill();
          continue;
        }
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
        context.lineWidth = fork.width;
        context.strokeStyle = WHITE;
        context.stroke(shafts);
        context.fillStyle = WHITE;
        context.fill(heads);
      }
    };

    const step = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
      last = time;
      shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-FOLLOW * dt));
      if (Math.abs(target - shown) < 1e-4) shown = target;
      draw();
      frame = shown === target ? 0 : requestAnimationFrame(step);
      if (!frame) last = 0;
    };

    const resize = () => {
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };

    const onPointer = (event: PointerEvent) => {
      const dx = event.clientX - width / 2;
      const dy = event.clientY - height / 2;
      if (Math.hypot(dx, dy) <= DEAD_ZONE) return;
      // Straight ahead is up; the pointer's angle off it, either side, is the turn.
      const angle = Math.abs(Math.atan2(dx, -dy));
      target = Math.min(MAX_SPREAD, Math.max(MIN_SPREAD, angle));
      if (!frame) frame = requestAnimationFrame(step);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <main className={styles.stage}>
    <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="직진, 좌회전, 우회전 지시표지가 재귀적으로 갈라지는 프랙털" />
  </main>;
}
