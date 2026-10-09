import type { ReactNode } from "react";
import { Plate } from "../../../player";
import { plateUrl, type PlateId } from "../scenes";
import { GiftBar, OnAir } from "./bar";
import { BLACK, HOT_PINK, L, NAVY, ORANGE, PINK, WHITE, YELLOW, easeOut, outline, ramp, run } from "./text";

// The heater gift segment (played at 0 s and again at 78.91 s). `lt` is the
// time since the segment started; boxes measured on the 1080p upscale.
const DARK_RING = outline(2, "rgba(20,10,20,0.9)");
const PINK_RING = outline(3, "#d4126f");
const WHITE_RING = outline(3, WHITE);
const BOX_DIM = "rgba(40,40,44,0.72)";

function Framed({ plate, left, top, width, height, border, radius }: { plate: PlateId; left: number; top: number; width: number; height: number; border: string; radius: number }) {
  return (
    <div style={{ position: "absolute", left, top, width, height, border, borderRadius: radius, overflow: "hidden", boxSizing: "border-box" }}>
      <Plate src={plateUrl(plate)} />
    </div>
  );
}

/** Event header: gift name box, product thumbnail, event terms. */
function Header({ plates }: { plates: boolean }) {
  return (
    <>
      <div style={{ position: "absolute", left: 90, top: 55, width: 492, height: 117, borderRadius: 10, background: HOT_PINK }} />
      <div style={{ position: "absolute", left: 98, top: 114, width: 476, height: 52, borderRadius: 6, background: "#ffffff" }} />
      <L id="gt-1" colors={run(6, 11, YELLOW)} />
      <L id="gt-2" color={NAVY} />
      <L id="gt-3" shadow={DARK_RING} />
      <div style={{ position: "absolute", left: 93, top: 211, width: 483, height: 39, background: BOX_DIM }} />
      <L id="gt-4" />
      {plates ? <Framed plate="gift-thumb" left={576} top={37} width={200} height={155} border={`6px solid ${HOT_PINK}`} radius={14} /> : <div style={{ position: "absolute", left: 576, top: 37, width: 200, height: 155, border: `6px solid ${HOT_PINK}`, borderRadius: 14, boxSizing: "border-box" }} />}
      <div style={{ position: "absolute", left: 786, top: 48, width: 639, height: 89, background: BOX_DIM }} />
      <L id="gn-1" />
      <L id="gn-2" />
      <L id="gn-3" shadow={DARK_RING} />
    </>
  );
}

function Pop({ k, cx, cy, children }: { k: number; cx: number; cy: number; children: ReactNode }) {
  const s = k >= 1 ? 1 : 0.35 + 0.65 * easeOut(k);
  return <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, k * 3), transform: `scale(${s})`, transformOrigin: `${cx}px ${cy}px` }}>{children}</div>;
}

function Small({ x, y, size, color, children, weight = 500, shadow }: { x: number; y: number; size: number; color: string; children: string; weight?: number; shadow?: string }) {
  return <div style={{ position: "absolute", left: x, top: y, fontSize: size, fontWeight: weight, lineHeight: 1, letterSpacing: "-0.03em", color, whiteSpace: "pre", textShadow: shadow }}>{children}</div>;
}

// Dropped below the event-terms box so the inset no longer covers its text.
function Inset({ lt, plates }: { lt: number; plates: boolean }) {
  const dial = lt < 2.75;
  return (
    <>
      {plates ? <Framed plate={dial ? "inset-dial" : "inset-floor"} left={1123} top={182} width={730} height={479} border="2px solid rgba(255,255,255,0.9)" radius={0} /> : <div style={{ position: "absolute", left: 1123, top: 182, width: 730, height: 479, border: "2px solid rgba(255,255,255,0.9)", boxSizing: "border-box" }} />}
      {dial && lt >= 1.6 ? (
        <>
          <Small x={1568} y={366} size={38} color={WHITE} shadow={DARK_RING}>온도조절 기능</Small>
          <div style={{ position: "absolute", left: 1565, top: 408, width: 207, height: 28, background: ORANGE }} />
          <Small x={1578} y={410} size={23} color={WHITE}>온도과열방지 기능</Small>
        </>
      ) : null}
      {!dial && lt >= 3.1 ? (
        <>
          <div style={{ position: "absolute", left: 1140, top: 398, width: 165, height: 81, border: "2px solid rgba(255,255,255,0.85)", boxSizing: "border-box" }} />
          <Small x={1150} y={405} size={38} color={BLACK}>넘어지면</Small>
          <div style={{ position: "absolute", left: 1142, top: 447, width: 161, height: 30, background: ORANGE }} />
          <Small x={1144} y={450} size={24} color={WHITE}>자동 전원차단</Small>
        </>
      ) : null}
    </>
  );
}

function Captions({ lt }: { lt: number }) {
  if (lt < 1.07) {
    const k = ramp(lt, 0, 0.22);
    return (
      <Pop k={k} cx={950} cy={853}>
        {[752, 846].map((cx) => (
          <div key={`circle-${cx}`} style={{ position: "absolute", left: cx - 53, top: 800, width: 106, height: 106, borderRadius: "50%", background: PINK, border: "5px solid #fff", boxSizing: "border-box" }} />
        ))}
        <Small x={712} y={812} size={82} color={WHITE} weight={700}>상</Small>
        <Small x={806} y={812} size={82} color={WHITE} weight={700}>담</Small>
        <L id="gc-1" shadow={PINK_RING} />
      </Pop>
    );
  }
  if (lt < 4.67) {
    const safe = ramp(lt, 2.05, 2.25);
    return (
      <>
        <L id="gc-2a" shadow={DARK_RING} />
        <L id="gc-2b" color={ORANGE} shadow={WHITE_RING} />
        <Pop k={safe} cx={1224} cy={853}>
          <div style={{ position: "absolute", left: 1125, top: 806, width: 198, height: 98, borderRadius: 24, background: ORANGE, border: "4px solid #fff", boxSizing: "border-box" }} />
          <Small x={1142} y={813} size={84} color={WHITE} weight={700}>안전</Small>
          <L id="gc-2c" shadow={DARK_RING} />
        </Pop>
      </>
    );
  }
  const slide = 1 - easeOut(ramp(lt, 4.67, 4.85));
  const gift = ramp(lt, 4.88, 5.05);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${slide * 560}px)` }}>
        <div style={{ position: "absolute", left: 1366, top: 436, width: 434, height: 104, background: "#ffffff" }} />
        <L id="gc-3a" color={PINK} />
        <div style={{ position: "absolute", left: 1368, top: 544, width: 434, height: 110, background: PINK }} />
        <L id="gc-3b" />
      </div>
      <Pop k={gift} cx={1580} cy={740}>
        <L id="gc-3c" color={PINK} shadow={WHITE_RING} />
      </Pop>
    </>
  );
}

export function GiftSegment({ lt, plates }: { lt: number; plates: boolean }) {
  return (
    <>
      <Header plates={plates} />
      {lt >= 1.0 && lt < 4.67 ? <Inset lt={lt} plates={plates} /> : null}
      <Captions lt={lt} />
      <OnAir />
      <GiftBar />
    </>
  );
}
