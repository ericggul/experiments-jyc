import type { CSSProperties, ReactNode } from "react";
import { FittedLine, type FittedLineData } from "../../../player";
import { FITTED } from "../fitted";
import { FAMILY } from "../fonts";

// Colours sampled from the capture (medians of the masked ink).
export const WHITE = "#ffffff";
export const CAPTION_RED = "#f41a4d";
export const DX_PINK = "#ff386c";
export const SOFT_PINK = "#ff739d";
export const INK = "#272a23";
export const OUTLINE = "#1b1f1b";
export const PHONE_RED = "#ca0633";
export const AIA_RED = "#ef1e3b";
export const LEGAL_RED = "#cd304f";
export const LEGAL_INK = "#050806";
export const LEGAL_HIGHLIGHT = "#911830";
export const BAR_WHITE = "#fbfcfb";

/** Drop shadow under the white display captions (dark, offset down-right). */
export const CAPTION_SHADOW = "3px 4px 4px rgba(0,0,0,0.5)";

export type LineId = keyof typeof FITTED;
type Fitted = FittedLineData & { family: string; scale?: number };

export const fitted = (id: LineId) => FITTED[id] as Fitted;

/** Colour by syllable index (spaces not counted); undefined keeps the line colour. */
export type Tint = (index: number) => string | undefined;

/**
 * One fitted caption line. `colors` tints syllables; `visible` hides syllables
 * (keeping their advance) for typewriter reveals.
 */
export function L({
  id,
  color = WHITE,
  colors,
  visible,
  shadow,
  style,
  text,
}: {
  id: LineId;
  color?: string;
  colors?: Tint;
  visible?: (index: number) => boolean;
  shadow?: string;
  style?: CSSProperties;
  /** Replacement text with the same syllable count (e.g. a masked name). */
  text?: string;
}) {
  const line = fitted(id);
  const base: CSSProperties = {
    fontFamily: FAMILY[line.family],
    ...(line.scale ? { transform: `scaleX(${line.scale})`, transformOrigin: "0 0" } : null),
    ...style,
  };
  const content = text ?? line.text;
  let children: ReactNode;
  if (colors || visible) {
    let index = -1;
    children = Array.from(content).map((char, position) => {
      if (char !== " ") index += 1;
      const i = index;
      const tint = char === " " ? undefined : colors?.(i);
      const hidden = char !== " " && visible ? !visible(i) : false;
      return (
        <span key={`${id}-${position}`} style={tint || hidden ? { color: tint, visibility: hidden ? "hidden" : undefined } : undefined}>
          {char}
        </span>
      );
    });
  }
  return (
    <FittedLine line={{ ...line, text: content }} color={color} shadow={shadow} style={base}>
      {children}
    </FittedLine>
  );
}

/** Syllables [from, to) in `color`. */
export const run =
  (from: number, to: number, color: string): Tint =>
  (i) =>
    i >= from && i < to ? color : undefined;

/** Stroke-only style for the under-layer of outlined type (the fill is drawn on top). */
const strokeUnder = (color: string, width: number): CSSProperties => ({
  WebkitTextStroke: `${width}px ${color}`,
  color,
});

/**
 * Outlined display type (gift captions, labels): a stroked copy underneath and
 * the plain fill on top, so the stroke only shows outside the glyphs.
 */
export function Outlined({
  id,
  fill = WHITE,
  stroke = OUTLINE,
  width = 13,
  fillStyle,
  colors,
  visible,
}: {
  id: LineId;
  fill?: string;
  stroke?: string;
  width?: number;
  fillStyle?: CSSProperties;
  colors?: Tint;
  visible?: (index: number) => boolean;
}) {
  return (
    <>
      <L id={id} style={strokeUnder(stroke, width)} visible={visible} />
      <L id={id} color={fill} style={fillStyle} colors={colors} visible={visible} />
    </>
  );
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0→1 over [at, at + duration]. */
export const ramp = (t: number, at: number, duration: number) => clamp01((t - at) / duration);
export const easeOut = (p: number) => 1 - (1 - p) * (1 - p) * (1 - p);
