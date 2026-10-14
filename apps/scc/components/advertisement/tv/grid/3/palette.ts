// Colour palettes for the wall, all in the daytime direct-response insurance register.
// The default is the korean/5 palette; the others swap every colour role at once.
export type Palette = {
  id: string;
  label: string;
  /** Headline, phone number, verdict box, axis pills, bar start. */
  primary: string;
  /** Bar gradient end. */
  primaryLight: string;
  /** Kicker, call label, deficit pills, legend square. */
  accent: string;
  /** "My coverage" polygon: fill gradient top and bottom, and its stroke. */
  mine: { top: string; bottom: string; stroke: string };
  /** Verdict number and deficit dots. */
  highlight: string;
  /** Recommended polygon stroke; the fill is this at low alpha. */
  recommended: string;
  recommendedFill: string;
  /** Frame background gradient, top to bottom. */
  background: [string, string];
  /** Radar web: rings and spokes; the web's own fill, centre to edge. */
  web: string;
  webFill: [string, string];
  /** Marker, footnote and legend text. */
  muted: { marker: string; footnote: string; legend: string };
};

export const PALETTES: readonly Palette[] = [
  {
    id: "navy",
    label: "기본",
    primary: "#123a8c",
    primaryLight: "#1e56c4",
    accent: "#e8262f",
    mine: { top: "#ff5a4e", bottom: "#e8262f", stroke: "#b5121b" },
    highlight: "#ffe100",
    recommended: "#2468e6",
    recommendedFill: "rgba(36, 104, 230, 0.16)",
    background: ["#f7faff", "#dfe9f8"],
    web: "#8ea6d6",
    webFill: ["#ffffff", "#e3ecfa"],
    muted: { marker: "#6b7a99", footnote: "#5b6680", legend: "#33415c" },
  },
  {
    id: "green",
    label: "초록",
    primary: "#0b6b3a",
    primaryLight: "#169a52",
    accent: "#f26a1b",
    mine: { top: "#ff8a3d", bottom: "#f26a1b", stroke: "#b94a0a" },
    highlight: "#ffd400",
    recommended: "#1f9d55",
    recommendedFill: "rgba(31, 157, 85, 0.16)",
    background: ["#f6fcf7", "#dcefe2"],
    web: "#8fc4a5",
    webFill: ["#ffffff", "#e2f3e8"],
    muted: { marker: "#5f7a68", footnote: "#50665a", legend: "#2e463a" },
  },
  {
    id: "red",
    label: "빨강",
    primary: "#c8102e",
    primaryLight: "#e8354f",
    accent: "#1a1a1a",
    mine: { top: "#5a5a5a", bottom: "#2a2a2a", stroke: "#111111" },
    highlight: "#ffe100",
    recommended: "#e03a53",
    recommendedFill: "rgba(224, 58, 83, 0.14)",
    background: ["#fffafa", "#f4e4e6"],
    web: "#d9a2ab",
    webFill: ["#ffffff", "#fbe9ec"],
    muted: { marker: "#8a6a6e", footnote: "#705559", legend: "#3f2f31" },
  },
  {
    id: "purple",
    label: "보라",
    primary: "#4b2a8a",
    primaryLight: "#6d47b8",
    accent: "#e23d5a",
    mine: { top: "#ff6b84", bottom: "#e23d5a", stroke: "#a8203a" },
    highlight: "#c6f000",
    recommended: "#7a4fd6",
    recommendedFill: "rgba(122, 79, 214, 0.16)",
    background: ["#faf8ff", "#e6def7"],
    web: "#b3a1d9",
    webFill: ["#ffffff", "#ece6f8"],
    muted: { marker: "#7a6f99", footnote: "#645a80", legend: "#3b3252" },
  },
  {
    id: "teal",
    label: "청록",
    primary: "#0e6f7a",
    primaryLight: "#1598a6",
    accent: "#ff6f59",
    mine: { top: "#ff9078", bottom: "#ff6f59", stroke: "#c9442f" },
    highlight: "#ffc83d",
    recommended: "#13a3b5",
    recommendedFill: "rgba(19, 163, 181, 0.16)",
    background: ["#f4fcfd", "#d9eef1"],
    web: "#8cc4cc",
    webFill: ["#ffffff", "#e0f3f5"],
    muted: { marker: "#5e7f85", footnote: "#4f6c71", legend: "#2d4549" },
  },
];

export type PaletteId = (typeof PALETTES)[number]["id"];
export const DEFAULT_PALETTE = PALETTES[0];
