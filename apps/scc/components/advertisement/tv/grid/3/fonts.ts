import { Archivo, Barlow_Semi_Condensed, Inter_Tight, Oswald, Roboto_Condensed } from "next/font/google";
import { pretendard, spoqa } from "@/components/advertisement/tv/fonts";

// Candidate faces for the English labels. The Korean pills are heavy, compact gothic; these are
// the Latin faces that can match that weight and density, from grotesque to condensed display.
const archivo = Archivo({ subsets: ["latin"], weight: "variable", display: "block", preload: false });
const barlow = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], display: "block", preload: false });
const interTight = Inter_Tight({ subsets: ["latin"], weight: "variable", display: "block", preload: false });
const oswald = Oswald({ subsets: ["latin"], weight: "variable", display: "block", preload: false });
const robotoCondensed = Roboto_Condensed({ subsets: ["latin"], weight: "variable", display: "block", preload: false });

export type LatinFont = { id: string; label: string; className: string; /** CSS font-family list, for canvas text. */ family: string; /** Heaviest weight the face has. */ max: number };

export const LATIN_FONTS: readonly LatinFont[] = [
  { id: "spoqa", label: "Spoqa", className: spoqa.className, family: spoqa.style.fontFamily, max: 700 },
  { id: "pretendard", label: "Pretendard", className: pretendard.className, family: pretendard.style.fontFamily, max: 900 },
  { id: "archivo", label: "Archivo", className: archivo.className, family: archivo.style.fontFamily, max: 900 },
  { id: "inter-tight", label: "Inter Tight", className: interTight.className, family: interTight.style.fontFamily, max: 900 },
  { id: "roboto-condensed", label: "Roboto Cond.", className: robotoCondensed.className, family: robotoCondensed.style.fontFamily, max: 900 },
  { id: "barlow", label: "Barlow Semi", className: barlow.className, family: barlow.style.fontFamily, max: 900 },
  { id: "oswald", label: "Oswald", className: oswald.className, family: oswald.style.fontFamily, max: 700 },
];

export const DEFAULT_LATIN_FONT = LATIN_FONTS[0];
