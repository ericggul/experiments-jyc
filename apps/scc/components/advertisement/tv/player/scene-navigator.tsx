"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatTime, sceneIndexAt, type SceneMark } from "./timeline";
import styles from "./player.module.css";

/** Idle time before the controls drop to the minimized line while playing, in ms. */
const IDLE_HIDE = 2500;
/** Per-viewer preference: keep the controls minimized. */
const MINIMIZED_KEY = "tv-navigator-minimized";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Video-style controls for a spot: a scene-segmented scrubber (click or drag to
 * seek, hover to preview the scene), transport buttons, and a drawer of scene
 * cards. Minimized (by the button, or while playing and idle) it shrinks to a
 * thin scrubbable line on the bottom edge.
 */
export function SceneNavigator({
  scenes,
  time,
  duration,
  paused,
  thumbnail,
  onSeek,
  onTogglePause,
}: {
  scenes: readonly SceneMark[];
  time: number;
  duration: number;
  paused: boolean;
  /** Image URL for a scene card, if the scene has a plate. */
  thumbnail?: (scene: SceneMark) => string | undefined;
  onSeek: (time: number) => void;
  onTogglePause: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [idle, setIdle] = useState(false);
  const [inside, setInside] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const resumeAfterDrag = useRef(false);

  const index = sceneIndexAt(scenes, time);
  const current = scenes[index];

  // Auto-hide: any pointer movement over the page wakes the controls.
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_HIDE);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // Read the saved preference after hydration (the server always renders expanded).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setMinimized(window.localStorage.getItem(MINIMIZED_KEY) === "1");
      } catch {
        // Storage unavailable: start expanded.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const setMinimizedSaved = (value: boolean) => {
    setMinimized(value);
    if (value) setOpen(false);
    try {
      window.localStorage.setItem(MINIMIZED_KEY, value ? "1" : "0");
    } catch {
      // Preference just won't persist.
    }
  };

  useEffect(() => {
    if (!open) return;
    const card = strip.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [open, index]);

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = track.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration - 0.01);
    },
    [duration],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Hold the picture still while scrubbing, then resume if it was playing.
    resumeAfterDrag.current = !paused;
    if (!paused) onTogglePause();
    setDragging(true);
    onSeek(timeAt(event.clientX));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const at = timeAt(event.clientX);
    setHover(at);
    if (dragging) onSeek(at);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (resumeAfterDrag.current) onTogglePause();
    resumeAfterDrag.current = false;
  };
  const onTrackKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 1;
    const to =
      event.key === "ArrowRight" ? time + step
      : event.key === "ArrowLeft" ? time - step
      : event.key === "Home" ? 0
      : event.key === "End" ? duration - 0.01
      : null;
    if (to === null) return;
    event.preventDefault();
    onSeek(clamp(to, 0, duration - 0.01));
  };

  const stepScene = (delta: number) => {
    // "Previous" restarts the current scene first, as a video chapter button does.
    const into = time - current.start;
    const target = delta < 0 && into > 0.8 ? index : (index + delta + scenes.length) % scenes.length;
    onSeek(scenes[target].start);
  };

  const expanded = !minimized && (open || paused || dragging || inside || !idle);
  const hoverScene = hover === null ? null : scenes[sceneIndexAt(scenes, hover)];

  return (
    <div
      className={styles.navigator}
      data-open={open}
      data-mini={!expanded}
      onClick={(event) => event.stopPropagation()}
      onPointerEnter={() => setInside(true)}
      onPointerLeave={() => setInside(false)}
    >
      <div
        ref={track}
        className={styles.scrubber}
        data-active={dragging || hover !== null}
        role="slider"
        tabIndex={0}
        aria-label="재생 위치"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatTime(time)}, ${current.label}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onTrackKey}
      >
        <div className={styles.segments}>
          {scenes.map((scene, i) => {
            const fill = clamp((time - scene.start) / (scene.end - scene.start), 0, 1);
            return (
              <div
                key={scene.id}
                className={styles.segment}
                data-current={i === index}
                data-hover={hoverScene?.id === scene.id}
                style={{ flexGrow: scene.end - scene.start }}
              >
                <div className={styles.segmentFill} style={{ transform: `scaleX(${fill})` }} />
              </div>
            );
          })}
        </div>
        <div className={styles.knob} style={{ left: `${(time / duration) * 100}%` }} />
        {hover !== null && hoverScene ? (
          <div className={styles.tooltip} style={{ left: `clamp(80px, ${(hover / duration) * 100}%, calc(100% - 80px))` }}>
            <span className={styles.tooltipTime}>{formatTime(hover)}</span>
            <span className={styles.tooltipLabel}>{hoverScene.label}</span>
          </div>
        ) : null}
      </div>
      {expanded ? null : (
        <button type="button" className={styles.navExpand} onClick={() => setMinimizedSaved(false)} aria-label="컨트롤 펼치기">
          ▴
        </button>
      )}
      <div className={styles.navBar} hidden={!expanded}>
        <button type="button" className={styles.navButton} onClick={() => stepScene(-1)} aria-label="이전 장면">
          ⏮
        </button>
        <button type="button" className={styles.navButton} onClick={onTogglePause} aria-label={paused ? "재생" : "일시정지"}>
          {paused ? "▶" : "❚❚"}
        </button>
        <button type="button" className={styles.navButton} onClick={() => stepScene(1)} aria-label="다음 장면">
          ⏭
        </button>
        <span className={styles.navTime}>
          {formatTime(time)} / {formatTime(duration)}
        </span>
        <button
          type="button"
          className={styles.navToggle}
          aria-expanded={open}
          aria-controls="scene-strip"
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.navIndex}>
            {index + 1}/{scenes.length}
          </span>
          <span className={styles.navLabel}>{current.label}</span>
          <span className={styles.navChevron} aria-hidden>
            {open ? "▾" : "▴"}
          </span>
        </button>
        <button type="button" className={styles.navButton} onClick={() => setMinimizedSaved(true)} aria-label="컨트롤 최소화" title="최소화">
          ⌄
        </button>
      </div>
      {open && expanded ? (
        <ol id="scene-strip" ref={strip} className={styles.strip}>
          {scenes.map((scene, i) => {
            const src = thumbnail?.(scene);
            return (
              <li key={scene.id}>
                <button
                  type="button"
                  className={styles.card}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => onSeek(scene.start)}
                >
                  <span className={styles.thumb} style={src ? { backgroundImage: `url(${src})` } : undefined}>
                    <span className={styles.thumbIndex}>{i + 1}</span>
                  </span>
                  <span className={styles.cardText}>
                    <span className={styles.cardLabel}>{scene.label}</span>
                    <span className={styles.cardTime}>{formatTime(scene.start)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
