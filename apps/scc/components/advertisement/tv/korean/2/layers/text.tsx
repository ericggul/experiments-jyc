import type { CSSProperties } from "react";
import { FittedLine, type FittedLineData } from "../../../player";
import { FITTED } from "../fitted";

// Palette sampled from the capture (median ink of each run, 1920×1080 upscale).
export const WHITE = "#ffffff";
export const BLACK = "#111311";
export const GREY = "#2b2d2b";
export const PINK = "#e4107c";
export const HOT_PINK = "#ee1683";
export const PURPLE = "#2c1061";
export const LAVENDER = "#a096cb";
export const GOLD = "#b48614";
export const NAVY = "#0b3a74";
export const YELLOW = "#fff299";
export const ORANGE = "#ee8a1c";
export const MAROON = "#601435";
export const LEGAL_PINK = "#a8195c";

export type LineId = keyof typeof FITTED;

/** Thin dark ring used on the broadcast's outlined white numerals and titles. */
export const outline = (width: number, color: string) => {
  const steps = 12;
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return `${(Math.cos(a) * width).toFixed(2)}px ${(Math.sin(a) * width).toFixed(2)}px 0 ${color}`;
  }).join(", ");
};

/**
 * A fitted caption line. `colors` tints syllables by index (spaces are not
 * counted), for the spot's two-colour lines and blinking highlight runs.
 */
export function L({
  id,
  color = WHITE,
  colors,
  shadow,
  style,
}: {
  id: LineId;
  color?: string;
  colors?: (index: number) => string | undefined;
  shadow?: string;
  style?: CSSProperties;
}) {
  const line = FITTED[id] as FittedLineData;
  if (!colors) return <FittedLine line={line} color={color} shadow={shadow} style={style} />;
  let index = -1;
  return (
    <FittedLine line={line} color={color} shadow={shadow} style={style}>
      {Array.from(line.text).map((char, position) => {
        if (char !== " ") index += 1;
        const tint = char === " " ? undefined : colors(index);
        return (
          <span key={`${id}-${position}`} style={tint ? { color: tint } : undefined}>
            {char}
          </span>
        );
      })}
    </FittedLine>
  );
}

/** Syllable range [from, to) → colour, else undefined. */
export const run = (from: number, to: number, color: string) => (i: number) => (i >= from && i < to ? color : undefined);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0→1 between a and b. */
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (k: number) => 1 - (1 - k) * (1 - k) * (1 - k);

/** Highlight blink measured on the legal pages: off 0.2 s, then on 0.3 s / off 0.4 s. */
export const BLINK_PERIOD = 0.7;
export function blinkOn(t: number, windows: readonly (readonly [number, number])[]) {
  for (const [a, b] of windows) {
    // 0.52 keeps sampled frame times off the exact on/off boundary.
    if (t >= a && t < b) return (t - a + 0.52) % BLINK_PERIOD < 0.3;
  }
  return true;
}
