import { Plate } from "../../../player";
import { plateUrl, type SceneId } from "../scenes";
import { Box, Fit, pop, ramp, WHITE } from "./type";

// Opening consultation-gift segment (0–5.72 s): gift panel top left, conditions
// top right and bottom, plus the per-shot captions.
const NOTE_INK = "#2e2f30";
/** Cream fill with the orange outline used on the pot captions. */
const POT_STROKE =
  "0 0 2px #d27b45, 1px 1px 0 #d27b45, -1px -1px 0 #d27b45, 1px -1px 0 #d27b45, -1px 1px 0 #d27b45, 0 0 6px rgba(140,70,30,0.6)";

function GiftPanel({ plates }: { plates: boolean }) {
  return (
    <>
      <Box x={66} y={98} w={434} h={39} style={{ background: "#97b8c6", borderTopLeftRadius: 16 }} />
      <Fit id="g-tl-head" color="#cfe2e9" />
      <Box x={50} y={140} w={455} h={47} style={{ background: "#ffffff" }} />
      <Fit id="g-tl-item" color={NOTE_INK} />
      <Box x={505} y={25} w={280} h={172} style={{ overflow: "hidden", boxShadow: "0 0 0 2px #e6e6e6" }}>
        {plates ? <Plate src={plateUrl("gift-thumb")} tone={["#f4f1ec", "#e3d6c6"]} /> : null}
      </Box>
      <div style={{ position: "absolute", left: 56, top: 211, fontSize: 26, lineHeight: 1, letterSpacing: "-0.06em", color: "rgba(255,255,255,0.75)" }}>광고방송</div>
      <Box x={180} y={207} w={365} h={30} style={{ background: "#ffffff" }} />
      <Fit id="g-tl-event" color={NOTE_INK} />
      <Box x={50} y={243} w={115} h={33} style={{ background: "#ffffff" }} />
      <Fit id="g-tl-consult" color={NOTE_INK} />
      <Box x={175} y={243} w={245} h={33} style={{ background: "#3e3070" }} />
      <Fit id="g-tl-num" color="#f2f0ff" />
      <Box x={880} y={70} w={586} h={96} style={{ background: "#ffffff" }} />
      <Fit id="g-tr-1" color={NOTE_INK} />
      <Fit id="g-tr-2" color={NOTE_INK} />
      <Fit id="g-tr-3" color={NOTE_INK} />
      <Box x={213} y={807} w={1495} h={114} style={{ background: "#ffffff" }} />
      <Fit id="g-note-1" color={NOTE_INK} />
      <Fit id="g-note-2" color={NOTE_INK} />
    </>
  );
}

function LockCaption({ t }: { t: number }) {
  if (t < 1.2) return null;
  const grey = "#b8b9bc";
  return (
    <>
      <Box x={812} y={240} w={490} h={158} style={{ background: "rgba(66,68,74,0.8)", borderRadius: 22 }} />
      <Fit id="g-lock-1" color={WHITE} />
      <Fit id="g-lock-2" color={WHITE} reveal={ramp(t, 1.3, 1.8)} runs={[[3, 5, grey], [7, 9, grey]]} />
    </>
  );
}

export function GiftOverlay({ scene, t, plates }: { scene: SceneId; t: number; plates: boolean }) {
  return (
    <>
      {scene === "gift-done" ? (
        <>
          <Box x={0} y={458} w={684} h={142} style={{ background: "rgba(146,180,194,0.94)" }} />
          <Box x={125} y={573} w={518} h={6} style={{ background: "#f4fbfd" }} />
          <Fit id="g-done" color={WHITE} shadow="0 1px 3px rgba(40,70,80,0.35)" />
        </>
      ) : null}
      {scene === "gift-lock" ? (
        <>
          {t >= 1.8 ? (
            <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080} aria-hidden>
              <ellipse cx={411} cy={500} rx={322} ry={298} fill="none" stroke="#ffffff" strokeWidth={9} strokeDasharray="38 28" />
            </svg>
          ) : null}
          <LockCaption t={t} />
        </>
      ) : null}
      {scene === "gift-pot" || scene === "gift-give" ? (
        <>
          <Box x={302} y={326} w={86} h={78} style={{ background: "#ef9150", borderRadius: 4, clipPath: `inset(0 ${(1 - ramp(t, 3.2, 3.4)) * 100}% 0 0)` }} />
          <Fit id="g-pot" color="#fee4ca" shadow={POT_STROKE} reveal={ramp(t, 3.2, 3.4)} />
          <Fit id="g-give" color="#fee4ca" shadow={POT_STROKE} scale={pop(t, 4.8, 0.3)} />
        </>
      ) : null}
      <GiftPanel plates={plates} />
    </>
  );
}

