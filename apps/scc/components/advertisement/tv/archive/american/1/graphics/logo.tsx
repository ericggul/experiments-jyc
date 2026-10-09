import type { CSSProperties } from "react";

// The Ozempic® wordmark: heavy caps with a small "i", red sliding into orange.
export const BRAND_RED = "#d71f26";
export const BRAND_ORANGE = "#f47b20";

const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));

/** Colour along the red → orange sweep of the wordmark. */
function mix(at: number) {
  const a = hex(BRAND_RED);
  const b = hex(BRAND_ORANGE);
  const k = Math.min(1, Math.max(0, at * 1.15 - 0.1));
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * k)).join(", ")})`;
}

export function OzempicWordmark({
  size,
  onceWeekly = false,
  reveal = 1,
  style,
}: {
  size: number;
  onceWeekly?: boolean;
  /** 0..1: letters appear left to right ("O", "ZEM", then the rest). */
  reveal?: number;
  style?: CSSProperties;
}) {
  const letters = ["O", "Z", "E", "M", "P", "i", "C"];
  const shown = Math.ceil(reveal * letters.length);
  return (
    <div style={{ position: "relative", display: "inline-block", lineHeight: 1, ...style }}>
      {onceWeekly ? (
        <div
          style={{
            position: "absolute",
            left: size * 1.12,
            top: -size * 0.3,
            fontSize: size * 0.2,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#4a4a4a",
            whiteSpace: "nowrap",
          }}
        >
          ONCE-WEEKLY
        </div>
      ) : null}
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          fontSize: size,
          fontWeight: 900,
          letterSpacing: "0.01em",
          filter: "drop-shadow(0 2px 1px rgba(90, 10, 0, 0.35))",
        }}
      >
        {letters.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            style={{
              opacity: i < shown ? 1 : 0,
              fontSize: letter === "i" ? size * 0.82 : size,
              marginLeft: i === 1 && reveal < 0.3 ? size * 0.3 : 0,
              background: `linear-gradient(90deg, ${mix(i / letters.length)}, ${mix((i + 1) / letters.length)})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {letter}
          </span>
        ))}
        <span style={{ fontSize: size * 0.2, color: BRAND_ORANGE, alignSelf: "flex-start", marginTop: size * 0.12, marginLeft: 2 }}>®</span>
      </span>
    </div>
  );
}
