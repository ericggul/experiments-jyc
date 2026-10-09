import type { SceneMark } from "../../player";

// 흥국생명 (무)가족사랑 치매간병보험 120초 DR (YouTube 6gcHvnu38yM, 1280×718 capture).
// Cut times come from ffmpeg scene detection on that upload; caption, wipe and
// blink times from per-frame colour counts at 10 fps.
export const DURATION = 120.05;

/** The gift segment runs twice: at the open and again before the legal pages. */
export const GIFT_STARTS = [0, 78.91] as const;
export const GIFT_LENGTH = 6.01;

export type PlateId =
  | "heater-spin"
  | "heater-room"
  | "heater-grille"
  | "heater-trio"
  | "hands"
  | "presenter-male"
  | "couple-back"
  | "blocks-table"
  | "presenter-female"
  | "hospital-walker"
  | "inset-dial"
  | "inset-floor"
  | "gift-thumb"
  | "cartoon-grandpa"
  | "cartoon-grandma";

/**
 * Composition prompts for the generated stills (no identifiable people, no text,
 * no logos). Framing matches the capture so captions sit where they did.
 */
export const PLATE_PROMPTS: Record<PlateId, string> = {
  "heater-spin": "Round red-and-white retro fan heater centred on a bright pink-white living room, radial motion blur and warm red light streaks, soft focus background, 16:9",
  "heater-room": "Young woman (face soft and turned away) relaxing on a cream sofa in a sunny pink-toned living room, round red fan heater large in the left foreground, perfume bottle on table, 16:9",
  "heater-grille": "Extreme close-up of a white wavy heater grille with an engraved round badge, strong red glow motion streaks on the left, 16:9",
  "heater-trio": "Three round fan heaters (red, pale blue, white with black grille) in a row on a white table, beige sofa and white tulips softly blurred behind, 16:9",
  hands: "Close-up of two elderly hands clasped together, grey knit sleeve, white airy background, subject on the right two-thirds, 16:9",
  "presenter-male": "Studio presenter in white shirt and dark red dotted tie, framed chest-up on the left third, face generic and non-identifiable, bright white window-panel backdrop with a palm at right edge, 16:9",
  "couple-back": "Elderly couple seen from behind, grey hair, arm around shoulder, pastel pink and light blue shirts, on the right half, bright white window background, 16:9",
  "blocks-table": "Elderly woman in a cream jacket playing with wooden stacking blocks at a white table, caregiver seen from behind on the left, soft window light, subject within the left half, 16:9",
  "presenter-female": "Female studio presenter in a lilac jacket, short tied hair, framed waist-up on the right third, generic face, bright white window-panel backdrop with palm leaves, 16:9",
  "hospital-walker": "Hospital corridor: elderly patient in a patterned gown using a walker, helped by a woman in a pink blouse, information desk behind, subjects in the left half, 16:9",
  "inset-dial": "Close-up of a finger turning the white dial on top of a glossy red round heater, 16:9 inset",
  "inset-floor": "Small round red heater with white grille standing on a warm wooden floor, close-up, 16:9 inset",
  "gift-thumb": "Product shot of a round red heater with white grille on a soft green-white backdrop, 4:3 thumbnail",
  "cartoon-grandpa": "Flat cartoon illustration of a smiling grandfather with glasses, mustard cardigan and cane, full body, transparent background",
  "cartoon-grandma": "Flat cartoon illustration of a smiling grandmother with curly grey hair, brown vest, green shirt and purple skirt, full body, transparent background",
};

export type Shot = { at: number; plate: PlateId | null };

const giftShots = (start: number): Shot[] => [
  { at: start, plate: "heater-spin" },
  { at: start + 1.07, plate: "heater-room" },
  { at: start + 2.44, plate: "heater-grille" },
  { at: start + 4.67, plate: "heater-trio" },
];

export const SHOTS: readonly Shot[] = [
  ...giftShots(GIFT_STARTS[0]),
  { at: 6.01, plate: "hands" },
  { at: 9.41, plate: "presenter-male" },
  { at: 13.65, plate: "couple-back" },
  { at: 27.93, plate: "blocks-table" },
  { at: 44.58, plate: "presenter-female" },
  { at: 55.72, plate: "hospital-walker" },
  { at: 70.47, plate: null },
  ...giftShots(GIFT_STARTS[1]),
  { at: 84.92, plate: null },
];

export const SCENE_IDS = [
  "gift-intro",
  "gift-warm",
  "gift-trio",
  "brand",
  "criteria",
  "cdr",
  "notice-diagnosis",
  "care",
  "notice-onset",
  "example",
  "gift-reprise",
  "legal-premium",
  "legal-refund",
  "legal-notice",
  "legal-protection",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENES: readonly (SceneMark & { id: SceneId })[] = [
  { id: "gift-intro", label: "상담 완료고객", start: 0, end: 1.07 },
  { id: "gift-warm", label: "집안 곳곳 따뜻하고 안전하게", start: 1.07, end: 4.67 },
  { id: "gift-trio", label: "스마트히팅 서큘레이터 증정!", start: 4.67, end: 6.01 },
  { id: "brand", label: "(무)흥국생명 가족사랑 치매간병보험", start: 6.01, end: 9.41 },
  { id: "criteria", label: "CDR척도 최종진단 확정시", start: 9.41, end: 13.65 },
  { id: "cdr", label: "경도·중등도·중증 치매진단금", start: 13.65, end: 27.93 },
  { id: "notice-diagnosis", label: "고지: 진단급여금 차액 지급", start: 27.93, end: 44.58 },
  { id: "care", label: "매월 100만원씩 종신토록", start: 44.58, end: 55.72 },
  { id: "notice-onset", label: "고지: 치매보장 개시일", start: 55.72, end: 70.47 },
  { id: "example", label: "보험료 예시", start: 70.47, end: 78.91 },
  { id: "gift-reprise", label: "상담완료고객 사은품증정", start: 78.91, end: 84.92 },
  { id: "legal-premium", label: "고지: 보험료", start: 84.92, end: 88.29 },
  { id: "legal-refund", label: "고지: 해지환급금", start: 88.29, end: 92.96 },
  { id: "legal-notice", label: "고지: 청약철회·품질보증해지", start: 92.96, end: 107.3 },
  { id: "legal-protection", label: "고지: 예금자 보호", start: 107.3, end: DURATION },
];

/** Plates that exist under /public; the rest render a neutral placeholder. */
export const GENERATED_PLATES: ReadonlySet<PlateId> = new Set<PlateId>([]);

export const plateUrl = (plate: PlateId | null | undefined) =>
  plate && GENERATED_PLATES.has(plate) ? `/images/advertisement/tv/korean/2/${plate}.jpg` : undefined;
