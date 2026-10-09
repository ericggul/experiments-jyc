import type { CSSProperties, ReactNode } from "react";

/** A caption line measured by the fitter (see the advertisement docs). */
export type FittedLineData = {
  text: string;
  size: number;
  weight: number;
  /** CSS box origin (line-height 1) that puts the ink where the reference has it. */
  left: number;
  top: number;
  /** Letter and word spacing in em, solved from measured syllable positions. */
  track: number;
  word: number;
};

/** One measured caption line, set as ordinary text with its fitted spacing. */
export function FittedLine({
  line,
  color = "#fff",
  shadow,
  children,
  style,
}: {
  line: FittedLineData;
  color?: string;
  shadow?: string;
  /** Optional rich content (highlight runs) replacing `line.text`. */
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: line.left,
        top: line.top,
        fontSize: line.size,
        fontWeight: line.weight,
        lineHeight: 1,
        letterSpacing: `${line.track}em`,
        wordSpacing: `${line.word}em`,
        whiteSpace: "pre",
        color,
        textShadow: shadow,
        ...style,
      }}
    >
      {children ?? line.text}
    </div>
  );
}
