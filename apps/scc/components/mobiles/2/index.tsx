"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import Instagram from "@/components/mobile/clone/11";
import TikTok from "@/components/mobile/clone/12";
import X from "@/components/mobile/clone/13";
import YouTube from "@/components/mobile/clone/14";
import { CloneScale } from "@/components/mobile/clone/scale";
import { BORDER_MAX, fonts, type Look } from "@/components/mobile/transform/substitution/3/cell-image";
import PixelRenderer from "@/components/mobile/transform/substitution/3/renderer";
import { commandGroups, type CommandGroup } from "@/components/mobile/transform/substitution/3/semantic";
import { PACE_RANGE, startAutopilot } from "./autopilot";
import styles from "./mobiles.module.css";

/** Native size of each phone; the clones lay out against this viewport. */
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const GAP_RANGE = [0, 40] as const;
const MARGIN_RANGE = [0, 60] as const;
const ROW_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
type Rows = (typeof ROW_OPTIONS)[number];
const DEFAULT_ROWS: Rows = 3;

/** The ground of the phones: all white, all black, or alternating like a checkerboard across the grid. */
type Ground = "light" | "dark" | "checker";
const grounds: { id: Ground; label: string }[] = [
  { id: "light", label: "흰 바탕" },
  { id: "dark", label: "검은 바탕" },
  { id: "checker", label: "체크무늬" },
];

/** What each phone shows: the clone, its substitution, or the two in turns, each phone switching with its neighbours. */
type Screen = "original" | "replaced" | "auto";
const screens: { id: Screen; label: string }[] = [
  { id: "original", label: "원본" },
  { id: "replaced", label: "치환" },
  { id: "auto", label: "자율 전환" },
];
/**
 * 자율 전환 is a noisy voter model on the grid, stepped as a Markov chain every tick. A phone flips with a small probability
 * of its own, plus a contagion share for each of its four neighbours (up, down, left, right) already in the other state;
 * so a flip spreads to the phones around it, and a lone phone rarely flips back on its own. Each phone has a pace of its own,
 * drawn once, and holds a state at least a short while, so no phone flickers.
 */
const AUTO = {
  tick: 200,
  /** Probability per tick of flipping with every neighbour in agreement: about once in 17 s. */
  spontaneous: 0.012,
  /** Probability per tick added when all neighbours differ: about once a second. */
  contagion: 0.2,
  paceRange: [0.6, 1.6] as const,
  minDwell: 1200,
};

/** Whether each phone is used by a hand of its own (`autopilot.ts`): scrolling, paging and tapping at its own pace. */
type Hand = "auto" | "still";
const hands: { id: Hand; label: string }[] = [
  { id: "auto", label: "자율" },
  { id: "still", label: "정지" },
];

/** substitution/3's filter as applied to every phone, with its vocabulary and look; the ground is chosen per phone. */
type Filter = { screen: Screen; group: CommandGroup; look: Omit<Look, "dark">; ground: Ground; hand: Hand };
const FILTER_DEFAULT: Filter = { screen: "original", group: "discipline", look: { font: "grotesque", border: 1 }, ground: "light", hand: "auto" };

// Each phone is a mobile clone rendered in this page, with substitution/3's filter scoped to it; on 원본 it is the clone alone.
const phones: { id: string; clone: string; Screen: ComponentType; title: string }[] = [
  { id: "instagram", clone: "11", Screen: Instagram, title: "Instagram" },
  { id: "tiktok", clone: "12", Screen: TikTok, title: "TikTok" },
  { id: "x", clone: "13", Screen: X, title: "X" },
  { id: "youtube", clone: "14", Screen: YouTube, title: "YouTube" },
];

