import { BLACK, GOLD, HOT_PINK, L, PURPLE, outline } from "./text";

// The persistent bottom bar. Geometry measured on the capture upscaled to
// 1920×1080: white strip from y 927, pink number panel x 1078→1920, y 928→1057,
// lower-left corner rounded (≈115×88) inside a 16 px gold rim.
const BAR_TOP = 927;
const PANEL = { left: 1078, top: 928, bottom: 1057 };
const RIM = 16;

export const NUMBER_OUTLINE = outline(2.6, "#14000a");

/** Heungkuk mark: two squares and a diamond (proportions measured on the card). */
export function HeungkukMark({ width, color = "#e10081" }: { width: number; color?: string }) {
  return (
    <svg width={width} height={(width * 55) / 80} viewBox="0 0 80 55" aria-hidden style={{ display: "block" }}>
      <rect x={0} y={0} width={18} height={18} rx={1.5} fill={color} />
      <rect x={0} y={33} width={18} height={18} rx={1.5} fill={color} />
      <polygon points="52,-1 80,27 52,55 24,27" fill={color} />
    </svg>
  );
}

export function OnAir() {
  return <L id="onair" color="rgba(255,255,255,0.9)" shadow="0 1px 3px rgba(0,0,0,0.45)" />;
}

function NumberPanel() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: PANEL.left - RIM,
          top: PANEL.top,
          right: 0,
          height: PANEL.bottom - PANEL.top + 4,
          background: "linear-gradient(90deg, #a98a3e 0%, #c9a75a 40%, #b18b39 100%)",
          borderBottomLeftRadius: "131px 92px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PANEL.left,
          top: PANEL.top,
          right: 0,
          height: PANEL.bottom - PANEL.top,
          background: HOT_PINK,
          borderBottom: "1px solid #93003f",
          borderBottomLeftRadius: "115px 88px",
        }}
      />
      <L id="free" />
      <L id="phone" shadow={NUMBER_OUTLINE} />
    </>
  );
}

function Strip() {
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: BAR_TOP - 7, height: 7, background: "linear-gradient(180deg, rgba(150,155,150,0) 0%, rgba(150,155,150,0.45) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: BAR_TOP, bottom: 0, background: "#fafcfa" }} />
    </>
  );
}

/** Product bar: Heungkuk mark, product name, free-call number. */
export function ProductBar() {
  return (
    <>
      <Strip />
      <div style={{ position: "absolute", left: 50, top: 985 }}>
        <HeungkukMark width={57} />
      </div>
      <L id="hk-1" color="#1d1a4a" />
      <div style={{ position: "absolute", left: 127, top: 1011, fontSize: 13.5, fontWeight: 500, lineHeight: 1, letterSpacing: "0.01em", color: "#1d1a4a", whiteSpace: "pre" }}>
        Life Insurance
      </div>
      <L id="bar-a" color={PURPLE} />
      <L id="bar-b" color={BLACK} colors={(i) => (i < 4 ? PURPLE : i >= 8 && i < 12 ? GOLD : undefined)} />
      <NumberPanel />
    </>
  );
}

/** Gift bar used in the heater segment. */
export function GiftBar() {
  return (
    <>
      <Strip />
      <L id="gb-1" color={PURPLE} />
      <L id="gb-2" color={PURPLE} />
      <L id="gb-3" color={BLACK} />
      <NumberPanel />
    </>
  );
}

