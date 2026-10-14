"use client";

import { LATIN_FONTS } from "./fonts";
import { DEFAULT_LATIN, type Language, type LatinStyle } from "./graph";
import styles from "./grid.module.css";
import { PALETTES } from "./palette";

// The graph-level options every wall shares: words, Latin type, colour and playback. Each wall
// adds its own layout controls after these.
const LANGUAGES = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "mixed", label: "섞어서" },
] as const;
export type LanguageChoice = (typeof LANGUAGES)[number]["id"];
/** One palette id for the wall, or each graph its own. */
export type Colour = string | "mixed";

const WEIGHT_RANGE = [400, 900] as const;
const LATIN_SIZE_RANGE = [24, 48] as const;
const SPEED_RANGE = [1, 20] as const;

export type GraphOptions = {
  language: LanguageChoice;
  latin: LatinStyle;
  colour: Colour;
  paused: boolean;
  speed: number;
};

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = { language: "ko", latin: DEFAULT_LATIN, colour: PALETTES[0].id, paused: true, speed: 1 };

/** Deterministic unit value per slot and salt, so a re-laid wall keeps each graph's choices. */
export function noise(slot: number, salt: number) {
  const x = Math.sin(slot * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function languageFor(slot: number, choice: LanguageChoice): Language {
  if (choice !== "mixed") return choice;
  return noise(slot, 4) < 0.5 ? "ko" : "en";
}

export function paletteFor(slot: number, colour: Colour) {
  const index = colour === "mixed" ? Math.floor(noise(slot, 5) * PALETTES.length) : PALETTES.findIndex((p) => p.id === colour);
  return PALETTES[Math.max(0, index)];
}

export function GraphOptionsPanel({ options, onChange }: { options: GraphOptions; onChange: (next: GraphOptions) => void }) {
  const { language, latin, colour, paused, speed } = options;
  const set = (patch: Partial<GraphOptions>) => onChange({ ...options, ...patch });
  return (
    <>
      <p className={styles.heading}>언어</p>
      <div className={styles.layouts} role="group" aria-label="언어">
        {LANGUAGES.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={language === id} onClick={() => set({ language: id })}>
            {label}
          </button>
        ))}
      </div>
      <p className={styles.heading}>영어 폰트</p>
      <div className={styles.layouts} role="group" aria-label="영어 라벨 서체">
        {LATIN_FONTS.map((font) => (
          <button key={font.id} type="button" aria-pressed={latin.font.id === font.id} onClick={() => set({ latin: { ...latin, font } })}>
            {font.label}
          </button>
        ))}
      </div>
      <label className={styles.row}>
        <span>영어 굵기 <output>{Math.min(latin.weight, latin.font.max)}</output></span>
        <input
          aria-label="영어 라벨 굵기"
          max={WEIGHT_RANGE[1]}
          min={WEIGHT_RANGE[0]}
          step="100"
          type="range"
          value={latin.weight}
          onChange={(event) => set({ latin: { ...latin, weight: Number(event.target.value) } })}
        />
      </label>
      <label className={styles.row}>
        <span>영어 크기 <output>{latin.size}</output></span>
        <input
          aria-label="영어 라벨 크기"
          max={LATIN_SIZE_RANGE[1]}
          min={LATIN_SIZE_RANGE[0]}
          step="1"
          type="range"
          value={latin.size}
          onChange={(event) => set({ latin: { ...latin, size: Number(event.target.value) } })}
        />
      </label>
      <p className={styles.heading}>색</p>
      <div className={styles.layouts} role="group" aria-label="색 팔레트">
        {PALETTES.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={colour === id} onClick={() => set({ colour: id })}>
            {label}
          </button>
        ))}
        <button type="button" aria-pressed={colour === "mixed"} onClick={() => set({ colour: "mixed" })}>섞어서</button>
      </div>
      <p className={styles.heading}>재생</p>
      <div className={styles.layouts} role="group" aria-label="재생">
        <button type="button" aria-pressed={paused} onClick={() => set({ paused: true })}>정지</button>
        <button type="button" aria-pressed={!paused} onClick={() => set({ paused: false })}>재생</button>
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
          onChange={(event) => set({ speed: Number(event.target.value) })}
        />
      </label>
    </>
  );
}
