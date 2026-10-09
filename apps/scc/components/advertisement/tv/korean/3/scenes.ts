import type { SceneMark } from "../../player";

// AIA생명 무배당 우리가족 안심 치매보험 60초 (YouTube rF43ec9GcY4, TVCF capture).
// Cut times come from ffmpeg scene detection on that upload; caption and
// highlight times from 10 fps frame sheets.
export const DURATION = 59.96;

export type PlateId =
  | "bed-room"
  | "bed-pillows"
  | "bed-trio"
  | "gift-thumb"
  | "paper"
  | "card-photo"
  | "living-room"
  | "care-table"
  | "bills"
  | "worried"
  | "presenter-mcu"
  | "studio-wide"
  | "studio-walk"
  | "studio-mid"
  | "smile-man"
  | "smile-woman"
  | "presenter-cu";

/**
 * Composition prompts for generating each plate later (16:9 unless noted,
 * non-identifiable people, no text or logos in frame).
 */
export const PLATE_PROMPTS: Record<PlateId, string> = {
  "bed-room": "Bright white bedroom, double bed with white quilted bedding printed with faint pink botanical sprigs, ruffled pillows, potted grass plant at left, herringbone wood wall, soft daylight, product catalogue photo.",
  "bed-pillows": "Close view of white ruffled pillows and quilt with grey-blue botanical print, a pale blue seersucker cushion in front, striped rug at lower right, airy daylight.",
  "bed-trio": "Three side-by-side vertical panels of the same bed styled in grey-blue, pink and pale blue botanical seersucker bedding, white walls, catalogue lighting.",
  "gift-thumb": "Square catalogue thumbnail (4:3) of a made bed with white quilted botanical-print bedding against a wood wall.",
  "paper": "Flat off-white watercolour paper texture filling the frame, soft vignette, no objects.",
  "card-photo": "Square photo: elderly man seen from behind in shadow, grey hair, sitting by a lace-curtained window, muted warm tones, face not visible.",
  "living-room": "Dim traditional living room, shallow depth of field: blurred elderly figure sitting on the floor facing bright window, wooden bookcase at left, framed portrait and white pill bottle sharp in right foreground.",
  "care-table": "Living room, middle-aged woman helping an elderly woman drink at a low wooden table, both soft-focused, alarm clock sharp in left foreground, warm afternoon light.",
  "bills": "Over-the-shoulder of a woman in a yellow cardigan holding medical bills at a wooden desk, elderly woman blurred in the doorway behind, bookshelves, warm light.",
  "worried": "Medium close-up of a worried woman in her fifties in a yellow cardigan holding papers, hand on chin, bright window background, face turned three-quarter away.",
  "presenter-mcu": "Studio medium close-up of a male presenter in navy suit, white shirt and red tie gesturing with both hands, blurred white modern interior with green window light, head cropped at top so the face is not identifiable.",
  "studio-wide": "Wide studio shot: male presenter in navy suit and red tie standing at right third, blurred bright white modern living room with tall windows, empty left half for graphics.",
  "studio-walk": "Same blurred white modern living room, presenter standing at right third gesturing with open hands, generous empty space at left.",
  "studio-mid": "Medium shot of the presenter at right, palms raised, blurred white columns and sofa behind, empty left half.",
  "smile-man": "Warm portrait of a laughing middle-aged man at right, shallow focus home interior, left half soft and empty for captions.",
  "smile-woman": "Warm portrait of a smiling middle-aged woman with tied-back hair in a pale blue sweater at right, blurred bookshelf home, left half empty.",
  "presenter-cu": "Close-up of the presenter's suit, red tie and one hand raised in a beckoning gesture, blurred white interior, face out of frame.",
};

export type Shot = { at: number; plate: PlateId };

export const SHOTS: readonly Shot[] = [
  { at: 0, plate: "bed-room" },
  { at: 1.43, plate: "bed-pillows" },
  { at: 3.6, plate: "bed-trio" },
  { at: 5.97, plate: "paper" },
  { at: 8.44, plate: "living-room" },
  { at: 12.21, plate: "care-table" },
  { at: 16.02, plate: "bills" },
  { at: 19.89, plate: "worried" },
  { at: 22.46, plate: "presenter-mcu" },
  { at: 24.29, plate: "studio-wide" },
  { at: 27.99, plate: "studio-walk" },
  { at: 32.37, plate: "studio-mid" },
  { at: 39.47, plate: "smile-man" },
  { at: 40.71, plate: "smile-woman" },
  { at: 41.81, plate: "smile-man" },
  { at: 43.04, plate: "smile-woman" },
  { at: 45.71, plate: "presenter-cu" },
];

export const SCENE_IDS = [
  "consult",
  "cool",
  "set",
  "family",
  "time",
  "strength",
  "money",
  "afford",
  "presenter",
  "product",
  "rider",
  "diagnosis",
  "reassure",
  "call",
  "legal-notice",
  "legal-terms",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENES: readonly (SceneMark & { id: SceneId })[] = [
  { id: "consult", label: "상담만 받아도", start: 0, end: 1.43 },
  { id: "cool", label: "쿨 사커 소재로 시원한 청량감!", start: 1.43, end: 3.6 },
  { id: "set", label: "침구 3종 세트를 드립니다!", start: 3.6, end: 5.97 },
  { id: "family", label: "우리 가족에게 치매가 찾아오면", start: 5.97, end: 8.44 },
  { id: "time", label: "치매, 시간이 듭니다", start: 8.44, end: 12.21 },
  { id: "strength", label: "치매, 힘이 듭니다", start: 12.21, end: 16.02 },
  { id: "money", label: "치매, 돈이 듭니다", start: 16.02, end: 19.89 },
  { id: "afford", label: "다 감당할 수 있을까요?", start: 19.89, end: 22.46 },
  { id: "presenter", label: "생명보험 판매자격 보유", start: 22.46, end: 24.29 },
  { id: "product", label: "우리가족 안심 치매보험", start: 24.29, end: 27.99 },
  { id: "rider", label: "매월 평~생 보장", start: 27.99, end: 32.37 },
  { id: "diagnosis", label: "경도·중등도·중증 치매 진단금", start: 32.37, end: 39.47 },
  { id: "reassure", label: "간편심사 통과 시 가입가능", start: 39.47, end: 45.71 },
  { id: "call", label: "지금 바로 전화 주세요", start: 45.71, end: 47.18 },
  { id: "legal-notice", label: "고지: 계약 해지·예금자보호", start: 47.18, end: 55.89 },
  { id: "legal-terms", label: "고지: 보장 개시·약관", start: 55.89, end: DURATION },
];

/** Plates that exist under /public; the rest render a neutral placeholder. */
export const GENERATED_PLATES: ReadonlySet<PlateId> = new Set<PlateId>([]);

export const plateUrl = (plate: PlateId) =>
  GENERATED_PLATES.has(plate) ? `/images/advertisement/tv/korean/3/${plate}.jpg` : undefined;
