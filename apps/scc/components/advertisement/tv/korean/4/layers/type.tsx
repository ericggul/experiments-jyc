import type { CSSProperties, ReactNode } from "react";
import { FittedLine, type FittedLineData } from "../../../player";
import { FITTED } from "../fitted";
import { gmarket } from "../fonts";

// Shared caption primitives for the spot. Every caption is a fitted line
// (see ../fitted.ts); animation is expressed as reveal / scale / opacity.

export type LineId = keyof typeof FITTED;
type Line = FittedLineData & { family: "gm" | "noto" | "score" | "suit"; xscale?: number };

export const INK = "#262a2c";
export const FOOT = "#3a3c3e";
export const PURPLE = "#3f316e";
export const BAR_PURPLE = "#3e2c74";
export const ORANGE = "#f5904f";
export const RED = "#e6305a";
export const CYAN = "#2b93da";
export const WHITE = "#ffffff";

/** White halo the spot puts behind dark and coloured type on light footage. */
export const GLOW = "0 0 3px rgba(255,255,255,0.95), 0 0 9px rgba(255,255,255,0.75)";
/** Soft drop shadow for white type over footage. */
export const DROP = "0 2px 5px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.35)";

// One typeface for the whole spot: Gmarket Sans won every sampled caption style
// (per-syllable IoU 0.60–0.92 against the capture; next family below 0.6).
export const family = (f: Line["family"]) => (void f, gmarket.style.fontFamily);

export const line = (id: LineId): Line => FITTED[id];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** Pop-in measured on the capture: ~0.3 s from 60% through a 12% overshoot to rest. */
export function pop(t: number, at: number, dur = 0.3) {
  if (t < at) return 0;
  const p = (t - at) / dur;
  if (p >= 1) return 1;
  return p < 0.6 ? 0.6 + 0.52 * (p / 0.6) : 1.12 - 0.12 * ((p - 0.6) / 0.4);
}

/** Colour runs over syllable indices (spaces are not counted): [from, to) → colour. */
export type Run = readonly [number, number, string];

export function Fit({
  id,
  color = INK,
  shadow,
  reveal = 1,
  scale = 1,
  opacity = 1,
  runs,
  style,
  children,
}: {
  id: LineId;
  color?: string;
  shadow?: string;
  /** Left-to-right wipe, 0..1. */
  reveal?: number;
  scale?: number;
  opacity?: number;
  runs?: readonly Run[];
  style?: CSSProperties;
  children?: ReactNode;
}) {
  if (reveal <= 0 || scale <= 0 || opacity <= 0) return null;
  const data = line(id);
  let content = children;
  if (!content && runs) {
    let index = -1;
    content = Array.from(data.text).map((char, position) => {
      if (char !== " ") index += 1;
      const run = char === " " ? undefined : runs.find(([from, to]) => index >= from && index < to);
      return (
        <span key={`${position}-${char}`} style={run ? { color: run[2] } : undefined}>
          {char}
        </span>
      );
    });
  }
  const element = (
    <FittedLine
      line={data}
      color={color}
      shadow={shadow}
      style={{
        fontFamily: family(data.family),
        clipPath: reveal < 1 ? `inset(-40% ${(1 - reveal) * 100}% -40% -10%)` : undefined,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "50% 50%",
        opacity: opacity < 1 ? opacity : undefined,
        ...style,
      }}
    >
      {content}
    </FittedLine>
  );
  if (!data.xscale) return element;
  return <div style={{ position: "absolute", left: 0, top: 0, transform: `scaleX(${data.xscale})`, transformOrigin: "0 0" }}>{element}</div>;
}

/** Absolutely placed box in frame pixels. */
export function Box({ x, y, w, h, style, children }: { x: number; y: number; w: number; h: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}

/** A disc with a light-to-saturated diagonal gradient and centred two-line label. */
export function Disc({
  cx,
  cy,
  d,
  from,
  to,
  scale = 1,
  children,
}: {
  cx: number;
  cy: number;
  d: number;
  from: string;
  to: string;
  scale?: number;
  children?: ReactNode;
}) {
  if (scale <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - d / 2,
        top: cy - d / 2,
        width: d,
        height: d,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from} 12%, ${to} 82%)`,
        boxShadow: "0 3px 8px rgba(40,60,90,0.25)",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        display: "grid",
        placeItems: "center",
      }}
    >
      {children}
    </div>
  );
}
