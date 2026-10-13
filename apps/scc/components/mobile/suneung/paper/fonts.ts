import localFont from "next/font/local";

// HWP 신명조/한양신명조 → Nanum Myeongjo; 중고딕·태고딕·견고딕 → Noto Sans KR weights.
// Self-hosted subsets (KS X 1001 Hangul, symbols, and every glyph in the booklet); OFL in ./fonts.
export const myeongjo = localFont({
  src: [
    { path: "./fonts/myeongjo-400.woff2", weight: "400" },
    { path: "./fonts/myeongjo-700.woff2", weight: "700" },
    { path: "./fonts/myeongjo-800.woff2", weight: "800" },
  ],
  display: "block",
  preload: false,
  variable: "--suneung-myeongjo",
});

export const gothic = localFont({
  src: "./fonts/gothic-variable.woff2",
  weight: "100 900",
  display: "block",
  preload: false,
  variable: "--suneung-gothic",
});

/** Noto Serif KR jamo only: composes 옛한글 (코ᇰ, 어버ᅀᅵ, ᄀᆞᄃᆞᆨ) that Nanum Myeongjo lacks. */
export const oldHangul = localFont({
  src: "./fonts/old-hangul.woff2",
  weight: "400 800",
  display: "block",
  preload: false,
  variable: "--suneung-old-hangul",
});

/** Latin Modern for HWP 수식 (HyhwpEQ is a Computer Modern cut): roman, italic variables, then the math face for ∫ Σ ⎧ ⎨ ⎩. */
export const equation = localFont({
  src: [
    { path: "./fonts/latin-modern-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/latin-modern-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "block",
  preload: false,
  variable: "--suneung-equation",
});

export const equationSymbols = localFont({
  src: "./fonts/latin-modern-math.woff2",
  weight: "400",
  display: "block",
  preload: false,
  variable: "--suneung-equation-symbols",
});
