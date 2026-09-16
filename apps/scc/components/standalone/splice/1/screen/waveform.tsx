"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { CUE_SLOTS, type DeckId, type DeckState } from "../model/types";
import styles from "./splice.module.css";

export function formatTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}.${Math.floor((safe % 1) * 10)}`;
}

export const Waveform = memo(function Waveform({ deck, getPosition, seek }: {
  deck: DeckState;
  getPosition: (id: DeckId) => number;
  seek: (id: DeckId, position: number) => void;
}) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLOutputElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const path = useMemo(() => deck.peaks.map((peak, index) => {
    const x = (index + 0.5) / deck.peaks.length * 1000;
    const height = Math.max(0.5, peak * 68);
    return `M${x.toFixed(1)},${(80 - height).toFixed(1)}v${(height * 2).toFixed(1)}`;
  }).join(""), [deck.peaks]);

  useEffect(() => {
    let frame = 0;
    let lastClock = -Infinity;
    function draw(now: number) {
      const position = getPosition(deck.id);
      const progress = deck.duration ? position / deck.duration : 0;
      if (cursorRef.current) cursorRef.current.style.left = `${Math.min(100, Math.max(0, progress * 100))}%`;
      if (rangeRef.current) rangeRef.current.value = String(position);
      if (clockRef.current && now - lastClock > 80) {
        clockRef.current.textContent = formatTime(position);
        lastClock = now;
      }
      if (deck.playing) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [deck, getPosition]);

  const loaded = deck.duration > 0;
  return (
    <div className={styles.waveformGroup}>
      <div className={styles.timeRow}>
        <output ref={clockRef} aria-label={`Deck ${deck.id.toUpperCase()} position`}>0:00.0</output>
        <span>{loaded ? formatTime(deck.duration) : "—:——"}</span>
      </div>
      <div className={styles.waveform} data-loaded={loaded}>
        {loaded ? <>
          <span className={styles.loopRegion} data-active={deck.loop.enabled} style={{
            left: `${deck.loop.start / deck.duration * 100}%`,
            width: `${(deck.loop.end - deck.loop.start) / deck.duration * 100}%`,
          }} />
          <svg viewBox="0 0 1000 160" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2.4" />
          </svg>
          {CUE_SLOTS.map(({ id, index }) => {
            const cue = deck.cues[index];
            return cue !== null && <span key={id} className={styles.cueMark} style={{ left: `${cue / deck.duration * 100}%` }} aria-hidden="true">
              {index + 1}
            </span>;
          })}
          <span ref={cursorRef} className={styles.playhead} aria-hidden="true" />
          <input ref={rangeRef} className={styles.waveformInput} type="range" min="0" max={deck.duration}
            step="0.001" defaultValue="0" aria-label={`Seek deck ${deck.id.toUpperCase()}`}
            onChange={(event) => seek(deck.id, Number(event.currentTarget.value))} />
        </> : <span className={styles.emptyWave}>Drop a sound here<br /><span>or load the practice pair</span></span>}
      </div>
    </div>
  );
});