/** One clone at its native 390 px phone width, scaled into its cell; its viewport units resolve to the phone, not the window. */
function Phone({ clone, Screen, title, filter, replaced, dark, scale, height, left, top }: {
  clone: string;
  Screen: ComponentType;
  title: string;
  filter: Filter;
  replaced: boolean;
  dark: boolean;
  scale: number;
  height: number;
  left: number;
  top: number;
}) {
  // The filter mounts once the phone element exists; it reads and draws inside that element only.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  // The look object is kept stable per font, border and ground, so the renderer rewrites only when one of them changes.
  const look = useMemo<Look>(() => ({ ...filter.look, dark }), [filter.look, dark]);
  // The phone's own hand: its pace is drawn when it first starts and kept while the phone lives.
  const pace = useRef(0);
  useEffect(() => {
    if (!frame || filter.hand !== "auto") return;
    if (!pace.current) pace.current = PACE_RANGE[0] + Math.random() * (PACE_RANGE[1] - PACE_RANGE[0]);
    return startAutopilot(frame, pace.current);
  }, [frame, filter.hand]);
  const style = {
    left,
    top,
    width: PHONE_WIDTH,
    height,
    transform: `scale(${scale})`,
    "--clone-viewport-width": `${PHONE_WIDTH}px`,
    "--clone-viewport-height": `${height}px`,
  } as CSSProperties;
  return (
    <div ref={setFrame} className={styles.phone} style={style} role="group" aria-label={title} data-substitution-pixel-scope>
      <CloneScale value={scale}>
        <Screen />
      </CloneScale>
      {frame && replaced && <PixelRenderer clone={clone} group={filter.group} look={look} scope={frame} />}
    </div>
  );
}

/** One row keeps the four phones; more rows fit as many phone-shaped columns as the screen holds. */
function gridFor(rows: Rows, width: number, height: number, gap: number) {
  if (rows === 1) return { rows, columns: phones.length };
  const rowHeight = (height - gap * (rows - 1)) / rows;
  const phoneWidth = rowHeight * (PHONE_WIDTH / PHONE_HEIGHT);
  return { rows, columns: Math.max(1, Math.floor((width + gap) / (phoneWidth + gap))) };
}

