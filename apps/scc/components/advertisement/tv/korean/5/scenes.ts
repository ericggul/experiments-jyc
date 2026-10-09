import type { SceneMark } from "../../player";

// Daytime direct-response analysis spot: one centred polygon chart per scene.
// Data only — the renderer draws any 3–8 axes. Brand and number are fictional.
export const BRAND = "한마음생명";
export const PRODUCT = "(무)든든한 건강보장보험";
export const PHONE = "080-000-1234";

export type Axis = { label: string; mine: number; recommended: number };

export type AnalysisScene = SceneMark & {
  kicker: string;
  title: string;
  /** Highlighted conclusion shown after the chart has drawn. */
  verdict: [string, string];
  axes: readonly Axis[];
  footnote: string;
};

const SCENE_LENGTH = 9;

const defs: Omit<AnalysisScene, "start" | "end">[] = [
  {
    id: "coverage-6",
    label: "보장 분석 · 6대 항목",
    kicker: "무료 보장분석 결과",
    title: "내 보험, 제대로 준비되어 있을까요?",
    verdict: ["부족한 보장", "3가지"],
    axes: [
      { label: "암 진단비", mine: 0.35, recommended: 0.9 },
      { label: "뇌혈관질환", mine: 0.2, recommended: 0.85 },
      { label: "심장질환", mine: 0.3, recommended: 0.85 },
      { label: "입원비", mine: 0.8, recommended: 0.75 },
      { label: "수술비", mine: 0.7, recommended: 0.8 },
      { label: "간병비", mine: 0.15, recommended: 0.7 },
    ],
    footnote: "본 화면은 이해를 돕기 위한 예시이며 실제 보장분석 결과와 다를 수 있습니다",
  },
  {
    id: "health-5",
    label: "건강 분석 · 5가지 균형",
    kicker: "50대 이후 건강 밸런스",
    title: "나이가 들수록 무너지는 건강 균형",
    verdict: ["관리가 필요한 부분", "2가지"],
    axes: [
      { label: "혈관 건강", mine: 0.4, recommended: 0.9 },
      { label: "관절·뼈", mine: 0.35, recommended: 0.85 },
      { label: "면역력", mine: 0.7, recommended: 0.85 },
      { label: "눈 건강", mine: 0.75, recommended: 0.8 },
      { label: "소화 기능", mine: 0.8, recommended: 0.85 },
    ],
    footnote: "건강 상태는 개인에 따라 다르며 정확한 진단은 전문의와 상담하십시오",
  },
  {
    id: "major-3",
    label: "3대 질병 대비",
    kicker: "3대 질병, 얼마나 대비하셨나요?",
    title: "암 · 뇌 · 심장 한 번에 확인하세요",
    verdict: ["3대 질병 대비", "부족"],
    axes: [
      { label: "암", mine: 0.4, recommended: 0.95 },
      { label: "뇌혈관질환", mine: 0.25, recommended: 0.9 },
      { label: "심장질환", mine: 0.3, recommended: 0.9 },
    ],
    footnote: "가입 전 상품설명서 및 약관을 반드시 확인하시기 바랍니다",
  },
];

export const SCENES: readonly AnalysisScene[] = defs.map((scene, i) => ({
  ...scene,
  start: i * SCENE_LENGTH,
  end: (i + 1) * SCENE_LENGTH,
}));

export const DURATION = SCENES.length * SCENE_LENGTH;

/** Beat times (s) inside each scene. */
export const BEATS = {
  title: 0.2,
  grid: [0.5, 1.2],
  spokes: [1.0, 1.6],
  labels: [1.4, 2.4],
  recommended: [2.4, 3.4],
  mine: [3.6, 4.8],
  deficits: 5.0,
  verdict: 5.8,
} as const;
