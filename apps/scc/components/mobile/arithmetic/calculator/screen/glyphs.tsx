// Key symbols drawn to the iOS 27 support-page frame (see docs/experiments/mobile/arithmetic.md).
// Key glyphs share a 40-unit box; one unit equals one reference unit of the 468-unit screen width.
const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type GlyphName = "delete" | "percent" | "negate" | "=";

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
      {name === "=" && <path {...stroke} strokeWidth={3} d="M8 14h24M8 26h24" />}
    </svg>
  );
}

// 사칙연산 of social media: Instagram's IGDS post-action paths, copied verbatim from arithmetic/default (fetched 2026-10-03).
// Drawn in their own 24-unit box at 36 key units, Instagram's 2-unit stroke lands on the 3-unit stroke of the iOS operators.
const ig = {
  heart: "M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z",
  comment: "M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z",
  repost: "M19.998 9.497a1 1 0 0 0-1 1v4.228a3.274 3.274 0 0 1-3.27 3.27h-5.313l1.791-1.787a1 1 0 0 0-1.412-1.416L7.29 18.287a1.004 1.004 0 0 0-.294.707v.001c0 .023.012.042.013.065a.923.923 0 0 0 .281.643l3.502 3.504a1 1 0 0 0 1.414-1.414l-1.797-1.798h5.318a5.276 5.276 0 0 0 5.27-5.27v-4.228a1 1 0 0 0-1-1Zm-6.41-3.496-1.795 1.795a1 1 0 1 0 1.414 1.414l3.5-3.5a1.003 1.003 0 0 0 0-1.417l-3.5-3.5a1 1 0 0 0-1.414 1.414l1.794 1.794H8.27A5.277 5.277 0 0 0 3 9.271V13.5a1 1 0 0 0 2 0V9.271a3.275 3.275 0 0 1 3.271-3.27Z",
  share: "M13.973 20.046 21.77 6.928C22.8 5.195 21.55 3 19.535 3H4.466C2.138 3 .984 5.825 2.646 7.456l4.842 4.752 1.723 7.121c.548 2.266 3.571 2.721 4.762.717Z",
  shareFold: { x1: 7.488, y1: 12.208, x2: 15.515, y2: 7.641 },
} as const;

export function SnsGlyph({ operator }: { operator: "÷" | "×" | "−" | "+" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {operator === "÷" && <path fill="currentColor" d={ig.heart} />}
      {operator === "×" && <path {...stroke} strokeWidth={2} d={ig.comment} />}
      {operator === "−" && <path fill="currentColor" d={ig.repost} />}
      {operator === "+" && (
        <g {...stroke} strokeWidth={2}>
          <path d={ig.share} />
          <line {...ig.shareFold} />
        </g>
      )}
    </svg>
  );
}
