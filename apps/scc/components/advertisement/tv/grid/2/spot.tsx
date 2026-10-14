"use client";

import { spoqa } from "@/components/advertisement/tv/fonts";
import { BroadcastFrame, SceneNavigator, sceneIndexAt, useFrameSize, useSpotClock, type CaptureOptions } from "@/components/advertisement/tv/player";
import { KOREAN, sceneCopy, type Copy } from "./copy";
import { DEFAULT_PALETTE, type Palette } from "./palette";
import { chartFor, RadarChart, RadarLabels, type Chrome } from "./radar";
import { BEATS, DURATION, SCENES } from "./scenes";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const pop = (p: number) => {
  const v = clamp01(p);
  return v < 0.7 ? (v / 0.7) * 1.1 : 1.1 - ((v - 0.7) / 0.3) * 0.1;
};

function BottomBar({ copy, palette }: { copy: Copy; palette: Palette }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, display: "flex" }}>
      <div
        style={{
          width: 980,
          background: `linear-gradient(90deg, ${palette.primary}, ${palette.primaryLight})`,
          clipPath: "polygon(0 0, 100% 0, 94% 100%, 0 100%)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 80,
          gap: 22,
          color: "#fff",
        }}
      >
        <span style={{ fontSize: copy.size.brand, fontWeight: 500, letterSpacing: "-0.05em", opacity: 0.9, whiteSpace: "nowrap" }}>{copy.brand}</span>
        <span style={{ fontSize: copy.size.product, fontWeight: 700, letterSpacing: "-0.06em", whiteSpace: "nowrap" }}>{copy.product}</span>
      </div>
      <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: copy.size.call, fontWeight: 700, color: palette.accent, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>{copy.call}</span>
        <span style={{ fontSize: copy.size.phone, fontWeight: 700, color: palette.primary, letterSpacing: "-0.05em", lineHeight: 1, whiteSpace: "nowrap" }}>{copy.phone}</span>
      </div>
    </div>
  );
}

/**
 * grid/2's own copy of the korean/5 analysis spot (copied from grid/1) (a centred polygon chart per scene), laid out
 * against any frame height, in either language, with or without the phone bar. Kept apart from
 * korean/5 so the wall can change without touching that experiment.
 */
export default function AnalysisSpot({ capture, fit, copy = KOREAN, chrome = "full", palette = DEFAULT_PALETTE }: { capture: CaptureOptions; fit?: "contain" | "width"; copy?: Copy; palette?: Palette; /** `full` is the broadcast layout; `bare` drops the marker, footnote and phone bar; `chart` keeps only the chart and its axis labels, grown to the frame. */ chrome?: Chrome }) {
  const { time, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, time)];
  const t = time - scene.start;

  return (
    <>
      <BroadcastFrame className={spoqa.className} label={`다각형 보장분석 TV 광고, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} fit={fit} onClick={togglePause}>
        <Layers scene={scene} t={t} plates={capture.plates} copy={copy} chrome={chrome} palette={palette} />
      </BroadcastFrame>
      {capture.nav ? <SceneNavigator scenes={SCENES} time={time} duration={DURATION} paused={paused} onSeek={seek} onTogglePause={togglePause} /> : null}
    </>
  );
}

/** The frame's layers, laid out against its height: header at the top, phone bar at the bottom, the chart between. */
function Layers({ scene, t, plates, copy, chrome, palette }: { scene: (typeof SCENES)[number]; t: number; plates: boolean; copy: Copy; chrome: Chrome; palette: Palette }) {
  const { height } = useFrameSize();
  const words = sceneCopy(copy, scene);
  const chart = chartFor(height, chrome, scene.axes.length);
  const banner = chrome === "full";
  const chartOnly = chrome === "chart";
  // The verdict box and legend keep their 1080 offsets from the chart centre.
  const beside = chart.cy - 568;
  const title = pop(ramp(t, BEATS.title, BEATS.title + 0.4));
  const verdict = pop(ramp(t, BEATS.verdict, BEATS.verdict + 0.4));
  return (
    <>
      {plates ? <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${palette.background[0]} 0%, ${palette.background[1]} 100%)` }} /> : null}
      {banner ? <div style={{ position: "absolute", left: 70, top: 40, fontSize: 30, fontWeight: 500, color: palette.muted.marker, whiteSpace: "nowrap" }}>{copy.marker}</div> : null}
      {chartOnly ? null : (
        <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", transform: `scale(${title})`, opacity: Math.min(1, title) }}>
          <div style={{ display: "inline-block", padding: "6px 28px 8px", background: palette.accent, color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em" }}>{words.kicker}</div>
          <div style={{ marginTop: 10, fontSize: copy.size.title, fontWeight: 700, color: palette.primary, letterSpacing: "-0.06em", whiteSpace: "nowrap" }}>{words.title}</div>
        </div>
      )}
      <RadarChart axes={scene.axes} t={t} chart={chart} height={height} palette={palette} />
      <RadarLabels axes={scene.axes} labels={words.axes} t={t} chart={chart} fontSize={copy.size.axis} palette={palette} />
      {verdict > 0 && !chartOnly ? (
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 400 + beside,
            padding: "22px 34px 26px",
            background: palette.primary,
            borderRadius: 18,
            color: "#fff",
            textAlign: "center",
            transform: `scale(${verdict})`,
            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.05em", whiteSpace: "nowrap" }}>{words.verdict[0]}</div>
          <div style={{ fontSize: copy.size.verdict, fontWeight: 700, color: palette.highlight, letterSpacing: "-0.05em", lineHeight: 1.05, whiteSpace: "nowrap" }}>{words.verdict[1]}</div>
        </div>
      ) : null}
      {verdict > 0 && !chartOnly ? (
        <div style={{ position: "absolute", left: 110, top: 430 + beside, width: copy.size.legend, fontSize: 30, lineHeight: 1.5, color: palette.muted.legend, fontWeight: 500 }}>
          <div><span style={{ color: palette.recommended, fontWeight: 700 }}>- - -</span> {copy.legend.recommended}</div>
          <div><span style={{ color: palette.accent, fontWeight: 700 }}>■</span> {copy.legend.mine}</div>
        </div>
      ) : null}
      {banner ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 158, textAlign: "center", fontSize: 24, color: palette.muted.footnote }}>{words.footnote}</div> : null}
      {banner ? <BottomBar copy={copy} palette={palette} /> : null}
    </>
  );
}
