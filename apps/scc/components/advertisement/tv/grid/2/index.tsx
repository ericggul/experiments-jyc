"use client";

import { useEffect, useRef, useState } from "react";
import { COPIES, type CopyId } from "./copy";
import { PALETTES } from "./palette";
import type { Chrome } from "./radar";
import { SCENES } from "./scenes";
import AnalysisSpot from "./spot";
import { FRAME_HEIGHT, FRAME_WIDTH, type CaptureOptions } from "@/components/advertisement/tv/player";
import styles from "./grid.module.css";

const GAP_RANGE = [0, 40] as const;
const MARGIN_RANGE = [0, 60] as const;
const ROW_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
type Rows = (typeof ROW_OPTIONS)[number];
const RATE_RANGE = [0.6, 1.5] as const;
// Wall-wide playback multiplier on top of each screen's own rate.
const SPEED_RANGE = [1, 20] as const;
type Speed = number;
// Which words the screens speak: one language for the wall, or each screen its own.
const LANGUAGES = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "mixed", label: "섞어서" },
] as const;
type Language = (typeof LANGUAGES)[number]["id"];
// Which palette the screens use: one for the wall, or each screen its own.
type Colour = string | "mixed";
// Layout minimalism: the broadcast layout, the ad without its chrome, or the chart alone.
const CHROMES: readonly { id: Chrome; label: string }[] = [
  { id: "full", label: "전체" },
  { id: "bare", label: "바 없음" },
  { id: "chart", label: "차트만" },
];

/** Deterministic unit value per slot and salt, so a re-laid grid keeps each screen's timing. */
function noise(slot: number, salt: number) {
  const x = Math.sin(slot * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Each screen is the spot on its own clock: some run in real time from the top, the rest
// start anywhere in the spot at their own speed, so the wall drifts in and out of sync.
function copyFor(slot: number, language: Language): CopyId {
  if (language !== "mixed") return language;
  return noise(slot, 4) < 0.5 ? "ko" : "en";
}

function paletteFor(slot: number, colour: Colour) {
  const index = colour === "mixed" ? Math.floor(noise(slot, 5) * PALETTES.length) : PALETTES.findIndex((p) => p.id === colour);
  return PALETTES[Math.max(0, index)];
}

// Held on the hexagon for now: every screen opens frozen on the six-axis scene, fully drawn,
// verdict up. The other scenes and the drifting clocks stay in the code (as in grid/1) for the next step.
const HEXAGON_AT = SCENES[0].start + 7;

function captureFor(slot: number, speed: Speed): CaptureOptions {
  const synced = noise(slot, 1) < 0.35;
  return {
    start: HEXAGON_AT,
    rate: (synced ? 1 : RATE_RANGE[0] + noise(slot, 3) * (RATE_RANGE[1] - RATE_RANGE[0])) * speed,
    paused: true,
    nav: false,
    plates: true,
    fixed: false,
  };
}

/** One TV: the spot's fixed broadcast viewport, contained to its cell and fitted by width, so the spot lays itself out to the cell's height. */
function Television({ slot, language, colour, speed, chrome, width, height, left, top }: { slot: number; language: Language; colour: Colour; speed: Speed; chrome: Chrome; width: number; height: number; left: number; top: number }) {
  return (
    <div className={styles.television} style={{ left, top, width, height }} role="group" aria-label="보장분석 광고">
      <AnalysisSpot capture={captureFor(slot, speed)} fit="width" copy={COPIES[copyFor(slot, language)]} chrome={chrome} palette={paletteFor(slot, colour)} />
    </div>
  );
}

/** As many 16:9 screens per row as the field holds at the chosen row count. */
function gridFor(rows: Rows, width: number, height: number, gap: number) {
  const rowHeight = (height - gap * (rows - 1)) / rows;
  const screenWidth = rowHeight * (FRAME_WIDTH / FRAME_HEIGHT);
  return { rows, columns: Math.max(1, Math.floor((width + gap) / (screenWidth + gap))) };
}

export default function TvGridTwo() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(4);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(0);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ko");
  const [speed, setSpeed] = useState<Speed>(1);
  const [chrome, setChrome] = useState<Chrome>("full");
  const [colour, setColour] = useState<Colour>(PALETTES[0].id);

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
          language={language}
          colour={colour}
          speed={speed}
          chrome={chrome}
          width={cellWidth}
          height={cellHeight}
          left={margin + (slot % grid.columns) * (cellWidth + gap)}
          top={margin + Math.floor(slot / grid.columns) * (cellHeight + gap)}
        />
      ))}
      <div className={styles.control}>
        {open && (
          <div id="tv-grid-two-layout" className={styles.panel} role="group" aria-label="레이아웃과 언어 옵션">
            <p className={styles.heading}>언어</p>
            <div className={styles.layouts} role="group" aria-label="언어">
              {LANGUAGES.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={language === id} onClick={() => setLanguage(id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className={styles.heading}>색</p>
            <div className={styles.layouts} role="group" aria-label="색 팔레트">
              {PALETTES.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={colour === id} onClick={() => setColour(id)}>
                  {label}
                </button>
              ))}
              <button type="button" aria-pressed={colour === "mixed"} onClick={() => setColour("mixed")}>섞어서</button>
            </div>
            <p className={styles.heading}>레이아웃 미니멀리즘</p>
            <div className={styles.layouts} role="group" aria-label="레이아웃 미니멀리즘">
              {CHROMES.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={chrome === id} onClick={() => setChrome(id)}>
                  {label}
                </button>
              ))}
            </div>
            <label className={styles.row}>
              <span>속도 <output>×{speed}</output></span>
              <input
                aria-label="재생 속도"
                max={SPEED_RANGE[1]}
                min={SPEED_RANGE[0]}
                step="1"
                type="range"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </label>
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
          aria-label="레이아웃과 언어 옵션"
          aria-expanded={open}
          aria-controls="tv-grid-two-layout"
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
