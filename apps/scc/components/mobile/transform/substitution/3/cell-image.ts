/**
 * A cell drawn as an SVG image at its exact CSS-pixel size: the command's capitals stretched to fill it edge to edge,
 * as lettering fills the bars of an OMA diagram. Vector, so it stays sharp at any device pixel ratio.
 */

/**
 * Typefaces for the words. A data-URI SVG image cannot load web fonts, so each is a system face present on iOS and macOS,
 * with fallbacks elsewhere. `cap` is the face's cap height as a share of the em, so capitals fill the cell exactly.
 */
export const fonts = [
  { id: "grotesque", label: "그로테스크", name: "Helvetica", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 700, cap: 0.716 },
  { id: "condensed", label: "콘덴스드", name: "Avenir Condensed", family: "'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif", weight: 800, cap: 0.708 },
  { id: "geometric", label: "지오메트릭", name: "Futura", family: "Futura, 'Century Gothic', 'Avenir Next', sans-serif", weight: 700, cap: 0.7 },
  { id: "serif", label: "세리프", name: "Didot", family: "Didot, 'Bodoni 72', 'Bodoni MT', 'Times New Roman', serif", weight: 700, cap: 0.69 },
  { id: "typewriter", label: "타자", name: "Typewriter", family: "'American Typewriter', 'Courier New', Courier, monospace", weight: 700, cap: 0.66 },
  { id: "mono", label: "모노", name: "Menlo", family: "Menlo, Monaco, Consolas, 'Courier New', monospace", weight: 700, cap: 0.73 },
] as const;

export type FontId = (typeof fonts)[number]["id"];

/**
 * What colour the letters take: the ink of the ground (black on white, white on black), each part's own representative colour,
 * or a random hue per part at full saturation and half lightness.
 */
export type Ink = "mono" | "colour" | "random";

/**
 * How every cell is drawn: typeface, frame weight (0 none, 1 hairline, up to 6 heavy; below 1 the hairline fades), dark ground,
 * ink, and `edge`, a frame in the ink along the screen's own edge (a phone's bezel, as the gap between phones gives `/mobiles/2`).
 * `ink` and `edge` are optional (mono, none), so a look made before they existed reads the same.
 */
export type Look = { font: FontId; border: number; dark: boolean; ink?: Ink; edge?: number };

/** The widest outer frame (바깥 테두리), in px of the screen's own edge. */
export const EDGE_MAX = 12;

export const BORDER_MAX = 6;

/** Ink, paper, and the frame's colour and stroke width for a look. */
export function palette(look: Look) {
  const ink = look.dark ? "#fff" : "#000";
  const paper = look.dark ? "#000" : "#fff";
  const alpha = Math.min(1, Math.max(0, look.border));
  const frame = alpha === 0 ? "transparent" : alpha === 1 ? ink : look.dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
  return { ink, paper, frame, stroke: look.border <= 0 ? 0 : Math.max(1, look.border) };
}

/** Below this height there is no room for letters; the cell is drawn as a frame alone. */
export const MIN_LETTER_HEIGHT = 5;

export type CellImage = {
  width: number;
  height: number;
  word: string | null;
  /** Draw the paper field and the frame inside the image (text cells); element cells get them from CSS instead. */
  framed: boolean;
  /** Letters keep this far from each side: the frame plus a hairline, more inside a rounded shape. */
  insetX: number;
  insetY: number;
  look: Look;
  /** The part's own colour for its letters (대표색); without it the letters take the ground's ink. */
  colour?: string | null;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function cellSvg({ width, height, word, framed, insetX, insetY, look, colour }: CellImage) {
  const w = round(width);
  const h = round(height);
  const { ink: mono, paper, frame, stroke } = palette(look);
  const ink = colour || mono;
  const font = fonts.find((face) => face.id === look.font) ?? fonts[0];
  let body = "";
  if (framed) {
    const half = stroke / 2;
    body = stroke
      ? `<rect x="${round(half)}" y="${round(half)}" width="${round(Math.max(0, w - stroke))}" height="${round(Math.max(0, h - stroke))}" fill="${paper}" stroke="${frame}" stroke-width="${round(stroke)}"/>`
      : `<rect width="${w}" height="${h}" fill="${paper}"/>`;
  }
  const capHeight = h - insetY * 2;
  const length = w - insetX * 2;
  if (word && capHeight >= MIN_LETTER_HEIGHT && length >= 4) {
    const fontSize = round(capHeight / font.cap);
    body += `<text x="${round(insetX)}" y="${round(insetY + capHeight)}" font-family="${font.family}" font-weight="${font.weight}" font-size="${fontSize}" textLength="${round(length)}" lengthAdjust="spacingAndGlyphs" fill="${ink}">${word}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

const urls = new Map<string, string>();

/** The image as a CSS `url()`; `#` and quotes must be escaped inside a data URI. Repeated cells reuse the same string. */
export function cellUrl(image: CellImage) {
  const { look } = image;
  const key = `${round(image.width)}|${round(image.height)}|${image.word}|${image.framed}|${round(image.insetX)}|${round(image.insetY)}|${look.font}|${look.border}|${look.dark}|${image.colour ?? ""}`;
  let url = urls.get(key);
  if (!url) {
    if (urls.size > 4000) urls.clear();
    urls.set(key, (url = `url("data:image/svg+xml,${encodeURIComponent(cellSvg(image))}")`));
  }
  return url;
}

/** How far letters keep from the edge of a box whose corners are rounded by `radius`: clear of the curve at the letters' corners. */
export function roundedInset(radius: number, width: number, height: number) {
  const r = Math.min(radius, width / 2, height / 2);
  return r * (1 - Math.SQRT1_2);
}
