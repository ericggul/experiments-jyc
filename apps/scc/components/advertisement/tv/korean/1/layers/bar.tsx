import { BAR_BLUE, NUMBER_BLUE } from "./text";

// The persistent bottom bar: blue product side, light-blue diagonal, white
// number side. Geometry measured on the 1080p master (top y 908, slope 0.48).
export const PHONE = "1670-4604";
const TOP = 908;
const SLOPE = 0.479;
const EDGE_AT_TOP = 912;
const STRIPE = 14;

const edge = (y: number) => EDGE_AT_TOP + (y - TOP) * SLOPE;

export function PhoneGlyph({ width, color }: { width: number; color: string }) {
  // The ☎ handset-on-base glyph used throughout the spot.
  return (
    <svg width={width} height={width * 0.62} viewBox="0 0 100 62" fill={color} aria-hidden>
      <path d="M50 4C28 4 9 10 2 18c-3 4-2 9 2 12l7 4c3 2 7 1 9-2l3-7c1-2 3-3 5-3h44c2 0 4 1 5 3l3 7c2 3 6 4 9 2l7-4c4-3 5-8 2-12C91 10 72 4 50 4z" />
      <path d="M28 30h44l10 26c1 3-1 6-4 6H22c-3 0-5-3-4-6z" />
      <circle cx={50} cy={45} r={9} fill="#fff" />
    </svg>
  );
}

/** "라이나 / 무배당" stacked tag + "OK실버보험" wordmark. */
export function OkSilverMark({ scale = 1, color = "#fff" }: { scale?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", color, transform: `scale(${scale})`, transformOrigin: "0 50%" }}>
      <div style={{ fontSize: 31, fontWeight: 500, lineHeight: 0.98, letterSpacing: "-0.06em", marginRight: 6, textAlign: "center" }}>
        라이나
        <br />
        무배당
      </div>
      <div style={{ fontSize: 86, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.075em" }}>OK실버보험</div>
    </div>
  );
}

function CignaTree({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" aria-hidden>
      <path d="M30 56V24" />
      <path d="M18 18c4-8 20-8 24 0" />
      <path d="M12 26c6-12 30-12 36 0" />
      <path d="M22 34c4-5 12-5 16 0" />
      <path d="M30 24c-6-2-10-8-8-14M30 24c6-2 10-8 8-14" />
      <path d="M16 56h28" />
    </svg>
  );
}

/** Cigna tree with "Cigna" under it + "라이나생명". */
export function LinaLifeMark({ color = "#fff" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, color }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <CignaTree size={56} color={color} />
        <span style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 2, fontStyle: "italic" }}>Cigna.</span>
      </div>
      <span style={{ fontSize: 62, fontWeight: 600, letterSpacing: "-0.06em", lineHeight: 1, marginBottom: 2 }}>라이나생명</span>
    </div>
  );
}

/** Logo swap: OK실버보험 ↔ 라이나생명, flipped vertically over 0.7 s on a 15 s cycle. */
export function logoState(time: number): { logo: "ok" | "lina"; squash: number } {
  const t = ((time % 15) + 15) % 15;
  const flip = (start: number, from: "ok" | "lina", to: "ok" | "lina") => {
    const k = (t - start) / 0.7;
    return k < 0.5 ? { logo: from, squash: 1 - k * 2 } : { logo: to, squash: (k - 0.5) * 2 };
  };
  if (t >= 5.3 && t < 6.0) return flip(5.3, "ok", "lina");
  if (t >= 13.4 && t < 14.1) return flip(13.4, "lina", "ok");
  if (t >= 6.0 && t < 13.4) return { logo: "lina", squash: 1 };
  return { logo: "ok", squash: 1 };
}

/** Shimmer band over the number: one sweep every 15 s (estimated from the capture). */
export function shimmerAt(time: number) {
  const t = ((time - 8.6) % 15 + 15) % 15;
  return t < 1.0 ? t / 1.0 : -1;
}

export function BottomBar({ time }: { time: number }) {
  const { logo, squash } = logoState(time);
  const sweep = shimmerAt(time);
  const blue = `polygon(0 ${TOP}px, ${edge(TOP)}px ${TOP}px, ${edge(1080)}px 1080px, 0 1080px)`;
  const stripe = `polygon(${edge(TOP)}px ${TOP}px, ${edge(TOP) + STRIPE}px ${TOP}px, ${edge(1080) + STRIPE}px 1080px, ${edge(1080)}px 1080px)`;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: TOP, bottom: 0, background: "#fdfdfd" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: stripe, background: "#97d6fd" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: blue,
          background: `linear-gradient(90deg, ${BAR_BLUE} 0%, ${BAR_BLUE} 62%, #1e64b8 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 216,
          top: TOP,
          height: 172,
          display: "flex",
          alignItems: "center",
          transform: `scaleY(${squash})`,
          transformOrigin: "50% 50%",
        }}
      >
        {logo === "ok" ? <OkSilverMark /> : <div style={{ marginLeft: 60 }}><LinaLifeMark /></div>}
      </div>
      <div style={{ position: "absolute", left: 1040, top: 952, display: "flex", alignItems: "center" }}>
        <PhoneGlyph width={92} color={NUMBER_BLUE} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 1147,
          top: 918,
          fontSize: 132,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          transform: "scaleX(0.86)",
          transformOrigin: "0 0",
          color: NUMBER_BLUE,
          backgroundImage:
            sweep >= 0
              ? `linear-gradient(90deg, ${NUMBER_BLUE} ${sweep * 110 - 14}%, #c8f4ff ${sweep * 110 - 6}%, #c8f4ff ${sweep * 110}%, ${NUMBER_BLUE} ${sweep * 110 + 8}%)`
              : undefined,
          WebkitBackgroundClip: sweep >= 0 ? "text" : undefined,
          backgroundClip: sweep >= 0 ? "text" : undefined,
          WebkitTextFillColor: sweep >= 0 ? "transparent" : undefined,
        }}
      >
        {PHONE}
      </div>
    </>
  );
}

/** Faint number at top left, carried through the whole spot. */
export function TopNumber() {
  return (
    <div style={{ position: "absolute", left: 192, top: 70, display: "flex", alignItems: "center", gap: 6, opacity: 0.72 }}>
      <PhoneGlyph width={44} color="#3d8ccc" />
      <span style={{ fontSize: 50, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, color: "#3d8ccc", transform: "scaleX(0.86)", transformOrigin: "0 50%" }}>
        {PHONE}
      </span>
    </div>
  );
}
