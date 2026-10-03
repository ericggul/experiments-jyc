import { useCallback, useEffect, useRef, useState } from "react";
import { advance, timeConfig, type SimTime } from "./model/time";

/**
 * One requestAnimationFrame clock for the whole field. React state changes
 * only when the clock crosses a tick (`timeConfig.tickMinutes`).
 */
export function useSimClock(playing: boolean, minutesPerSecond: number, start: SimTime = { day: timeConfig.startDay, minute: timeConfig.startMinute }) {
  const exact = useRef<SimTime>(start);
  const shown = useRef<SimTime>(start);
  const [time, setTime] = useState<SimTime>(start);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const delta = Math.min(now - previous, 250);
      previous = now;
      if (!document.hidden) {
        exact.current = advance(exact.current, delta, minutesPerSecond);
        const tick = timeConfig.tickMinutes;
        const minute = Math.floor(exact.current.minute / tick) * tick;
        // Touch React state only when the tick changes, not on every frame.
        if (shown.current.day !== exact.current.day || shown.current.minute !== minute) {
          shown.current = { day: exact.current.day, minute };
          setTime(shown.current);
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, minutesPerSecond]);

  const seek = useCallback((next: SimTime) => {
    exact.current = next;
    shown.current = { day: next.day, minute: Math.floor(next.minute) };
    setTime(shown.current);
  }, []);

  return [time, seek] as const;
}
