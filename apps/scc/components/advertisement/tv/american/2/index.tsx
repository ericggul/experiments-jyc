"use client";

import type { CSSProperties, ReactNode } from "react";
import { BroadcastFrame, SceneNavigator, sceneIndexAt, stepAt, useSpotClock, type CaptureOptions, type SceneMark } from "../../player";
import { Cue, presence } from "../cue";

// Colonial Penn, "The Three Ps" (c. 2016, 120 s, daytime direct response).
// Letterboxed 2.35 picture inside 16:9; supers on the right of a studio
// spokesperson, a persistent phone bar from 0:15. Positions measured from the
// capture (YouTube DPl_Db9wZvk) scaled to 1920×1080. People are not drawn:
// shots show the studio or a tone sampled from the original footage.
const DURATION = 120;
const TOP = 119;
const BOTTOM = 937;

const SCENES: readonly SceneMark[] = [
  { id: "intro", label: "Spokesperson", start: 0, end: 4 },
  { id: "three-ps", label: "P___ P___ P___", start: 4, end: 11 },
  { id: "testimonial-1", label: "Testimonials", start: 11, end: 15 },
  { id: "price", label: "PRICE · PRICE · PRICE", start: 15, end: 22 },
  { id: "checklist", label: "Price you can afford", start: 22, end: 27 },
  { id: "testimonial-2", label: "Testimonial", start: 27, end: 33 },
  { id: "nine-95", label: "$9.95 a month", start: 33, end: 50 },
  { id: "age", label: "Age 50-85", start: 50, end: 53 },
  { id: "popular", label: "#1 Most Popular Plan", start: 53, end: 59 },
  { id: "cents", label: "less than 35 cents a day", start: 59, end: 65 },
  { id: "guaranteed", label: "Guaranteed Acceptance", start: 65, end: 73 },
  { id: "rate-lock", label: "Lifetime Rate Lock", start: 73, end: 80 },
  { id: "money-back", label: "30-day money back", start: 80, end: 86 },
  { id: "planner", label: "FREE Beneficiary Planner", start: 86, end: 104 },
  { id: "end-card", label: "Free information & free gift", start: 104, end: DURATION },
];

type Shot = { at: number; tone: [string, string] | null };
const STUDIO = null;
const SHOTS: readonly Shot[] = [
  { at: 0, tone: STUDIO },
  { at: 11, tone: ["#d8d4cf", "#a99f96"] },
  { at: 13, tone: ["#9fb58a", "#5f7a4c"] },
  { at: 14, tone: ["#cdb79a", "#8c6f55"] },
  { at: 15, tone: STUDIO },
  { at: 27, tone: ["#d8d4cf", "#a99f96"] },
  { at: 32, tone: STUDIO },
  { at: 36, tone: ["#9fb58a", "#5f7a4c"] },
  { at: 40, tone: STUDIO },
  { at: 42, tone: ["#cdb79a", "#8c6f55"] },
  { at: 47, tone: STUDIO },
  { at: 89, tone: ["#a3a19c", "#6d6b66"] },
  { at: 99, tone: STUDIO },
];

const SANS = '"Century Gothic", "Avenir Next", Futura, "Helvetica Neue", Arial, sans-serif';
const INK = "#141414";
const RX = 1392; // centre line of the right-hand supers
const right = (top: number, size: number, extra: CSSProperties = {}): CSSProperties => ({
  left: RX - 520,
  width: 1040,
  top,
  textAlign: "center",
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.02em",
  lineHeight: 1.08,
  color: INK,
  ...extra,
});

function Studio() {
  return <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 95% at 62% 45%, #ffffff 0%, #eef0f8 45%, #b6c0ea 80%, #6e80d2 100%)" }} />;
}

