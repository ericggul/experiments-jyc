"use client";

import { useEffect, useRef, useState } from "react";
import AnalysisSpot from "@/components/advertisement/tv/korean/5";
import { DURATION } from "@/components/advertisement/tv/korean/5/scenes";
import { FRAME_HEIGHT, FRAME_WIDTH, type CaptureOptions } from "@/components/advertisement/tv/player";
import styles from "./grid.module.css";

const GAP_RANGE = [0, 40] as const;
const MARGIN_RANGE = [0, 60] as const;
const ROW_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
type Rows = (typeof ROW_OPTIONS)[number];
const RATE_RANGE = [0.6, 1.5] as const;

/** Deterministic unit value per slot and salt, so a re-laid grid keeps each screen's timing. */
function noise(slot: number, salt: number) {
  const x = Math.sin(slot * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Each screen is korean/5 on its own clock: some run in real time from the top, the rest
// start anywhere in the spot at their own speed, so the wall drifts in and out of sync.
function captureFor(slot: number): CaptureOptions {
  const synced = noise(slot, 1) < 0.35;
  return {
    start: synced ? 0 : noise(slot, 2) * DURATION,
    rate: synced ? 1 : RATE_RANGE[0] + noise(slot, 3) * (RATE_RANGE[1] - RATE_RANGE[0]),
    paused: false,
    nav: false,
    plates: true,
    fixed: false,
  };
}

/** One TV: korean/5's fixed broadcast viewport, contained to its cell and fitted by width, so the spot lays itself out to the cell's height. */
function Television({ slot, width, height, left, top }: { slot: number; width: number; height: number; left: number; top: number }) {
  return (
    <div className={styles.television} style={{ left, top, width, height }} role="group" aria-label="korean/5">
      <AnalysisSpot capture={captureFor(slot)} fit="width" />
    </div>
  );
}

/** As many 16:9 screens per row as the field holds at the chosen row count. */
function gridFor(rows: Rows, width: number, height: number, gap: number) {
  const rowHeight = (height - gap * (rows - 1)) / rows;
  const screenWidth = rowHeight * (FRAME_WIDTH / FRAME_HEIGHT);
  return { rows, columns: Math.max(1, Math.floor((width + gap) / (screenWidth + gap))) };
}

export default function TvGridOne() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(4);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = Math.max(0, size.width - margin * 2);
  const height = Math.max(0, size.height - margin * 2);
  const grid = gridFor(rows, width, height, gap);
  const cellWidth = (width - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (height - gap * (grid.rows - 1)) / grid.rows;
  const slots = Array.from({ length: grid.rows * grid.columns }, (_, slot) => slot);

  return (
    <main ref={field} className={styles.field}>
      {size.width > 0 && slots.map((slot) => (
        <Television
          key={`slot-${slot}`}
          slot={slot}
          width={cellWidth}
          height={cellHeight}
          left={margin + (slot % grid.columns) * (cellWidth + gap)}
          top={margin + Math.floor(slot / grid.columns) * (cellHeight + gap)}
        />
      ))}
      <div className={styles.control}>
        {open && (
          <div id="tv-grid-one-layout" className={styles.panel} role="group" aria-label="레이아웃 옵션">
            <p className={styles.heading}>레이아웃</p>
            <div className={styles.layouts}>
              {ROW_OPTIONS.map((option) => (
                <button key={option} type="button" aria-pressed={rows === option} onClick={() => setRows(option)}>
                  {option} × {gridFor(option, width, height, gap).columns}
                </button>
              ))}
            </div>
            <label className={styles.row}>
              <span>간격 <output>{gap}px</output></span>
              <input
                aria-label="화면 사이 간격"
                max={GAP_RANGE[1]}
                min={GAP_RANGE[0]}
                step="1"
                type="range"
                value={gap}
                onChange={(event) => setGap(Number(event.target.value))}
              />
            </label>
            <label className={styles.row}>
              <span>바깥 여백 <output>{margin}px</output></span>
              <input
                aria-label="화면 가장자리 여백"
                max={MARGIN_RANGE[1]}
                min={MARGIN_RANGE[0]}
                step="1"
                type="range"
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
              />
            </label>
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="레이아웃 옵션"
          aria-expanded={open}
          aria-controls="tv-grid-one-layout"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="3" y="11" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="11" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
