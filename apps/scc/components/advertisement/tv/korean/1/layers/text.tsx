import type { CSSProperties, ReactNode } from "react";

// Caption primitives. Every line is placed by the top-left of its ink box in
// frame pixels; `size` and `track` were fitted against reference frames.
export const WHITE = "#ffffff";
export const YELLOW = "#ffcc00";
export const BAR_BLUE = "#0945a2";
export const NUMBER_BLUE = "#0060a9";

/** Distance from the CSS line box top to the Hangul ink top at line-height 1, per px of size. */
const INK_TOP = 0.085;
/** Distance from the CSS box left to the first glyph's ink, per px of size. */
const INK_LEFT = 0.02;

export const CAPTION_SHADOW = "0 2px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.35)";

export type LineSpec = {
  /** Ink box left / top in frame px. */
  x: number;
  y: number;
  size: number;
  /** Letter spacing in em. */
  track?: number;
  weight?: number;
  /** Horizontal scale for condensed setting. */
  scaleX?: number;
};

export function Line({
  spec,
  color = WHITE,
  shadow = CAPTION_SHADOW,
  children,
  style,
}: {
  spec: LineSpec;
  color?: string;
  shadow?: string | false;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { x, y, size, track = -0.02, weight = 600, scaleX } = spec;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size * INK_LEFT,
        top: y - size * INK_TOP,
        fontSize: size,
        lineHeight: 1,
        fontWeight: weight,
        letterSpacing: `${track}em`,
        color,
        whiteSpace: "pre",
        textShadow: shadow || undefined,
        transform: scaleX ? `scaleX(${scaleX})` : undefined,
        transformOrigin: "0 0",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Colour runs inside a line: [text, coloured] pairs. */
export function Runs({ runs, highlight }: { runs: readonly (readonly [string, boolean])[]; highlight: string }) {
  return (
    <>
      {runs.map(([text, on], i) => (
        <span key={`${i}-${text}`} style={on ? { color: highlight } : undefined}>
          {text}
        </span>
      ))}
    </>
  );
}
