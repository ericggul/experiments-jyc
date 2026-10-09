import { FittedLine, type FittedLineData } from "../../../player";
import { FITTED } from "../fitted";
import type { SceneId } from "../scenes";
import { WHITE, YELLOW } from "./text";

// Scene captions, each placed syllable by syllable from `fitted.ts`.
const SHADOW = "0 2px 5px rgba(0,0,0,0.5)";
type LineId = keyof typeof FITTED;

function L({ id, color = WHITE, colors }: { id: LineId; color?: string; colors?: (i: number) => string | undefined }) {
  const line = FITTED[id] as FittedLineData;
  if (!colors) return <FittedLine line={line} color={color} shadow={SHADOW} />;
  // Highlight runs: colour by syllable index (spaces are not counted).
  let index = -1;
  return (
    <FittedLine line={line} color={color} shadow={SHADOW}>
      {Array.from(line.text).map((char, position) => {
        if (char !== " ") index += 1;
        const tint = char === " " ? undefined : colors(index);
        return (
          <span key={`${position}-${char}`} style={tint ? { color: tint } : undefined}>
            {char}
          </span>
        );
      })}
    </FittedLine>
  );
}

/** Highlight glyphs [from, to) once `on`. */
const run = (from: number, to: number, on: boolean) => (i: number) => (on && i >= from && i < to ? YELLOW : undefined);
const runs = (...parts: ((i: number) => string | undefined)[]) => (i: number) => parts.map((p) => p(i)).find(Boolean);

function Subscriber({ prefix }: { prefix: "barista" | "dancers" | "story" }) {
  return (
    <>
      <div style={{ position: "absolute", left: 231, top: 588, width: 9, height: 272, background: WHITE, boxShadow: SHADOW }} />
      <L id={`${prefix}-sub-1`} />
      <L id={`${prefix}-sub-2`} color={YELLOW} />
      <L id={`${prefix}-sub-3`} />
    </>
  );
}

export function SceneOverlay({ scene, t }: { scene: SceneId; t: number }) {
  switch (scene) {
    case "intro":
      return (
        <>
          <L id="intro-1" />
          <L id="intro-2" color={t >= 2.0 ? YELLOW : WHITE} />
          <L id="intro-name" />
        </>
      );
    case "barista":
      return t >= 7.0 ? <Subscriber prefix="barista" /> : null;
    case "barista-cu":
      return (
        <>
          <L id="barista-cu-1" />
          <L id="barista-cu-2" color={t >= 10.9 ? YELLOW : WHITE} />
        </>
      );
    case "dancers":
      return t >= 14.4 ? <Subscriber prefix="dancers" /> : null;
    case "couple-cu":
      return (
        <>
          <L id="couple-cu-1" />
          <L id="couple-cu-2" color={t >= 19.5 ? YELLOW : WHITE} />
        </>
      );
    case "storyteller":
      return t >= 23.1 ? <Subscriber prefix="story" /> : null;
    case "teacher-cu":
      return (
        <>
          <L id="teacher-cu-1" />
          <L id="teacher-cu-2" color={t >= 28.1 ? YELLOW : WHITE} />
        </>
      );
    case "disappointed":
      return (
        <>
          <L id="dis-1" />
          <L id="dis-2" />
        </>
      );
    case "disappointed-cu":
      return (
        <>
          <L id="discu-1" />
          <L id="discu-2" />
        </>
      );
    case "age":
      return (
        <>
          <L id="age-1" />
          {/* 55~83 → glyphs 0–4, 세 → 5 */}
          <L id="age-2" colors={runs(run(0, 5, t >= 41.7), run(5, 6, t >= 43.2))} />
          <div style={{ position: "absolute", left: 954, top: 590, width: 547, height: 10, background: WHITE, boxShadow: SHADOW }} />
        </>
      );
    case "no-exam":
      return t < 47.2 ? (
        <>
          <L id="ill-1" />
          <L id="ill-2" />
        </>
      ) : (
        <>
          <L id="noexam-1" color={t >= 47.5 ? YELLOW : WHITE} />
          <L id="noexam-2" color={t >= 48.0 ? YELLOW : WHITE} />
          <L id="noexam-3" />
          <L id="void" />
        </>
      );
    case "premium":
      return (
        <>
          <L id="premium-1" />
          <L id="premium-2" />
          <L id="void" />
        </>
      );
    case "chalk":
      return (
        <>
          <L id="chalk-1" />
          <L id="chalk-2" />
          <L id="death-1" />
          <L id="death-2" />
        </>
      );
    case "payout":
      return (
        <>
          <L id="payout-1" />
          {/* 사망보험금 = glyphs 0–4, 1천만원 = 5–8 */}
          <L id="payout-2" colors={run(5, 9, t >= 56.9)} />
          <L id="payout-3" />
          <L id="death-1" />
          <L id="death-2" />
        </>
      );
    case "check":
      return (
        <>
          <L id="check-1" />
          <L id="check-2" />
        </>
      );
    case "call":
    case "call-again":
      return (
        <>
          <L id="call-1" />
          <L id="call-2" />
        </>
      );
    case "joined":
      return <L id="joined" />;
    case "anyone":
      return (
        <>
          {/* 나이 0–1 · 2, 지병 3–4 · 5, 병력 6–7 */}
          <L id="anyone-1" colors={runs(run(0, 2, t >= 70.2), run(3, 5, t >= 70.9), run(6, 8, t >= 71.3))} />
          <L id="anyone-2" />
          <L id="cheaper-1" />
          <L id="cheaper-2" />
        </>
      );
    case "call-now":
      return (
        <>
          <L id="callnow-1" />
          <L id="callnow-2" />
        </>
      );
    default:
      return null;
  }
}