export default function MobilesTwo() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(DEFAULT_ROWS);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>(FILTER_DEFAULT);
  const update = (next: Partial<Filter>) => setFilter((current) => ({ ...current, ...next }));
  // 자율 전환 state per slot, kept across grid changes; paces and last flip times live outside render.
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const paces = useRef<number[]>([]);
  const lastFlip = useRef<number[]>([]);
  const gridRef = useRef({ rows: 1, columns: 1 });
  const updateLook = (next: Partial<Filter["look"]>) => setFilter((current) => ({ ...current, look: { ...current.look, ...next } }));

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Each cell shows a 390 px phone viewport scaled to the cell width and filling the cell height.
  const width = Math.max(0, size.width - margin * 2);
  const height = Math.max(0, size.height - margin * 2);
  const grid = gridFor(rows, width, height, gap);
  const cellWidth = (width - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (height - gap * (grid.rows - 1)) / grid.rows;
  const scale = cellWidth / PHONE_WIDTH;
  // Slots are the grid positions; slot n always shows the same service, so a resized grid keeps its pages.
  const slots = Array.from({ length: grid.rows * grid.columns }, (_, index) => ({ slot: index, ...phones[index % phones.length] }));
  // A checkerboard alternates by grid position, so neighbours on either side and above and below differ.
  const darkAt = (slot: number) => filter.ground === "dark" ||
    (filter.ground === "checker" && ((slot % grid.columns) + Math.floor(slot / grid.columns)) % 2 === 1);
  useEffect(() => {
    gridRef.current = { rows: grid.rows, columns: grid.columns };
  }, [grid.rows, grid.columns]);

  useEffect(() => {
    if (filter.screen !== "auto") return;
    const step = () => {
      const { rows, columns } = gridRef.current;
      const count = rows * columns;
      const now = performance.now();
      setFlipped((current) => {
        const state = Array.from({ length: count }, (_, slot) => current[slot] ?? false);
        for (let slot = paces.current.length; slot < count; slot++) {
          paces.current[slot] = AUTO.paceRange[0] + Math.random() * (AUTO.paceRange[1] - AUTO.paceRange[0]);
          lastFlip.current[slot] = -Infinity;
        }
        // Every phone reads the same state of the field (synchronous update), as a cellular automaton does.
        const next = state.slice();
        for (let slot = 0; slot < count; slot++) {
          if (now - lastFlip.current[slot] < AUTO.minDwell) continue;
          const row = Math.floor(slot / columns);
          const column = slot % columns;
          let neighbours = 0;
          let differing = 0;
          const look = (r: number, c: number) => {
            if (r < 0 || r >= rows || c < 0 || c >= columns) return;
            neighbours++;
            if (state[r * columns + c] !== state[slot]) differing++;
          };
          look(row - 1, column);
          look(row + 1, column);
          look(row, column - 1);
          look(row, column + 1);
          const share = neighbours ? differing / neighbours : 0;
          const probability = (AUTO.spontaneous + AUTO.contagion * share) * paces.current[slot];
          if (Math.random() < probability) {
            next[slot] = !state[slot];
            lastFlip.current[slot] = now;
          }
        }
        return next.some((value, slot) => value !== state[slot]) || state.length !== current.length ? next : current;
      });
    };
    const timer = window.setInterval(step, AUTO.tick);
    return () => window.clearInterval(timer);
  }, [filter.screen]);

  return (
    <main ref={field} className={styles.field}>
      {size.width > 0 && slots.map(({ slot, clone, Screen, title }) => (
        <Phone
          key={`slot-${slot}`}
          clone={clone}
          Screen={Screen}
          title={title}
          filter={filter}
          replaced={filter.screen === "replaced" || (filter.screen === "auto" && Boolean(flipped[slot]))}
          dark={darkAt(slot)}
          scale={scale}
          height={cellHeight / scale}
          left={margin + (slot % grid.columns) * (cellWidth + gap)}
          top={margin + Math.floor(slot / grid.columns) * (cellHeight + gap)}
        />
      ))}
      <div className={styles.control}>
        {open && (
          <div id="mobiles-two-layout" className={styles.panel} role="group" aria-label="레이아웃과 필터 옵션">
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
                aria-label="폰 사이 간격"
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
            <p className={styles.heading}>치환</p>
            <p className={styles.note}>화면</p>
            <div className={styles.chips} role="group" aria-label="화면">
              {screens.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={filter.screen === id} onClick={() => update({ screen: id })}>{label}</button>
              ))}
            </div>
            <p className={styles.note}>행동</p>
            <div className={styles.chips} role="group" aria-label="행동">
              {hands.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={filter.hand === id} onClick={() => update({ hand: id })}>{label}</button>
              ))}
            </div>
            <p className={styles.note}>명령어</p>
            <div className={styles.chips} role="group" aria-label="명령어">
              {commandGroups.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={filter.group === id} onClick={() => update({ group: id, screen: filter.screen === "original" ? "replaced" : filter.screen })}>{label}</button>
              ))}
            </div>
            <p className={styles.note}>글꼴</p>
            <div className={styles.chips} role="group" aria-label="글꼴">
              {fonts.map(({ id, label, name, family, weight }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter.look.font === id}
                  aria-label={label}
                  style={{ fontFamily: family, fontWeight: weight }}
                  onClick={() => updateLook({ font: id })}
                >
                  {/* Each face is named in itself, as in substitution/3. */}
                  {name}
                </button>
              ))}
            </div>
            <p className={styles.note}>바탕</p>
            <div className={styles.chips} role="group" aria-label="바탕">
              {grounds.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={filter.ground === id} onClick={() => update({ ground: id })}>{label}</button>
              ))}
            </div>
            <label className={styles.row}>
              <span>테두리 <output>{filter.look.border === 0 ? "없음" : `${filter.look.border.toFixed(1)} px`}</output></span>
              <input
                aria-label="테두리 굵기: 0이면 없음, 1이면 가는 선, 오른쪽으로 갈수록 굵게"
                max={BORDER_MAX}
                min="0"
                step="0.05"
                type="range"
                value={filter.look.border}
                onChange={(event) => updateLook({ border: Number(event.target.value) })}
              />
            </label>
            <button type="button" className={styles.reset} onClick={() => setFilter(FILTER_DEFAULT)}>기본값으로</button>
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="레이아웃과 필터 옵션"
          aria-expanded={open}
          aria-controls="mobiles-two-layout"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="5.5" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11.5" y="3" width="5.5" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
