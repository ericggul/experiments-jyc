import type { CSSProperties } from "react";
import { AIA_RED, BAR_WHITE, INK, L, OUTLINE, Outlined, PHONE_RED, WHITE, run } from "./text";

// Persistent chrome measured on the 1080p upscale: white bar from y 884, AIA
// panel from x 1514, "광고방송" label top-left.
const BAR_TOP = 884;
const PANEL_LEFT = 1514;

/** AIA mark: open ring with a mountain inside and the AIA letters across its foot. */
export function AiaMark({ x, y, size, color = WHITE }: { x: number; y: number; size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.08}
      viewBox="0 0 100 108"
      style={{ position: "absolute", left: x, top: y, overflow: "visible" }}
      aria-hidden
    >
      <path d="M14 66A46 46 0 1 1 86 66" fill="none" stroke={color} strokeWidth={6.5} strokeLinecap="round" />
      <path
        d="M12 58l14-14 7 5 15-20 9 9 6-4 16 18 9 6c-6-1-11-4-15-8l-6 8-8-12-8 9-6-7-13 16-6-4-10 6z"
        fill={color}
      />
      <path
        d="M6 104l15-38h9l15 38h-9l-3-9H18l-3 9zM21 87h9l-4-12zM44 104V66h9v38zM56 104l15-38h9l15 38h-9l-3-9H71l-3 9zM71 87h9l-4-12z"
        fill={color}
      />
    </svg>
  );
}

export function AiaPanel() {
  return (
    <>
      <div style={{ position: "absolute", left: PANEL_LEFT, top: BAR_TOP, right: 0, bottom: 0, background: AIA_RED }} />
      <AiaMark x={1539} y={927} size={96} />
      <L id="aia-tag-1" />
      <L id="aia-tag-2" />
    </>
  );
}

/** "광고방송" in white with a dark outline; the gift section sets it lower. */
export function AdLabel({ gift = false }: { gift?: boolean }) {
  return <Outlined id={gift ? "ad-gift" : "ad"} width={6} />;
}

const PLATE: CSSProperties = {
  position: "absolute",
  background: "linear-gradient(180deg, #3a3a38 0%, #1e1e1d 100%)",
  border: "3px solid #8d8d8a",
  borderRadius: 6,
  boxShadow: "0 3px 6px rgba(0,0,0,0.35)",
};

const ANSIM = "linear-gradient(180deg, #fff53a 0%, #d8ea22 42%, #6fc12c 78%, #3aa53a 100%)";
const CHIMAE = "linear-gradient(90deg, #ffe500 0%, #ffbf00 38%, #ff8a00 70%, #ff5a0a 100%)";

const gradientText = (image: string): CSSProperties => ({
  backgroundImage: image,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

/**
 * "무배당 우리가족 안심 치매보험 (무해지환급형)" wordmark, authored at its
 * full-size position (product scene); `scale` maps it into the bottom bar.
 */
export function ProductLogo({ scale = 1, to = [143, 380] }: { scale?: number; to?: [number, number] }) {
  const transform = scale === 1 ? undefined : `translate(${to[0] - 143 * scale}px, ${to[1] - 380 * scale}px) scale(${scale})`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform, transformOrigin: "0 0" }}>
      <L id="logo-type" color={INK} />
      <div style={{ ...PLATE, left: 480, top: 416, width: 225, height: 130 }} />
      <div style={{ ...PLATE, left: 700, top: 429, width: 314, height: 97 }} />
      <Outlined id="logo-woori" width={16} />
      {/* Smiley face inside the ㅇ of 우. */}
      <svg style={{ position: "absolute", left: 152, top: 431 }} width={44} height={40} viewBox="0 0 44 40" aria-hidden>
        <circle cx={14} cy={14} r={4} fill={OUTLINE} />
        <circle cx={30} cy={14} r={4} fill={OUTLINE} />
        <path d="M10 24q12 12 24 0" fill="none" stroke={OUTLINE} strokeWidth={4} strokeLinecap="round" />
      </svg>
      <L id="logo-ansim" style={gradientText(ANSIM)} />
      <L id="logo-chimae" style={gradientText(CHIMAE)} />
      <div style={{ ...PLATE, left: 205, top: 394, width: 112, height: 42, borderRadius: 8, borderWidth: 2 }} />
      <L id="logo-mubae" style={gradientText("linear-gradient(180deg, #ffe600 0%, #ff9500 100%)")} />
    </div>
  );
}

export type BarVariant = "gift" | "product";

export function BottomBar({ variant }: { variant: BarVariant }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: BAR_TOP, width: PANEL_LEFT, bottom: 0, background: BAR_WHITE }} />
      {variant === "gift" ? (
        <>
          <L id="bar-gift-1" color="#0d100d" colors={run(6, 10, "#ca1b3d")} />
          <L id="bar-gift-2" color="#275b88" />
        </>
      ) : (
        <ProductLogo scale={0.584} to={[99, 928]} />
      )}
      <L id="phone" color={PHONE_RED} />
      <AiaPanel />
    </>
  );
}

