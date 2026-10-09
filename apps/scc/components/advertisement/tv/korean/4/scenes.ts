import type { SceneMark } from "../../player";

// 흥국생명 무배당 다사랑 3N5 간편건강보험 60초 DR (YouTube kNvfC6rNkRk, 720×480
// anamorphic capture scaled to 1920×1080). Cut times from ffmpeg scene detection;
// caption, highlight and pop times from per-frame colour counts at 10 fps.
export const DURATION = 59.68;

export type PlateId =
  | "gift-soup"
  | "gift-lock"
  | "gift-stew"
  | "gift-pots"
  | "gift-thumb"
  | "ward-mono"
  | "ward-cheer"
  | "ward-wide"
  | "presenter-waist"
  | "presenter-full"
  | "living-room"
  | "presenter-left"
  | "presenter-near"
  | "presenter-laugh"
  | "presenter-gesture"
  | "senior-man"
  | "presenter-close"
  | "presenter-point";

/**
 * Composition prompts for the generated plates (16:9, no text, no logos; people
 * are generic and must not resemble any real person).
 */
export const PLATE_PROMPTS: Record<PlateId, string> = {
  "gift-soup":
    "Overhead close-up of a cream enamel pot of steaming ginseng chicken soup, a cream pressure lid with a round vent knob lying diagonally across the top right, warm kitchen light, shallow depth of field.",
  "gift-lock":
    "Split screen with a thin white divider at the centre: left half an extreme close-up of a grey pressure-pot lid latch, right half a hand turning the round grey locking knob of a pot lid, neutral studio light.",
  "gift-stew":
    "Close-up of braised beef with carrots in a large grey pot on the left two-thirds; a right-hand column of three small rounded photos of chicken soup and cooked rice in pots.",
  "gift-pots":
    "Bright product still life: a white enamel pressure pot with a grey lid in front, a larger cream enamel pot behind on a wooden board, wooden spoon and plants on a white kitchen counter, soft daylight.",
  "gift-thumb":
    "Small product photo: a white enamel pot with a grey lid and a cream pot on a white kitchen counter, high key.",
  "ward-mono":
    "Black-and-white hospital ward: an elderly woman lying in bed in the left foreground under a patterned blanket, eyes closed, a middle-aged man with glasses and a middle-aged woman seated by the bed on the right looking worried; lower right third kept calm for captions.",
  "ward-cheer":
    "Bright colour hospital room: an elderly woman sitting up in bed laughing on the left, a middle-aged man and woman standing at the bedside on the right reacting with delight, pale blue curtains.",
  "ward-wide":
    "Wide bright hospital room: an elderly woman sitting up in bed under a blue blanket at centre, a man and a woman at her side looking up in surprise, pale blue curtain divider, small plant at left; upper 40% of the frame plain wall for captions.",
  "presenter-waist":
    "Studio presenter, a woman in a lilac collarless jacket and white skirt, standing waist-up in the left third, hands clasped, white panelled wall background; right two-thirds empty.",
  "presenter-full":
    "Same studio and presenter, framed from the knees up in the left third, both hands raised expressively, white panelled wall; right two-thirds empty.",
  "living-room":
    "Bright living room with a large window, two middle-aged women seated at a small round white table with mugs, looking up and smiling, wooden shelves and sideboard; upper third plain for captions.",
  "presenter-left":
    "Studio presenter in a lilac jacket standing in the left quarter, waist-up, speaking, white panelled wall; right three-quarters empty.",
  "presenter-near":
    "Studio presenter in a lilac jacket, closer waist-up framing in the left third, gesturing with open hands, white panelled wall.",
  "presenter-laugh":
    "Studio presenter in a lilac jacket laughing, chest-up in the left third, hands together, white panelled wall.",
  "presenter-gesture":
    "Studio presenter in a lilac jacket in the left third, one hand extended to the right as if presenting, white panelled wall.",
  "senior-man":
    "Smiling elderly man with grey hair and glasses in a navy cardigan over a blue shirt, left half of the frame, fist raised cheerfully, warm blurred living room; right half soft and plain for captions.",
  "presenter-close":
    "Studio presenter in a lilac jacket, waist-up in the left third, hands clasped, smiling, white panelled wall.",
  "presenter-point":
    "Studio presenter in a lilac jacket in the left third, right arm extended down and to the right pointing at the lower edge, white panelled wall.",
};

export type Shot = { at: number; plate: PlateId };

export const SHOTS: readonly Shot[] = [
  { at: 0, plate: "gift-soup" },
  { at: 0.88, plate: "gift-lock" },
  { at: 3.16, plate: "gift-stew" },
  { at: 4.76, plate: "gift-pots" },
  { at: 5.72, plate: "ward-mono" },
  { at: 9.28, plate: "ward-cheer" },
  { at: 11.6, plate: "ward-wide" },
  { at: 15.16, plate: "presenter-waist" },
  { at: 18.92, plate: "presenter-full" },
  { at: 21.08, plate: "living-room" },
  { at: 30.12, plate: "presenter-left" },
  { at: 38.48, plate: "presenter-near" },
  { at: 43.4, plate: "presenter-laugh" },
  { at: 44.68, plate: "presenter-gesture" },
  { at: 48.12, plate: "senior-man" },
  { at: 50.52, plate: "presenter-close" },
  { at: 53.16, plate: "presenter-point" },
];

/** The closing disclosure page has no plate. */
export const LEGAL_AT = 54.8;

export const SCENE_IDS = [
  "gift-done",
  "gift-lock",
  "gift-pot",
  "gift-give",
  "worry",
  "relief",
  "counter",
  "carer",
  "cancer-once",
  "cancer-yearly",
  "metastasis",
  "chronic",
  "senior",
  "product",
  "legal",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENES: readonly (SceneMark & { id: SceneId })[] = [
  { id: "gift-done", label: "상담 완료시", start: 0, end: 0.88 },
  { id: "gift-lock", label: "안전잠금장치", start: 0.88, end: 3.16 },
  { id: "gift-pot", label: "대용량 IH 저압냄비", start: 3.16, end: 4.76 },
  { id: "gift-give", label: "증정!", start: 4.76, end: 5.72 },
  { id: "worry", label: "1년 365일도 부족하다면?", start: 5.72, end: 9.28 },
  { id: "relief", label: "뭘 걱정해?", start: 9.28, end: 11.6 },
  { id: "counter", label: "간병인 비용 최대 540일", start: 11.6, end: 15.16 },
  { id: "carer", label: "간병인 비용 보장 최대 540일까지!", start: 15.16, end: 21.08 },
  { id: "cancer-once", label: "암진단비 매년계속 보장!", start: 21.08, end: 30.12 },
  { id: "cancer-yearly", label: "암진단비 최초 보장 + 1년마다", start: 30.12, end: 38.48 },
  { id: "metastasis", label: "전이암 진단 시", start: 38.48, end: 44.68 },
  { id: "chronic", label: "지병이 있어도", start: 44.68, end: 48.12 },
  { id: "senior", label: "간편심사 통과만으로 가입 가능!", start: 48.12, end: 50.52 },
  { id: "product", label: "아래 번호로 전화만 주세요!", start: 50.52, end: LEGAL_AT },
  { id: "legal", label: "고지", start: LEGAL_AT, end: DURATION },
];

/** Plates that exist under /public; the rest render a neutral placeholder. */
export const GENERATED_PLATES: ReadonlySet<PlateId> = new Set<PlateId>([]);

export const plateUrl = (plate: PlateId) =>
  GENERATED_PLATES.has(plate) ? `/images/advertisement/tv/korean/4/${plate}.jpg` : undefined;
