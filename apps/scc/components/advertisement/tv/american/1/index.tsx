"use client";

import { BroadcastFrame, SceneNavigator, sceneIndexAt, useSpotClock, type CaptureOptions, type SceneMark } from "../../player";
import { Cue } from "../cue";

// Law Offices of James Sokolove, "Mesothelioma" (c. 2003, 30 s): a 4:3 card of
// embossed Times captions on grey-green, pillarboxed. Layout measured from the
// capture (YouTube x7wLAy_uRyo) scaled to 1920×1080; the picture is x 240–1680.
const DURATION = 30;
const SCENES: readonly SceneMark[] = [
  { id: "title", label: "Mesothelioma", start: 0, end: 5.6 },
  { id: "definition", label: "a rare, malignant type of cancer", start: 5.6, end: 13.6 },
  { id: "diagnosed", label: "If you or a loved one…", start: 13.6, end: 18.6 },
  { id: "law-office", label: "Law Offices of James Sokolove", start: 18.6, end: DURATION },
];

const SERIF = '"Times New Roman", Times, serif';
const INK = "#3b3f66";
// Tape-era emboss: a light upper-left edge and a soft dark lower-right shadow.
const EMBOSS = "-3px -3px 0 rgba(255,255,255,0.9), 3px 3px 0 #8d91aa, 4px 5px 3px rgba(20,20,40,0.35)";
const centred = { left: 240, width: 1440, textAlign: "center" } as const;

const serif = (size: number, extra: object = {}) => ({ ...centred, fontFamily: SERIF, fontSize: size, color: INK, textShadow: EMBOSS, lineHeight: 1, ...extra });

function Phone({ t, at, until, top }: { t: number; at: number; until: number; top: number }) {
  return (
    <Cue
      t={t}
      at={at}
      until={until}
      style={{ ...centred, top, fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700, fontSize: 160, letterSpacing: "-0.01em", color: "#1c1c1f", lineHeight: 1, textShadow: "-2px -2px 0 rgba(255,255,255,0.8), 3px 3px 3px rgba(0,0,0,0.4)" }}
    >
      1-800-492-4332
    </Cue>
  );
}

export default function SokoloveMesothelioma({ capture }: { capture: CaptureOptions }) {
  const { time: t, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, t)];
  const italicTitle = serif(136, { fontStyle: "italic", fontWeight: 700, letterSpacing: "0.1em" });

  return (
    <>
      <BroadcastFrame label={`Mesothelioma legal TV commercial clone, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        <div style={{ position: "absolute", inset: 0, background: "#000" }} />
        <div
          style={{
            position: "absolute",
            left: 240,
            top: 0,
            width: 1440,
            height: 1080,
            background: "radial-gradient(ellipse at 50% 45%, #dde2db 0%, #d2d8d0 60%, #c3c9c1 100%)",
            filter: "blur(1.1px)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, transform: "translateX(-240px)" }}>
            <Cue t={t} at={0} until={5.6} fade={0.6} style={{ ...serif(150, { fontWeight: 400 }), top: 430 }}>
              Mesothelioma
            </Cue>
            <Cue t={t} at={5.4} until={18.6} fade={0.6} style={{ ...italicTitle, top: 112 }}>
              Mesothelioma
            </Cue>
            <Cue t={t} at={5.6} until={13.6} fade={0.6} style={{ ...serif(90, { fontWeight: 400, lineHeight: "112px" }), top: 290 }}>
              {"Mesothelioma is a rare,\nmalignant type of cancer, in the\nlungs, usually associated with\nexposure to asbestos."}
            </Cue>
            <Phone t={t} at={5.6} until={18.6} top={808} />
            <Cue t={t} at={13.8} until={18.6} fade={0.6} style={{ ...serif(90, { fontWeight: 400, lineHeight: "112px" }), top: 405 }}>
              {"If you or a loved one have been\ndiagnosed with Mesothelioma."}
            </Cue>
            <Cue t={t} at={18.6} until={DURATION + 1} fade={0.6} style={{ ...italicTitle, top: 82 }}>
              Mesothelioma
            </Cue>
            <Cue t={t} at={18.8} until={DURATION + 1} fade={0.6} style={{ ...serif(80, { fontWeight: 400 }), top: 252 }}>
              A service of the
            </Cue>
            <Cue t={t} at={18.8} until={DURATION + 1} fade={0.6} style={{ ...serif(128, { fontWeight: 400, lineHeight: "160px" }), top: 345 }}>
              {"Law Offices of\nJames Sokolove*"}
            </Cue>
            <Phone t={t} at={18.8} until={DURATION + 1} top={700} />
            <Cue
              t={t}
              at={18.8}
              until={DURATION + 1}
              fade={0.6}
              style={{ ...centred, top: 872, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 29, lineHeight: "36px", color: "#4b4f5e", textShadow: "1px 1px 1px rgba(0,0,0,0.3)" }}
            >
              {"*Sokolove admitted in MA & NY only. In Massachusetts: One Boston Place,\nBoston, MA 02108. In New York: 339 Main St. Catskill, NY 12414.\nWhile the firm maintains joint responsibility, cases of this type are referred\nto other attorneys for principal responsibility. Not available in all states."}
            </Cue>
          </div>
        </div>
      </BroadcastFrame>
      {capture.nav ? <SceneNavigator scenes={SCENES} time={t} duration={DURATION} paused={paused} onSeek={seek} onTogglePause={togglePause} /> : null}
    </>
  );
}
