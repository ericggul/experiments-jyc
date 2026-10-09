"use client";

import { spoqa } from "../../fonts";
import { BroadcastFrame, SceneNavigator, sceneIndexAt, useSpotClock, type CaptureOptions } from "../../player";
import { RadarChart, RadarLabels } from "./radar";
import { BEATS, BRAND, DURATION, PHONE, PRODUCT, SCENES } from "./scenes";

const NAVY = "#123a8c";
const RED = "#e8262f";
const YELLOW = "#ffe100";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const pop = (p: number) => {
  const v = clamp01(p);
  return v < 0.7 ? (v / 0.7) * 1.1 : 1.1 - ((v - 0.7) / 0.3) * 0.1;
};

function BottomBar() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, display: "flex" }}>
      <div
        style={{
          width: 980,
          background: `linear-gradient(90deg, ${NAVY}, #1e56c4)`,
          clipPath: "polygon(0 0, 100% 0, 94% 100%, 0 100%)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 80,
          gap: 22,
          color: "#fff",
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.05em", opacity: 0.9 }}>{BRAND}</span>
        <span style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.06em" }}>{PRODUCT}</span>
      </div>
      <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: 34, fontWeight: 700, color: RED, letterSpacing: "-0.04em" }}>무료상담</span>
        <span style={{ fontSize: 104, fontWeight: 700, color: NAVY, letterSpacing: "-0.05em", lineHeight: 1 }}>{PHONE}</span>
      </div>
    </div>
  );
}

/** Daytime direct-response analysis spot: a centred polygon chart per scene. */
export default function AnalysisSpot({ capture }: { capture: CaptureOptions }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const t = time - scene.start;
  const title = pop(ramp(t, BEATS.title, BEATS.title + 0.4));
  const verdict = pop(ramp(t, BEATS.verdict, BEATS.verdict + 0.4));

  return (
    <>
      <BroadcastFrame className={spoqa.className} label={`다각형 보장분석 TV 광고, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        {capture.plates ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #f7faff 0%, #dfe9f8 100%)" }} /> : null}
        <div style={{ position: "absolute", left: 70, top: 40, fontSize: 30, fontWeight: 500, color: "#6b7a99" }}>광고방송</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", transform: `scale(${title})`, opacity: Math.min(1, title) }}>
          <div style={{ display: "inline-block", padding: "6px 28px 8px", background: RED, color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em" }}>{scene.kicker}</div>
          <div style={{ marginTop: 10, fontSize: 70, fontWeight: 700, color: NAVY, letterSpacing: "-0.06em" }}>{scene.title}</div>
        </div>
        <RadarChart axes={scene.axes} t={t} />
        <RadarLabels axes={scene.axes} t={t} />
        {verdict > 0 ? (
          <div
            style={{
              position: "absolute",
              right: 110,
              top: 400,
              padding: "22px 34px 26px",
              background: NAVY,
              borderRadius: 18,
              color: "#fff",
              textAlign: "center",
              transform: `scale(${verdict})`,
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.05em" }}>{scene.verdict[0]}</div>
            <div style={{ fontSize: 96, fontWeight: 700, color: YELLOW, letterSpacing: "-0.05em", lineHeight: 1.05 }}>{scene.verdict[1]}</div>
          </div>
        ) : null}
        {verdict > 0 ? (
          <div style={{ position: "absolute", left: 110, top: 430, width: 360, fontSize: 30, lineHeight: 1.5, color: "#33415c", fontWeight: 500 }}>
            <div><span style={{ color: "#2468e6", fontWeight: 700 }}>- - -</span> 권장 보장</div>
            <div><span style={{ color: RED, fontWeight: 700 }}>■</span> 현재 내 보장</div>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 158, textAlign: "center", fontSize: 24, color: "#5b6680" }}>{scene.footnote}</div>
        <BottomBar />
      </BroadcastFrame>
      {capture.nav ? <SceneNavigator scenes={SCENES} time={time} duration={DURATION} paused={paused} onSeek={seek} onTogglePause={togglePause} /> : null}
    </>
  );
}
