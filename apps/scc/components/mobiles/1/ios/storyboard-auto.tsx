import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePlayback } from "./playback";
import { frameAt, monotonic, panelFrames, scrollFrames, tapFrames, type Script } from "./storyboard-model";
import { BoardPanel } from "./storyboard-panel";
import type { BoardProps } from "./storyboard-types";
import styles from "./storyboard.module.css";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Moves an animation to a point on its timeline. */
function seek(animation: Animation, time: number) {
  animation.currentTime = time;
}
const SIM_MS = 1000;

/**
 * The desktop field's player: the whole session (navigation, scrolling, taps)
 * on a Web Animations timeline of simulated minutes, with the playback rate
 * following the simulation speed, so a ten-minute scene at 10 min/s is a
 * one-second burst of real use.
 */
export function AutoBoard({ session, elapsed, live }: BoardProps) {
  const playback = usePlayback();
  const ids = useMemo(() => Object.keys(session.panels), [session]);
  const script: Script = useMemo(() => ({ duration: session.duration, shots: session.shots }), [session]);
  const frames = useMemo(() => {
    const panels = panelFrames(script, ids);
    const scrolls = scrollFrames(script, ids);
    return {
      panels: new Map([...panels].map(([key, list]) => [key, monotonic(list)])),
      scrolls: new Map([...scrolls].map(([key, list]) => [key, monotonic(list)])),
      tap: monotonic(tapFrames(script)),
    };
  }, [script, ids]);

  const panelRefs = useRef(new Map<string, HTMLDivElement>());
  const scrollRefs = useRef(new Map<string, HTMLDivElement>());
  const tapRef = useRef<HTMLSpanElement>(null);
  const animations = useRef<Animation[]>([]);
  const duration = Math.max(1, session.duration) * SIM_MS;
  const rate = playback.playing && !playback.frozen ? playback.minutesPerSecond : 0;
  const startAt = Math.min(duration, Math.max(0, elapsed) * SIM_MS);
  const firstPaint = useRef({ startAt, rate });

  // Runs before the build effect below, so a rebuilt session starts at the current time.
  useIsoLayoutEffect(() => {
    firstPaint.current = { startAt, rate };
  });

  useIsoLayoutEffect(() => {
    const options: KeyframeAnimationOptions = { duration, fill: "both", easing: "linear" };
    const list: Animation[] = [];
    const play = (element: Element | null | undefined, keyframes: Keyframe[]) => {
      if (!element || typeof element.animate !== "function") return;
      const animation = element.animate(keyframes, options);
      seek(animation, firstPaint.current.startAt);
      animation.playbackRate = firstPaint.current.rate;
      list.push(animation);
    };
    for (const key of ids) {
      play(panelRefs.current.get(key), frames.panels.get(key) as Keyframe[]);
      const scroll = frames.scrolls.get(key);
      if (scroll && scroll.length > 2) play(scrollRefs.current.get(key), scroll as Keyframe[]);
    }
    if (frames.tap.length > 2) play(tapRef.current, frames.tap as Keyframe[]);
    animations.current = list;
    return () => {
      for (const animation of list) animation.cancel();
      animations.current = [];
    };
  }, [frames, ids, duration]);

  // Follow speed, pause and freeze without rebuilding.
  useEffect(() => {
    for (const animation of animations.current) animation.updatePlaybackRate(rate);
  }, [rate]);

  // Re-sync only on a real jump (scrubbing), not on every tick.
  useEffect(() => {
    const drift = 4.5 * SIM_MS;
    for (const animation of animations.current) {
      const current = Number(animation.currentTime ?? 0);
      if (Math.abs(current - startAt) > drift) seek(animation, startAt);
    }
  }, [startAt]);

  const offset = startAt / duration;
  return (
    <div className={styles.board}>
      {ids.map((key) => {
        const state = frameAt(frames.panels.get(key) ?? [], offset);
        const scroll = frameAt(frames.scrolls.get(key) ?? [{ offset: 0, transform: "none" }], offset);
        return (
          <BoardPanel
            key={key}
            panel={session.panels[key]}
            panelRef={(element) => {
              if (element) panelRefs.current.set(key, element);
              else panelRefs.current.delete(key);
            }}
            contentRef={(element) => {
              if (element) scrollRefs.current.set(key, element);
              else scrollRefs.current.delete(key);
            }}
            style={{ transform: state?.transform, opacity: state?.opacity, zIndex: state?.zIndex }}
            contentStyle={{ transform: scroll?.transform }}
            live={live?.(key)}
          />
        );
      })}
      <span ref={tapRef} className={styles.tap} aria-hidden="true" />
      {session.overlay}
    </div>
  );
}
