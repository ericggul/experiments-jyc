"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loopTime, sceneIndexAt, type SceneMark } from "./timeline";

export type ClockOptions = {
  /** Start time in seconds (`?t=`). */
  start: number;
  /** Start frozen (`?paused=1`), used for frame capture. */
  paused: boolean;
};

/** Looping playback clock for a spot, with scene stepping on ←/→ and pause on space. */
export function useSpotClock(duration: number, scenes: readonly SceneMark[], options: ClockOptions) {
  const [time, setTime] = useState(options.start);
  const [paused, setPaused] = useState(options.paused);
  const timeRef = useRef(options.start);
  const pausedRef = useRef(options.paused);

  const seek = useCallback(
    (next: number) => {
      timeRef.current = loopTime(next, duration);
      setTime(timeRef.current);
    },
    [duration],
  );

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        timeRef.current = loopTime(timeRef.current + delta, duration);
        setTime(timeRef.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, input")) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePause();
        return;
      }
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const index = sceneIndexAt(scenes, timeRef.current);
      const into = timeRef.current - scenes[index].start;
      const target =
        event.key === "ArrowRight"
          ? scenes[(index + 1) % scenes.length]
          : into > 0.8
            ? scenes[index]
            : scenes[(index - 1 + scenes.length) % scenes.length];
      seek(target.start);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scenes, seek, togglePause]);

  return { time, paused, seek, togglePause };
}