function ColonialPennMark({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ position: "relative", width: 300 * scale, height: 74 * scale, fontFamily: '"Times New Roman", Times, serif', color: "#1f3c88" }}>
      <svg width={120 * scale} height={34 * scale} viewBox="0 0 120 34" style={{ position: "absolute", left: 120 * scale, top: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${8 + i * 3} 34 Q60 ${-2 + i * 5} ${112 - i * 3} 34`} fill="none" stroke={i % 2 ? "#ffffff" : "#c8102e"} strokeWidth={3} />
        ))}
        <path d="M30 34 Q60 6 90 34 Z" fill="#1f3c88" opacity={0.85} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 26 * scale, textAlign: "center", fontSize: 34 * scale, letterSpacing: "0.02em", fontVariant: "small-caps" }}>ColonialPenn</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 58 * scale, textAlign: "center", fontFamily: SANS, fontSize: 13 * scale, fontWeight: 700 }}>Colonial Penn® Program</div>
    </div>
  );
}

function PhoneBar({ t }: { t: number }) {
  if (t < 15) return null;
  return (
    <div style={{ position: "absolute", left: 169, top: 755, width: 1588, height: 115, background: "#ffffff", border: "3px solid #8f9bc4", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
      <div style={{ position: "absolute", left: 124, top: -2, fontFamily: SANS, fontWeight: 700, fontSize: 90, letterSpacing: "0.01em", color: INK, lineHeight: 1 }}>1-800-290-6060</div>
      <div style={{ position: "absolute", left: 124, width: 482, top: 84, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 24, color: INK }}>ColonialPenn.com</div>
      <div style={{ position: "absolute", left: 1110, top: 8 }}>
        <ColonialPennMark scale={1.25} />
      </div>
    </div>
  );
}

// Rows measured on the capture: P top-left and its four baseline dashes.
const ROWS = [
  { x: 962, y: 211 },
  { x: 1128, y: 373 },
  { x: 1296, y: 535 },
];
const P_SIZE = 158;

/** P____ ×3; each row then fills to PRICE with copperplate caps above its dashes. */
function ThreePs({ t }: { t: number }) {
  const shown = presence(t, 4, 11, 0.3) || presence(t, 15, 22, 0.3);
  if (shown <= 0) return null;
  const filled = (row: number) => t >= 18 + row * 1.0 + (row === 2 ? 0.5 : 0);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: shown }}>
      {ROWS.map((row, i) => (
        <div key={row.x} style={{ position: "absolute", left: row.x, top: row.y }}>
          <div style={{ fontFamily: SANS, fontSize: P_SIZE, color: INK, lineHeight: 1 }}>P</div>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} style={{ position: "absolute", left: 112 + k * 66, top: 128, width: 46, height: 8, background: INK }} />
          ))}
          {filled(i) ? (
            <div style={{ position: "absolute", left: 104, top: 18, fontFamily: '"Copperplate", "Copperplate Gothic Light", serif', fontSize: 132, letterSpacing: "0.04em", color: "#2a2a2e", lineHeight: 1 }}>
              RICE
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Check({ children, top, t, at }: { children: ReactNode; top: number; t: number; at: number }) {
  return (
    <Cue t={t} at={at} until={27} fade={0.25} style={{ left: 826, top, fontFamily: SANS, fontWeight: 700, fontSize: 84, color: INK, lineHeight: 1 }}>
      <span style={{ color: "#c8102e", marginRight: 10 }}>✓</span>
      {children}
    </Cue>
  );
}

function NineNinetyFive({ t, at, until, lead, fine }: { t: number; at: number; until: number; lead: string; fine: string }) {
  return (
    <>
      <Cue t={t} at={at} until={until} fade={0.3} style={right(250, 64)}>{lead}</Cue>
      <Cue t={t} at={at} until={until} fade={0.3} style={right(392, 110)}>
        <span style={{ fontSize: 80, verticalAlign: "top", position: "relative", top: 18 }}>$</span>
        <span style={{ fontSize: 156 }}>9</span>
        <span style={{ fontSize: 80, verticalAlign: "top", position: "relative", top: 18 }}>.95</span>
        <span> a month</span>
      </Cue>
      <Cue t={t} at={at + 0.4} until={until} fade={0.3} style={right(600, 33, { lineHeight: 1.3 })}>{fine}</Cue>
    </>
  );
}

function Seal({ children, color, t, at, until, left, top }: { children: ReactNode; color: string; t: number; at: number; until: number; left: number; top: number }) {
  return (
    <Cue t={t} at={at} until={until} fade={0.3} style={{ left, top, width: 170, height: 170, borderRadius: "50%", background: `radial-gradient(circle at 40% 35%, #fff3b0, ${color} 70%)`, border: "6px solid #7a5a10", boxSizing: "border-box", display: "grid", placeItems: "center", textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 26, lineHeight: 1.05, color: "#3a2a05" }}>
      {children}
    </Cue>
  );
}

export default function ColonialPennThreePs({ capture }: { capture: CaptureOptions }) {
  const { time: t, paused, seek, togglePause } = useSpotClock(DURATION, SCENES, capture);
  const scene = SCENES[sceneIndexAt(SCENES, t)];
  const shot = stepAt(SHOTS, t);

  return (
    <>
      <BroadcastFrame label={`Colonial Penn TV commercial clone, ${scene.label}`} transparent={!capture.plates} fixed={capture.fixed} onClick={togglePause}>
        <div style={{ position: "absolute", inset: 0, background: "#000" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: TOP, height: BOTTOM - TOP, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: -TOP, height: 1080 }}>
            {capture.plates ? shot?.tone ? <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${shot.tone[0]}, ${shot.tone[1]})` }} /> : <Studio /> : null}

            <Cue t={t} at={0.3} until={4} style={{ left: 290, top: 600, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.7)", lineHeight: 1.1 }}>
              {"Spokesperson\n"}
              <span style={{ fontSize: 20, fontWeight: 400 }}>Compensated Endorser</span>
            </Cue>

            <ThreePs t={t} />
            <Cue t={t} at={4.5} until={10.6} fade={0.3} style={right(788, 67)}>
              {"Age 50-85\n"}
              <span style={{ fontSize: 20, fontStyle: "italic" }}>(ages vary in some states)</span>
            </Cue>

            <Check t={t} at={22} top={276}>Price you can afford</Check>
            <Check t={t} at={24} top={397}>Price can’t increase</Check>
            <Check t={t} at={26} top={518}>Price fits your budget</Check>

            <NineNinetyFive t={t} at={33} until={36} lead={"Coverage options\nstart at"} fine={"You can buy more\nPremium based on coverage option you select\nCoverage amounts based on age and gender"} />
            <NineNinetyFive t={t} at={40} until={42} lead={"Coverage options\nstart at"} fine={"Coverage amounts based on age and gender"} />
            <NineNinetyFive t={t} at={47} until={50} lead={"Coverage options\nstart at"} fine={"Coverage amounts based on age and gender"} />

            <Cue t={t} at={50} until={53} fade={0.3} style={right(300, 102)}>{"Age 50-85"}</Cue>
            <Cue t={t} at={50.3} until={53} fade={0.3} style={right(420, 32, { fontWeight: 400 })}>{"Ages vary in some states"}</Cue>

            <Cue t={t} at={53.4} until={59} fade={0.5} style={right(250, 107)}>{"#1 Most\nPopular Plan"}</Cue>
            <Cue t={t} at={53.4} until={59} fade={0.5} style={right(500, 49, { fontWeight: 400, lineHeight: 1.3 })}>{"available through the\nColonial Penn® Program"}</Cue>

            <NineNinetyFive t={t} at={59} until={65} lead={"Coverage options\nstart at just"} fine={"less than 35 cents a day"} />

            <Cue t={t} at={66} until={73} fade={0.3} style={right(236, 58)}>{"Guaranteed Acceptance"}</Cue>
            <Cue t={t} at={66} until={73} fade={0.3} style={right(320, 67, { fontWeight: 400 })}>
              <b>NO</b>{" medical exam &\n"}
              <b>NO</b>{" health questions"}
            </Cue>
            <Cue t={t} at={66} until={73} fade={0.3} style={right(500, 32, { fontWeight: 400 })}>{"Limited benefit first 2 years"}</Cue>

            <Cue t={t} at={73} until={80} fade={0.3} style={{ left: RX - 95, top: 196, width: 190, height: 150, background: "linear-gradient(180deg, #d8202f, #8f0d18)", clipPath: "polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)", display: "grid", placeItems: "center", fontFamily: SANS, fontWeight: 900, fontSize: 28, lineHeight: 1, color: "#ffe28a", textAlign: "center" }}>
              {"LIFETIME\nRATE LOCK"}
            </Cue>
            <Cue t={t} at={73} until={77} fade={0.3} style={right(390, 70)}>{"Lifetime\nRate Lock"}</Cue>
            <Cue t={t} at={77} until={80} fade={0.3} style={right(390, 70)}>{"Once insured,\nyour rate can\nnever go up"}</Cue>

            <NineNinetyFive t={t} at={80} until={86} lead={"Coverage options\nstart at"} fine={""} />
            <Seal t={t} at={83} until={86} color="#d8a422" left={RX - 85} top={560}>
              {"MONEY\n30\nDAY\nBACK"}
            </Seal>

            <Cue t={t} at={89} until={99} fade={0.4} style={{ left: 1500, top: 150, width: 380, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 56, lineHeight: 1.05, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}>
              <span style={{ fontSize: 60 }}>FREE</span>
              {"\nBeneficiary\nPlanner"}
            </Cue>
            <Cue t={t} at={89} until={93} fade={0.4} style={{ left: 1500, top: 700, width: 380, textAlign: "center", fontFamily: SANS, fontSize: 22, color: "#fff" }}>{"Free gift prohibited in MA"}</Cue>

            <Cue t={t} at={104} until={DURATION + 1} fade={0.5} style={{ left: 300, top: 180, width: 420, height: 520, background: "linear-gradient(160deg, #3a5ea8, #1d3466)", border: "3px solid #fff", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 40, lineHeight: 1.05, color: "#fff", background: "#c8102e", padding: "8px 0", whiteSpace: "pre" }}>{"Free Information\n& Free Gift"}</div>
            </Cue>
            <Cue t={t} at={104} until={DURATION + 1} fade={0.5} style={{ left: 840, top: 150 }}>
              <ColonialPennMark scale={1.7} />
            </Cue>
            <Cue t={t} at={104.3} until={DURATION + 1} fade={0.5} style={{ left: 760, width: 1000, top: 290, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 30, lineHeight: 1.25, color: INK }}>
              {"Or Write: The Colonial Penn® Program\nDept. 3P, Philadelphia, PA 19181"}
            </Cue>
            <Cue t={t} at={104.6} until={DURATION + 1} fade={0.5} style={{ left: 760, width: 1000, top: 390, textAlign: "center", fontFamily: SANS, fontSize: 21, lineHeight: 1.35, color: "#2a2a2a" }}>
              {"Guaranteed Acceptance Whole Life Insurance is underwritten by\nColonial Penn Life Insurance Company, Philadelphia, PA.\nPolicy Form 12-82-034. Benefits reduced first two years.\nPremiums based on age and number of units purchased.\nThis is a solicitation of insurance. An insurance agent may contact you.\nNot available in all states."}
            </Cue>
          </div>
        </div>
        <PhoneBar t={t} />
      </BroadcastFrame>
      {capture.nav ? <SceneNavigator scenes={SCENES} time={t} duration={DURATION} paused={paused} onSeek={seek} onTogglePause={togglePause} /> : null}
    </>
  );
}
