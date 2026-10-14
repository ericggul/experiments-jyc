// Graph data: one polygon chart per scene. The renderer draws any 3–8 axes; only the
// six-axis scene is shown for now, the others wait. Values are fictional.
export type Axis = { label: string; en: string; mine: number; recommended: number };

export type GraphScene = {
  id: string;
  label: string;
  axes: readonly Axis[];
};

/** Seconds each scene's draw-in takes before it loops. */
export const SCENE_LENGTH = 9;

export const SCENES: readonly GraphScene[] = [
  {
    id: "coverage-6",
    label: "보장 분석 · 6대 항목",
    axes: [
      { label: "암 진단비", en: "Cancer", mine: 0.35, recommended: 0.9 },
      { label: "뇌혈관질환", en: "Stroke", mine: 0.2, recommended: 0.85 },
      { label: "심장질환", en: "Heart disease", mine: 0.3, recommended: 0.85 },
      { label: "입원비", en: "Hospital stay", mine: 0.8, recommended: 0.75 },
      { label: "수술비", en: "Surgery", mine: 0.7, recommended: 0.8 },
      { label: "간병비", en: "Nursing care", mine: 0.15, recommended: 0.7 },
    ],
  },
  {
    id: "health-5",
    label: "건강 분석 · 5가지 균형",
    axes: [
      { label: "혈관 건강", en: "Circulation", mine: 0.4, recommended: 0.9 },
      { label: "관절·뼈", en: "Joints & bones", mine: 0.35, recommended: 0.85 },
      { label: "면역력", en: "Immunity", mine: 0.7, recommended: 0.85 },
      { label: "눈 건강", en: "Eyesight", mine: 0.75, recommended: 0.8 },
      { label: "소화 기능", en: "Digestion", mine: 0.8, recommended: 0.85 },
    ],
  },
  {
    id: "major-3",
    label: "3대 질병 대비",
    axes: [
      { label: "암", en: "Cancer", mine: 0.4, recommended: 0.95 },
      { label: "뇌혈관질환", en: "Stroke", mine: 0.25, recommended: 0.9 },
      { label: "심장질환", en: "Heart disease", mine: 0.3, recommended: 0.9 },
    ],
  },
];

/** Beat times (s) inside a scene's draw-in. */
export const BEATS = {
  grid: [0.5, 1.2],
  spokes: [1.0, 1.6],
  labels: [1.4, 2.4],
  recommended: [2.4, 3.4],
  mine: [3.6, 4.8],
  deficits: 5.0,
} as const;

/** The moment the hexagon is fully drawn, dots pulsing: where the wall holds for now. */
export const HELD_AT = 7;
