import type { ReactNode } from "react";
import { easeOutBack, easeOutCubic, ramp } from "../../../stage/timeline";
import { BRAND_ORANGE, BRAND_RED, OzempicWordmark } from "./logo";

// On-screen supers of the "Oh!" campaign: orange claim pill, the "Oh!" burst
// whose O carries the claim icon, and the white safety band with the logo.
export type ClaimIcon = "none" | "drop" | "scale" | "heart";

export function Glyph({ icon, size, color }: { icon: ClaimIcon; size: number; color: string }) {
  if (icon === "none") return null;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color}>
      {icon === "drop" ? <path d="M50 10 C62 32 76 46 76 64 a26 26 0 0 1 -52 0 C24 46 38 32 50 10 Z" /> : null}
      {icon === "heart" ? <path d="M50 84 C20 62 10 48 10 34 a20 20 0 0 1 40 -6 a20 20 0 0 1 40 6 C90 48 80 62 50 84 Z" /> : null}
      {icon === "scale" ? (
        <>
          <rect x={18} y={14} width={64} height={72} rx={14} />
          <circle cx={50} cy={40} r={15} fill={color === "#fff" ? BRAND_RED : "#fff"} />
          <path d="M50 40 L58 30" stroke={color} strokeWidth={4} strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}

/** Rounded orange claim pill, bottom-left, with a white icon roundel. */
export function ClaimPill({
  t,
  start,
  end,
  icon = "none",
  children,
  left = 180,
  top = 700,
  width,
}: {
  t: number;
  start: number;
  end: number;
  icon?: ClaimIcon;
  children: ReactNode;
  left?: number;
  top?: number;
  width?: number;
}) {
  const open = easeOutCubic(ramp(t, start, start + 0.35));
  const close = ramp(t, end - 0.25, end);
  const shown = open * (1 - close);
  if (shown <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        minHeight: 104,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: icon === "none" ? "16px 46px" : "14px 46px 14px 14px",
        borderRadius: 60,
        background: `linear-gradient(90deg, ${BRAND_RED} 0%, #ec4a1f 45%, ${BRAND_ORANGE} 100%)`,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.25)",
        clipPath: `inset(0 ${(1 - open) * 100}% 0 0 round 60px)`,
        opacity: 1 - close,
      }}
    >
      {icon !== "none" ? (
        <span
          style={{
            flex: "none",
            width: 76,
            height: 76,
            borderRadius: 38,
            background: "radial-gradient(circle at 40% 35%, #ff7b4a, #e2281d)",
            border: "4px solid rgba(255,255,255,0.85)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Glyph icon={icon} size={44} color="#fff" />
        </span>
      ) : null}
      <span style={{ color: "#fff", fontSize: 38, fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.005em", textShadow: "0 1px 2px rgba(120,20,0,0.4)" }}>
        {children}
      </span>
    </div>
  );
}

/** The "Oh!" burst: the O becomes a red roundel carrying the claim icon. */
export function OhBurst({ t, start, icon, left, top, size = 150 }: { t: number; start: number; icon: ClaimIcon; left: number; top: number; size?: number }) {
  const pop = easeOutBack(ramp(t, start, start + 0.32));
  if (pop <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        display: "flex",
        alignItems: "center",
        transform: `scale(${pop})`,
        transformOrigin: "30% 60%",
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
      }}
    >
      <span
        style={{
          width: size * 1.02,
          height: size * 1.02,
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 32%, #ff6a3a, ${BRAND_RED} 70%)`,
          border: `${size * 0.035}px solid #fff`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Glyph icon={icon} size={size * 0.52} color="#fff" />
      </span>
      <span
        style={{
          marginLeft: size * 0.04,
          fontSize: size * 1.18,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          background: `linear-gradient(180deg, ${BRAND_ORANGE} 0%, #f05a22 45%, ${BRAND_RED} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextStroke: `${size * 0.025}px rgba(255,255,255,0.9)`,
        }}
      >
        h!
      </span>
    </div>
  );
}

/** White safety band: small risk lines left, the wordmark boxed right. */
export function SafetyBand({ lines, opacity }: { lines: readonly string[]; opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 838,
        height: 136,
        background: "rgba(255,255,255,0.93)",
        opacity,
        display: "flex",
        alignItems: "center",
        padding: "0 60px 0 180px",
      }}
    >
      <div style={{ flex: 1, fontSize: 25, lineHeight: 1.32, color: "#1d1d1d", fontWeight: 500 }}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div style={{ padding: "10px 34px 12px", background: "#fff", borderRadius: 14, boxShadow: "0 0 0 2px #e6e2dd" }}>
        <OzempicWordmark size={62} />
      </div>
    </div>
  );
}
