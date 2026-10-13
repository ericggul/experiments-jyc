// Page geometry is in PDF points; one point renders as one CSS pixel on an
// unscaled 842 × 1191 sheet.

/** Font classes of the HWP originals: 명조, 견명조, 중고딕, 디나루, 태고딕/신그래픽, overprinted 태고딕, 견고딕, area title, 수식 roman and italic. */
export type PaperFont = "m" | "mb" | "g" | "d" | "gb" | "gh" | "gx" | "gt" | "e" | "ei";

export type PaperRun = {
  id: string;
  t: string;
  f: PaperFont;
  /** Printed x of the run from the line start, and its advance up to the next run (a word and its space). */
  x: number;
  w: number;
  /** Ink end of the run's last glyph, from the run start; the trailing space takes the rest of `w`. */
  e: number;
  /** Font size when it differs from the segment's. */
  s?: number;
  c?: string;
  /** Baseline shift in points. */
  dy?: number;
  /** b: boxed phrase, u: underlined phrase. */
  m?: "b" | "u";
};

/** One run of glyphs set at its own x on one baseline; its runs tile it word by word. */
export type PaperLine = { k: "line"; id: string; x: number; y: number; w: number; s: number; runs: PaperRun[] };
export type PaperHRule = { k: "h"; id: string; x: number; y: number; w: number; sw: number; color: string | null };
export type PaperVRule = { k: "v"; id: string; x: number; y: number; h: number; sw: number; color: string | null };
export type PaperDiagonal = { k: "d"; id: string; x: number; y: number; x2: number; y2: number; sw: number; color: string | null };
export type PaperBox = { k: "box"; id: string; x: number; y: number; w: number; h: number; r: number; sw: number; color: string | null };
export type PaperFill = { k: "fill"; id: string; x: number; y: number; w: number; h: number; color: string };
export type PaperFigure = { k: "fig"; id: string; x: number; y: number; w: number; h: number };

export type PaperItem = PaperLine | PaperHRule | PaperVRule | PaperDiagonal | PaperBox | PaperFill | PaperFigure;

export type PaperPage = { n: number; items: PaperItem[] };

export const SHEET_WIDTH = 842;
export const SHEET_HEIGHT = 1191;
