import type { SceneMark } from "../../player";

// 라이나생명 무배당 OK실버보험 120초 DR (YouTube TDbqqtEcChU, channel capture).
// Cut times come from ffmpeg scene detection on that upload; highlight and
// logo times from per-frame colour counts at 10 fps.
export const DURATION = 119.65;

export type PlateId =
  | "library-mcu"
  | "cafe-wide"
  | "cafe-hands"
  | "cafe-counter"
  | "barista-cu"
  | "dance-wide"
  | "dance-couple"
  | "couple-cu"
  | "class-wide"
  | "class-kids"
  | "class-teacher"
  | "teacher-cu"
  | "library-wide"
  | "library-cu"
  | "brick-wide"
  | "brick-medium"
  | "brick-cu"
  | "chalk"
  | "telephone"
  | "crowd";

export type Shot = { at: number; plate: PlateId };

export const SHOTS: readonly Shot[] = [
  { at: 0, plate: "library-mcu" },
  { at: 3.97, plate: "cafe-wide" },
  { at: 4.67, plate: "cafe-hands" },
  { at: 6.03, plate: "cafe-counter" },
  { at: 9.13, plate: "barista-cu" },
  { at: 12.57, plate: "dance-wide" },
  { at: 14.4, plate: "dance-couple" },
  { at: 17.63, plate: "couple-cu" },
  { at: 21.47, plate: "class-wide" },
  { at: 22.3, plate: "class-kids" },
  { at: 23.1, plate: "class-teacher" },
  { at: 26.23, plate: "teacher-cu" },
  { at: 30.3, plate: "library-wide" },
  { at: 34.77, plate: "library-cu" },
  { at: 39.33, plate: "brick-wide" },
  { at: 44.17, plate: "brick-medium" },
  { at: 49.6, plate: "brick-cu" },
  { at: 51.57, plate: "chalk" },
  { at: 55.77, plate: "brick-cu" },
  { at: 62.43, plate: "telephone" },
  { at: 64.43, plate: "crowd" },
  { at: 66.37, plate: "brick-medium" },
  { at: 69.9, plate: "brick-cu" },
  { at: 75.33, plate: "telephone" },
];

export const SCENE_IDS = [
  "intro",
  "barista",
  "barista-cu",
  "dancers",
  "couple-cu",
  "storyteller",
  "teacher-cu",
  "disappointed",
  "disappointed-cu",
  "age",
  "no-exam",
  "premium",
  "chalk",
  "payout",
  "check",
  "call",
  "joined",
  "anyone",
  "call-now",
  "call-again",
  "legal-premium",
  "legal-refund",
  "legal-notice",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENES: readonly (SceneMark & { id: SceneId })[] = [
  { id: "intro", label: "보험 걱정 없이 가입", start: 0, end: 3.97 },
  { id: "barista", label: "실버 바리스타", start: 3.97, end: 9.13 },
  { id: "barista-cu", label: "진단서 없이 가입 가능", start: 9.13, end: 12.57 },
  { id: "dancers", label: "실버 라틴댄서", start: 12.57, end: 17.63 },
  { id: "couple-cu", label: "심사 필요 없이 가입 가능", start: 17.63, end: 21.47 },
  { id: "storyteller", label: "구연동화 선생님", start: 21.47, end: 26.23 },
  { id: "teacher-cu", label: "복잡하게 묻지 않고 가입 가능", start: 26.23, end: 30.3 },
  { id: "disappointed", label: "보험! 가입시켜줄 것 같더니", start: 30.3, end: 34.77 },
  { id: "disappointed-cu", label: "가입 안돼서 실망스러우셨죠?", start: 34.77, end: 39.33 },
  { id: "age", label: "55~83세 라면", start: 39.33, end: 44.17 },
  { id: "no-exam", label: "무진단 무심사 가입 가능", start: 44.17, end: 49.6 },
  { id: "premium", label: "보험료 오를 걱정도 없습니다", start: 49.6, end: 51.57 },
  { id: "chalk", label: "가입 2년 이후 사망시 요긴하게 대비", start: 51.57, end: 55.77 },
  { id: "payout", label: "사망보험금 1천만원 일시금 지급", start: 55.77, end: 59.5 },
  { id: "check", label: "직접 확인해보세요", start: 59.5, end: 62.43 },
  { id: "call", label: "지금 바로 전화주세요", start: 62.43, end: 64.43 },
  { id: "joined", label: "가입 됐습니다", start: 64.43, end: 66.37 },
  { id: "anyone", label: "나이·지병·병력 상관없으니까", start: 66.37, end: 73.3 },
  { id: "call-now", label: "지금 전화해 보세요", start: 73.3, end: 75.33 },
  { id: "call-again", label: "지금 바로 전화주세요", start: 75.33, end: 77.33 },
  { id: "legal-premium", label: "고지: 보험료", start: 77.33, end: 93.8 },
  { id: "legal-refund", label: "고지: 해지환급금", start: 93.8, end: 99.8 },
  { id: "legal-notice", label: "고지: 청약철회·예금자보호", start: 99.8, end: DURATION },
];

/** Plates that exist under /public; the rest render a neutral placeholder. */
export const GENERATED_PLATES: ReadonlySet<PlateId> = new Set<PlateId>([]);

export const plateUrl = (plate: PlateId) =>
  GENERATED_PLATES.has(plate) ? `/images/advertisement/tv/korean/1/${plate}.jpg` : undefined;
