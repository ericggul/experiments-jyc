import type { CSSProperties, ReactNode } from "react";
import { Plate } from "../../../player";
import { plateUrl, type SceneId } from "../scenes";
import { INSET_TONES } from "../tones";
import { AdLabel } from "./bar";
import { L, Outlined, easeOut, ramp, run } from "./text";

// Gift-promotion opener (0–5.97 s): banner, thumbnail, conditions, and the
// outlined captions. Boxes measured on the 1080p upscale.
const GIFT_PINK = "#cf8c8a";
const SHADE = "rgba(18,20,18,0.58)";
const COOL_FILL: CSSProperties = {
  backgroundImage: "linear-gradient(180deg, #b3cae1 0%, #c6d6e4 60%, #e5ece1 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

function Box({ x0, y0, x1, y1, style, children }: { x0: number; y0: number; x1: number; y1: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", left: x0, top: y0, width: x1 - x0, height: y1 - y0, ...style }}>{children}</div>;
}

/** Banner, product thumbnail, delivery terms and the giveaway conditions. */
export function GiftChrome() {
  return (
    <>
      <Box x0={84} y0={71} x1={512} y1={186} style={{ background: "linear-gradient(180deg, #e8001b 0%, #d4001a 100%)", borderRadius: 10, boxShadow: "0 5px 6px rgba(0,0,0,0.45)" }} />
      <Box x0={91} y0={124} x1={505} y1={179} style={{ background: "#fdfdfd", borderRadius: 4 }} />
      <L id="gift-banner" colors={run(6, 11, "#ffe400")} />
      <L id="gift-name" color="#ab0c21" />
      <Box x0={503} y0={47} x1={712} y1={204} style={{ border: "5px solid #e0001a", borderRadius: 9, overflow: "hidden", background: "#fff", boxShadow: "0 3px 6px rgba(0,0,0,0.4)" }}>
        <Plate src={plateUrl("gift-thumb")} tone={INSET_TONES["gift-thumb"]} />
      </Box>
      <Outlined id="gift-items" width={6} stroke="#3a3c3a" />
      <Outlined id="gift-color" fill="#1b1b1b" stroke="#ffffff" width={8} />
      <AdLabel gift />
      <Box x0={718} y0={49} x1={1505} y1={116} style={{ background: SHADE }} />
      <Box x0={718} y0={117} x1={1505} y1={181} style={{ background: SHADE }} />
      <L id="gift-ship-1" />
      <L id="gift-ship-2" />
      <Outlined id="gift-event" width={6} />
      <Box x0={300} y0={758} x1={1626} y1={882} style={{ background: SHADE }} />
      <L id="gift-note-1a" />
      <L id="gift-note-1b" />
      <L id="gift-note-2" />
    </>
  );
}

/** Syllable i of a typewriter line appears at start + i × step. */
const typed = (t: number, start: number, step: number) => (i: number) => t >= start + i * step;

export function GiftCaption({ scene, t }: { scene: SceneId; t: number }) {
  switch (scene) {
    case "consult":
      // 상담 0.2 s, then one syllable per 0.1 s.
      return <Outlined id="consult" colors={run(0, 2, GIFT_PINK)} visible={(i) => t >= (i < 2 ? 0.2 : 0.1 + i * 0.1)} />;
    case "cool":
      return (
        <>
          <Outlined id="cool-1" visible={typed(t, 1.6, 0.03)} />
          <Outlined id="cool-2" fillStyle={COOL_FILL} visible={typed(t, 1.8, 0.05)} />
        </>
      );
    case "set": {
      // Zooms in from 1.6× and settles by 4.15 s.
      const p = easeOut(ramp(t, 3.6, 0.55));
      const scale = 1.6 - 0.6 * p;
      const style: CSSProperties = { position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "958px 524px", opacity: 0.35 + 0.65 * p };
      return (
        <div style={style}>
          <Outlined id="set-1" />
          <Outlined id="set-2" fill={GIFT_PINK} />
        </div>
      );
    }
    default:
      return null;
  }
}
