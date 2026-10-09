"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  easeInOutCubic,
  frameAt,
  sceneStarts,
  totalDuration,
  type SceneFrame,
  type SceneSpec,
  type TimelineFrame,
} from "./timeline";
import styles from "./stage.module.css";

export * from "./timeline";

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

/**
 * Looping playback clock. Click pauses; ←/→ step between scene starts.
 */
export function useSpotClock<Id extends string>(scenes: readonly SceneSpec<Id>[]) {
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!paused.current) {
        elapsed.current = (elapsed.current + delta) % totalDuration(scenes);
        setTime(elapsed.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const starts = sceneStarts(scenes);
    const total = totalDuration(scenes);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        paused.current = !paused.current;
        event.preventDefault();
        return;
      }
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const now = elapsed.current;
      const index = starts.findLastIndex((start) => start <= now + 0.01);
      const target =
        event.key === "ArrowRight"
          ? starts[(index + 1) % starts.length]
          : now - starts[index] > 0.6
            ? starts[index]
            : starts[(index - 1 + starts.length) % starts.length];
      elapsed.current = ((target % total) + total) % total;
      setTime(elapsed.current);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [scenes]);

  return {
    frame: frameAt(scenes, time),
    togglePause: () => {
      paused.current = !paused.current;
    },
  };
}

/** A 1920×1080 broadcast frame scaled to fit the viewport, letterboxed in black. */
export function TvStage({
  children,
  className,
  label,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick?: () => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={styles.viewport} onClick={onClick}>
      <div
        role="img"
        aria-label={label}
        className={`${styles.frame} ${className ?? ""}`}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

const fill: CSSProperties = { position: "absolute", inset: 0 };

/** Renders the current scene, and during its enter transition the previous one beneath. */
export function SceneMixer<Id extends string>({
  frame,
  render,
}: {
  frame: TimelineFrame<Id>;
  render: (scene: SceneFrame<Id>) => ReactNode;
}) {
  const { current, previous, transition } = frame;
  const m = easeInOutCubic(frame.mix);
  if (!previous) {
    return <div key={current.id} style={fill}>{render(current)}</div>;
  }

  let under: CSSProperties = fill;
  let over: CSSProperties = fill;
  let flash = 0;
  switch (transition.kind) {
    case "dissolve":
      over = { ...fill, opacity: m };
      break;
    case "wipe":
      over = { ...fill, clipPath: `inset(0 ${(1 - m) * 100}% 0 0)` };
      break;
    case "iris":
      over = { ...fill, clipPath: `circle(${m * 120}% at 50% 50%)` };
      break;
    case "scan":
      over = { ...fill, clipPath: `inset(0 0 ${(1 - m) * 100}% 0)` };
      break;
    case "push":
      under = { ...fill, transform: `translateX(${-m * 100}%)` };
      over = { ...fill, transform: `translateX(${(1 - m) * 100}%)` };
      break;
    case "flash":
      over = { ...fill, opacity: frame.mix < 0.5 ? 0 : 1 };
      flash = 1 - Math.abs(frame.mix - 0.5) * 2;
      break;
    default:
      break;
  }

  return (
    <>
      <div key={previous.id} style={under}>{render(previous)}</div>
      <div key={current.id} style={over}>{render(current)}</div>
      {transition.kind === "scan" ? (
        <div className={styles.scanLine} style={{ top: `${m * 100}%` }} />
      ) : null}
      {flash > 0 ? <div style={{ ...fill, background: "#fff", opacity: flash }} /> : null}
    </>
  );
}

/** Slow camera move applied to a static plate: push-in and drift over the shot. */
export function Camera({
  t,
  duration,
  from = { scale: 1, x: 0, y: 0 },
  to = { scale: 1.06, x: 0, y: 0 },
  children,
}: {
  t: number;
  duration: number;
  from?: { scale: number; x: number; y: number };
  to?: { scale: number; x: number; y: number };
  children: ReactNode;
}) {
  const p = Math.min(1, Math.max(0, t / duration));
  const scale = from.scale + (to.scale - from.scale) * p;
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  return (
    <div style={{ ...fill, transform: `translate(${x}px, ${y}px) scale(${scale})`, transformOrigin: "50% 50%", willChange: "transform" }}>
      {children}
    </div>
  );
}
