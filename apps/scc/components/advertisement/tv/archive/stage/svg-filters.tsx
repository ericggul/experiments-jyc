// SVG filter definitions for footage plates. CSS `filter` on SVG children is
// not honoured everywhere, so plates reference these by `filter={blur(n)}`.
const BLURS = [0.6, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 18] as const;
const GLOWS = [5, 6, 10] as const;

export type BlurRadius = (typeof BLURS)[number];
export type GlowRadius = (typeof GLOWS)[number];

const id = (kind: string, radius: number) => `tv-${kind}-${String(radius).replace(".", "_")}`;

export const blur = (radius: BlurRadius) => `url(#${id("blur", radius)})`;
export const glow = (radius: GlowRadius) => `url(#${id("glow", radius)})`;

/** Place once inside each plate's `<svg>`; identical duplicates are harmless. */
export function SvgFilters() {
  return (
    <defs>
      {BLURS.map((radius) => (
        <filter key={`b${radius}`} id={id("blur", radius)} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={radius} />
        </filter>
      ))}
      {GLOWS.map((radius) => (
        <filter key={`g${radius}`} id={id("glow", radius)} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={radius} result="soft" />
          <feColorMatrix in="soft" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.84  0 0 0 0 1  0 0 0 0.85 0" result="tint" />
          <feMerge>
            <feMergeNode in="tint" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
    </defs>
  );
}
