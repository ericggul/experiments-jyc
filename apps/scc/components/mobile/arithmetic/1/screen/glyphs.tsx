// Key symbols drawn to the iOS 27 support-page frame (see docs/experiments/mobile/arithmetic.md).
// Key glyphs share a 40-unit box; one unit equals one reference unit of the 468-unit screen width.
const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type GlyphName = "delete" | "percent" | "negate" | "÷" | "×" | "−" | "+" | "=";

export function KeyGlyph({ name }: { name: GlyphName }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden>
      {name === "delete" && (
        <g {...stroke} strokeWidth={2.6}>
          <path d="M13.4 4.3h21.8a3.4 3.4 0 0 1 3.4 3.4v24.6a3.4 3.4 0 0 1-3.4 3.4H13.4L1.2 20Z" />
          <path d="M19.6 14.4 30.8 25.6M30.8 14.4 19.6 25.6" />
        </g>
      )}
      {name === "percent" && (
        <g {...stroke} strokeWidth={2.8}>
          <ellipse cx={9} cy={10.2} rx={6.2} ry={7} />
          <ellipse cx={31} cy={29.8} rx={6.2} ry={7} />
          <path d="M29.5 2.4 10.5 37.6" />
        </g>
      )}
      {name === "negate" && (
        <g {...stroke} strokeWidth={2.6}>
          <path d="M8.6 3.4v11M3.4 8.9h10.4" />
          <path d="M30.2 2.4 10.4 37.6" />
          <path d="M26 33.4h10.6" />
        </g>
      )}
      {name === "÷" && (
        <g>
          <path {...stroke} strokeWidth={3} d="M5.5 20h29" />
          <circle cx={20} cy={8.4} r={2.4} fill="currentColor" />
          <circle cx={20} cy={31.6} r={2.4} fill="currentColor" />
        </g>
      )}
      {name === "×" && <path {...stroke} strokeWidth={3} d="M8.6 8.6 31.4 31.4M31.4 8.6 8.6 31.4" />}
      {name === "−" && <path {...stroke} strokeWidth={3} d="M5.5 20h29" />}
      {name === "+" && <path {...stroke} strokeWidth={3} d="M5.5 20h29M20 5.5v29" />}
      {name === "=" && <path {...stroke} strokeWidth={3} d="M8 14h24M8 26h24" />}
    </svg>
  );
}
