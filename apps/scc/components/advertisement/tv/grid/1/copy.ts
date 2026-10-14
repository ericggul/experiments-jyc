import type { SceneMark } from "@/components/advertisement/tv/player";
import { BRAND, PHONE, PRODUCT, SCENES } from "./scenes";

// The spot's words in each language. Graphics, timing and chart data stay in
// scenes.ts; a Copy only swaps strings and the type sizes those strings need.
export type SceneCopy = {
  kicker: string;
  title: string;
  /** Highlighted conclusion shown after the chart has drawn. */
  verdict: [string, string];
  /** Axis labels in scene order. */
  axes: readonly string[];
  footnote: string;
};

export type Copy = {
  id: "ko" | "en";
  /** Top-left broadcast marker. */
  marker: string;
  brand: string;
  product: string;
  phone: string;
  /** Label beside the phone number. */
  call: string;
  legend: { recommended: string; mine: string };
  scenes: Readonly<Record<string, SceneCopy>>;
  /** Type sizes and the legend width in frame pixels; Latin copy runs wider, so it sets smaller type. */
  size: { brand: number; product: number; call: number; phone: number; title: number; axis: number; verdict: number; legend: number };
};

// Korean is the spot's source language: scenes.ts holds its words.
export const KOREAN: Copy = {
  id: "ko",
  marker: "광고방송",
  brand: BRAND,
  product: PRODUCT,
  phone: PHONE,
  call: "무료상담",
  legend: { recommended: "권장 보장", mine: "현재 내 보장" },
  size: { brand: 34, product: 60, call: 34, phone: 104, title: 70, axis: 42, verdict: 96, legend: 360 },
  scenes: Object.fromEntries(
    SCENES.map(({ id, kicker, title, verdict, axes, footnote }) => [id, { kicker, title, verdict, axes: axes.map((axis) => axis.label), footnote }]),
  ),
};

// US daytime direct-response register: a toll-free number, "paid advertisement", plain nouns.
export const ENGLISH: Copy = {
  id: "en",
  marker: "PAID ADVERTISEMENT",
  brand: "Harmony Life",
  product: "Secure Health Protection Plan",
  phone: "1-800-000-1234",
  call: "CALL FREE",
  legend: { recommended: "Recommended coverage", mine: "Your coverage today" },
  size: { brand: 30, product: 48, call: 30, phone: 84, title: 62, axis: 34, verdict: 84, legend: 480 },
  scenes: {
    "coverage-6": {
      kicker: "FREE COVERAGE CHECK RESULTS",
      title: "Is your insurance really ready?",
      verdict: ["Coverage gaps", "3 found"],
      axes: ["Cancer", "Stroke", "Heart disease", "Hospital stay", "Surgery", "Nursing care"],
      footnote: "This screen is an illustration only. Your actual coverage analysis may differ.",
    },
    "health-5": {
      kicker: "HEALTH BALANCE AFTER 50",
      title: "Your health balance slips with age",
      verdict: ["Needs attention", "2 areas"],
      axes: ["Circulation", "Joints & bones", "Immunity", "Eyesight", "Digestion"],
      footnote: "Health varies by individual. Consult a physician for an accurate diagnosis.",
    },
    "major-3": {
      kicker: "ARE YOU READY FOR THE BIG THREE?",
      title: "Cancer, stroke and heart: check all three at once",
      verdict: ["Big-three coverage", "Not enough"],
      axes: ["Cancer", "Stroke", "Heart disease"],
      footnote: "Please read the plan brochure and policy terms before enrolling.",
    },
  },
};

export const COPIES = { ko: KOREAN, en: ENGLISH } as const;
export type CopyId = keyof typeof COPIES;

/** The scene's copy in the given language. */
export function sceneCopy(copy: Copy, scene: SceneMark): SceneCopy {
  return copy.scenes[scene.id];
}
