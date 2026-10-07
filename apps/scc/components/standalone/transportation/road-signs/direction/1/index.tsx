"use client";

import { useEffect, useRef } from "react";
import { arrowFor } from "./model/arrow";
import styles from "./screen/direction.module.css";

/** Blue of the archive palette; white sheeting is slightly warm, as in daylight. */
const BLUE = "#1e50a3";
const WHITE = "#f5f5f1";
/** How quickly the shown heading follows the pointer, per second. */
const FOLLOW = 11;
/** Pointer distance from the sign centre, in px, below which the heading holds. */
const DEAD_ZONE = 6;

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export default function RoadSignDirection() {
  const signRef = useRef<HTMLDivElement>(null);
  const shaftRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const sign = signRef.current;
    const shaft = shaftRef.current;
    const head = headRef.current;
    if (!sign || !shaft || !head) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let shown = 0;
    let frame = 0;
    let last = 0;

    const draw = () => {
      const arrow = arrowFor(wrap(shown));
      shaft.setAttribute("d", arrow.shaft);
      shaft.setAttribute("stroke-width", arrow.width.toFixed(2));
      head.setAttribute("d", arrow.head);
    };

    const step = (time: number) => {
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
      last = time;
      const k = reduced ? 1 : 1 - Math.exp(-FOLLOW * dt);
      const gap = wrap(target - shown);
      shown += gap * k;
      draw();
      const settled = Math.abs(wrap(target - shown)) < 1e-4;
      frame = settled ? 0 : requestAnimationFrame(step);
      if (settled) last = 0;
    };

    const onPointer = (event: PointerEvent) => {
      const box = sign.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      // Straight ahead is up; angles run clockwise through the full circle.
      if (Math.hypot(dx, dy) > DEAD_ZONE) target = shown + wrap(Math.atan2(dx, -dy) - shown);
      if (!frame) frame = requestAnimationFrame(step);
    };

    draw();
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <main className={styles.stage}>
    <div className={styles.pole} aria-hidden />
    <div className={styles.shade} aria-hidden />
    <div ref={signRef} className={styles.sign} role="img" aria-label="진행 방향 지시표지">
      <svg className={styles.layer} viewBox="0 0 1000 1000" aria-hidden>
        <defs>
          <radialGradient id="direction-rim" cx="38%" cy="30%" r="75%">
            <stop offset="0" stopColor="#e9ecee" />
            <stop offset="0.55" stopColor="#a9afb4" />
            <stop offset="1" stopColor="#6c7277" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="500" fill="url(#direction-rim)" />
        <circle cx="500" cy="500" r="496" fill={WHITE} />
        <circle cx="500" cy="500" r="470" fill={BLUE} />
      </svg>
      <svg className={styles.layer} viewBox="0 0 1000 1000" aria-hidden>
        <path ref={shaftRef} fill="none" stroke={WHITE} />
        <path ref={headRef} fill={WHITE} />
      </svg>
      <Shading />
    </div>
  </main>;
}

/** Even light falloff across the plate, top-left to bottom-right. */
function Shading() {
  return <svg className={`${styles.layer} ${styles.multiply}`} viewBox="0 0 1000 1000" aria-hidden>
    <defs>
      <linearGradient id="direction-falloff" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#c9cfd6" />
      </linearGradient>
    </defs>
    <circle cx="500" cy="500" r="496" fill="url(#direction-falloff)" />
  </svg>;
}
