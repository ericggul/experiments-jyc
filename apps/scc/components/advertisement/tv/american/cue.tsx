import type { CSSProperties, ReactNode } from "react";

// Shared for the American spots: an element shown from `in` to `out` seconds,
// faded in and out over `fade` (the cross-dissolves of tape-era supers).
export function presence(t: number, from: number, to: number, fade = 0.4) {
  if (t < from || t > to) return 0;
  return Math.min(1, (t - from) / fade, (to - t) / fade);
}

export function Cue({
  t,
  at,
  until,
  fade,
  style,
  children,
}: {
  t: number;
  at: number;
  until: number;
  fade?: number;
  style: CSSProperties;
  children: ReactNode;
}) {
  const o = presence(t, at, until, fade);
  if (o <= 0) return null;
  return <div style={{ position: "absolute", whiteSpace: "pre", ...style, opacity: o }}>{children}</div>;
}
