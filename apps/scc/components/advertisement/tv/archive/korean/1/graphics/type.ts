import type { CSSProperties } from "react";

// Korean infomercial supers: heavy gothic with a dark keyline and soft drop.
export const NAVY = "#1d2380";
export const BADGE_BLUE = "#2b22b8";
export const YELLOW = "#ffe014";
export const RED = "#e5262d";
export const INK = "#14183f";

export function outline(color: string, radius: number, drop = true): string {
  const steps = 16;
  const ring = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return `${(Math.cos(a) * radius).toFixed(2)}px ${(Math.sin(a) * radius).toFixed(2)}px 0 ${color}`;
  });
  if (drop) ring.push(`0 ${radius * 1.6}px ${radius * 2.4}px rgba(0,0,0,0.45)`);
  return ring.join(", ");
}

export const heavy = (size: number, color = "#fff", keyline = INK, radius = size / 22): CSSProperties => ({
  fontSize: size,
  fontWeight: 900,
  lineHeight: 1.18,
  letterSpacing: "-0.02em",
  color,
  textShadow: outline(keyline, radius),
  whiteSpace: "nowrap",
});
