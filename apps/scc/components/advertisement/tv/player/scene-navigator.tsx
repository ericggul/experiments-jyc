"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime, sceneIndexAt, type SceneMark } from "./timeline";
import styles from "./player.module.css";

/**
 * Bottom drawer listing the spot's scenes. Collapsed it shows the current
 * scene; expanded, each card jumps to its scene start.
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
  const index = sceneIndexAt(scenes, time);
  const current = scenes[index];
  const strip = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;
    const card = strip.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [open, index]);

  return (
    <div className={styles.navigator} data-open={open} onClick={(event) => event.stopPropagation()}>
      <div className={styles.navBar}>
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
        <button type="button" className={styles.navPause} onClick={onTogglePause} aria-label={paused ? "재생" : "일시정지"}>
          {paused ? "▶" : "❚❚"}
        </button>
        <span className={styles.navTime}>
          {formatTime(time)} / {formatTime(duration)}
        </span>
      </div>
      <div className={styles.navProgress} aria-hidden>
        <div style={{ width: `${(time / duration) * 100}%` }} />
      </div>
      {open ? (
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
