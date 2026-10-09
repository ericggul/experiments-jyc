import type { CSSProperties, ReactNode } from "react";
import { Plate } from "../../../player";
import { plateUrl, type SceneId } from "../scenes";
import { INSET_TONES } from "../tones";
import { ProductLogo } from "./bar";
import { CAPTION_RED, CAPTION_SHADOW, DX_PINK, INK, L, SOFT_PINK, WHITE, easeOut, fitted, ramp, run, type LineId } from "./text";

// Scene captions from the family card to the call to action. Boxes are the
// measured red highlight fills; `t` is the spot clock.
type Rect = readonly [number, number, number, number];

function Fill({ rect, color = CAPTION_RED, style, children }: { rect: Rect; color?: string; style?: CSSProperties; children?: ReactNode }) {
  const [x0, y0, x1, y1] = rect;
  return (
    <div style={{ position: "absolute", left: x0, top: y0, width: x1 - x0, height: y1 - y0, background: color, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

/** A fitted line drawn inside a clipped box, in frame coordinates. */
function Inside({ rect, dy = 0, dx = 0, children }: { rect: Rect; dy?: number; dx?: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: -rect[0] + dx, top: -rect[1] + dy, width: 1920, height: 1080 }}>{children}</div>;
}

/** Reveal that rises out of a mask line (0.15 s), used by most captions. */
function Rise({ t, at, duration = 0.15, children }: { t: number; at: number; duration?: number; children: ReactNode }) {
  if (t < at) return null;
  const p = easeOut(ramp(t, at, duration));
  return <div style={{ position: "absolute", inset: 0, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{children}</div>;
}

/** Vertical squash-in about each line's centre, as the diagnosis rows do. */
function Squash({ t, at, cy, children }: { t: number; at: number; cy: number; children: ReactNode }) {
  if (t < at) return null;
  const p = easeOut(ramp(t, at, 0.15));
  return <div style={{ position: "absolute", inset: 0, transform: `scaleY(${p})`, transformOrigin: `50% ${cy}px` }}>{children}</div>;
}

const shadowed = (id: LineId, color = WHITE) => <L id={id} color={color} shadow={CAPTION_SHADOW} />;

// ── 우리 가족에게 치매가 찾아오면 ──────────────────────────────────────────
const CARD_BOX: Rect = [664, 471, 894, 616];

function FamilyCard({ t }: { t: number }) {
  const drop = easeOut(ramp(t, 6.5, 0.2));
  return (
    <>
      <L id="card-1" color={INK} />
      <Fill rect={CARD_BOX} style={{ boxShadow: "2px 3px 4px rgba(0,0,0,0.25)" }}>
        {t >= 6.5 ? (
          <Inside rect={CARD_BOX} dy={(drop - 1) * 150}>
            <L id="card-2a" />
          </Inside>
        ) : null}
      </Fill>
      <L id="card-2b" color={INK} />
      <L id="card-3" color={INK} />
      {/* Photo: red frame, white mat, plate. */}
      <div style={{ position: "absolute", left: 1061, top: 327, width: 416, height: 420, background: "#f21a3c", boxShadow: "4px 5px 6px rgba(0,0,0,0.3)" }} />
      <div style={{ position: "absolute", left: 1072, top: 341, width: 394, height: 391, background: "#fbfbf8" }} />
      <div style={{ position: "absolute", left: 1088, top: 354, width: 364, height: 365, overflow: "hidden" }}>
        <Plate src={plateUrl("card-photo")} tone={INSET_TONES["card-photo"]} />
      </div>
    </>
  );
}

// ── 치매, ○○이 듭니다 ─────────────────────────────────────────────────────
const COST_BOX: Rect = [728, 422, 990, 570];
const WORDS = [
  { id: "box-time", at: 10.2 },
  { id: "box-strength", at: 14.3 },
  { id: "box-money", at: 18.4 },
] as const satisfies readonly { id: LineId; at: number }[];
const ROLL = 0.45;

/** The boxed word rolls in from above, pushing the previous one out below. */
function CostBox({ t }: { t: number }) {
  let current = -1;
  WORDS.forEach((word, i) => {
    if (t >= word.at) current = i;
  });
  const p = current >= 0 ? easeOut(ramp(t, WORDS[current].at, ROLL)) : 1;
  const rolling = p < 1;
  const height = COST_BOX[3] - COST_BOX[1];
  return (
    <Fill rect={COST_BOX} color={rolling ? "#c8123e" : CAPTION_RED}>
      {current > 0 && rolling ? (
        <Inside rect={COST_BOX} dy={p * height}>
          <L id={WORDS[current - 1].id} />
        </Inside>
      ) : null}
      {current >= 0 ? (
        <Inside rect={COST_BOX} dy={(p - 1) * height}>
          <L id={WORDS[current].id} />
        </Inside>
      ) : null}
    </Fill>
  );
}

function Cost({ scene, t }: { scene: SceneId; t: number }) {
  return (
    <>
      {shadowed("main-a")}
      <CostBox t={t} />
      {shadowed("main-b")}
      {scene === "time" ? (
        <>
          <Rise t={t} at={8.8}>
            <L id="sub-time" shadow={CAPTION_SHADOW} colors={run(6, 15, CAPTION_RED)} />
          </Rise>
          <L id="src-time" shadow={CAPTION_SHADOW} />
        </>
      ) : null}
      {scene === "strength" ? (
        <>
          <Rise t={t} at={12.6}>
            <L id="sub-strength" shadow={CAPTION_SHADOW} colors={run(8, 17, CAPTION_RED)} />
          </Rise>
          <L id="src-report" shadow={CAPTION_SHADOW} />
        </>
      ) : null}
      {scene === "money" ? (
        <>
          <Rise t={t} at={16.4}>
            <L id="sub-money" shadow={CAPTION_SHADOW} colors={run(11, 19, CAPTION_RED)} />
          </Rise>
          <L id="src-money-1" shadow={CAPTION_SHADOW} />
          <L id="src-money-2" shadow={CAPTION_SHADOW} />
          <L id="src-money-3" shadow={CAPTION_SHADOW} />
        </>
      ) : null}
    </>
  );
}

// ── 생명보험 판매자격 보유 / NAVER ─────────────────────────────────────────
function NameTag({ t }: { t: number }) {
  if (t < 22.6) return null;
  const p = easeOut(ramp(t, 22.6, 0.2));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p, transform: `scale(${0.9 + 0.1 * p})`, transformOrigin: "1226px 777px" }}>
      <div style={{ position: "absolute", left: 1225, top: 720, width: 122, height: 58, background: "#000" }} />
      <div style={{ position: "absolute", left: 1226, top: 777, width: 376, height: 50, background: "#ffe510" }} />
      {/* The presenter's given name is masked: plates are generated, not him. */}
      <L id="name" />
      <L id="cert" color="#000" />
    </div>
  );
}

const NAVER_GREEN = "linear-gradient(180deg, #00f90b 0%, #00e618 50%, #00da23 100%)";

function NaverSearch({ t }: { t: number }) {
  if (t < 23.9) return null;
  // Green "N" tile, then the search field opens out from the centre (x 960).
  const open = easeOut(ramp(t, 24.8, 0.3));
  const width = 64 + (580 - 64) * open;
  const left = 960 - width / 2;
  const typedChars = t >= 25.5 ? 5 : t >= 25.4 ? 1 : 0;
  return (
    <>
      <div style={{ position: "absolute", left, top: 785, width, height: 82, background: NAVER_GREEN, boxShadow: "0 3px 6px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        {open > 0 ? <div style={{ position: "absolute", right: 4, top: 4, bottom: 4, width: Math.max(0, width - 214), background: "#fff" }} /> : null}
        <div
          style={{
            position: "absolute",
            left: open > 0.6 ? 28 : 0,
            width: open > 0.6 ? undefined : width,
            top: 0,
            height: 82,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "Arial Black, Arial, sans-serif",
            fontWeight: 900,
            fontSize: open > 0.6 ? 41 : 44,
            letterSpacing: "0.01em",
          }}
        >
          {open > 0.6 ? "NAVER" : "N"}
        </div>
      </div>
      {open >= 1 ? (
        <>
          <L id="naver-query" color="#111" visible={(i) => i < typedChars} />
          {t >= 25.6 ? (
            <svg style={{ position: "absolute", left: 1211, top: 819 }} width={15} height={13} viewBox="0 0 15 13" aria-hidden>
              <path d="M0 0h15L7.5 13z" fill="#00d21e" />
            </svg>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function Product({ t }: { t: number }) {
  if (t < 24.45) return null;
  const p = easeOut(ramp(t, 24.45, 0.25));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scaleY(${p})`, transformOrigin: "50% 470px" }}>
      <ProductLogo />
    </div>
  );
}

// ── [특약] 매월 평~생 보장 ─────────────────────────────────────────────────
function Rider({ t }: { t: number }) {
  const zoom = easeOut(ramp(t, 31.4, 0.25));
  return (
    <>
      <Squash t={t} at={28.4} cy={400}>
        {shadowed("rider-1")}
        {shadowed("rider-2a")}
      </Squash>
      <Squash t={t} at={29.9} cy={450}>
        {shadowed("rider-2b", CAPTION_RED)}
      </Squash>
      {t >= 31.4 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 0.4 + 0.6 * zoom, transform: `scale(${1.25 - 0.25 * zoom})`, transformOrigin: "640px 590px" }}>
          {shadowed("rider-3a")}
          {shadowed("rider-3b", CAPTION_RED)}
        </div>
      ) : null}
    </>
  );
}

// ── 경도 / 중등도 / 중증 치매 진단금 ────────────────────────────────────────
const DX_ROWS = [
  { a: "dx-1a", b: "dx-1b", at: 32.7 },
  { a: "dx-2a", b: "dx-2b", at: 33.0 },
  { a: "dx-3a", b: "dx-3b", at: 33.3 },
] as const satisfies readonly { a: LineId; b: LineId; at: number }[];
const DX_SHADOW = "2px 3px 3px rgba(0,0,0,0.22)";
const DX_FADE: CSSProperties = {
  backgroundImage: "linear-gradient(90deg, rgba(46,54,47,0.18) 0px, rgba(46,54,47,0.95) 180px)",
  backgroundPosition: "0 0",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

function Diagnosis({ t }: { t: number }) {
  const chimae = fitted("dx-3c");
  const offset = chimae.top - fitted("dx-3b").top;
  return (
    <>
      {DX_ROWS.map((row) => {
        const top = fitted(row.b).top;
        return (
          <Squash key={row.a} t={t} at={row.at} cy={top + 45}>
            <L id={row.a} color={DX_PINK} shadow={DX_SHADOW} style={{ backgroundImage: "linear-gradient(180deg, #ff3064 0%, #ff4b79 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }} />
            <L id="dx-3c" style={{ ...DX_FADE, top: top + offset }} />
            <L id={row.b} color="#2e362f" />
          </Squash>
        );
      })}
    </>
  );
}

// ── 안심 ×3, 간편심사 통과 시 가입가능 ─────────────────────────────────────
// Each box sits the same 70 px after its line.
const RE_BOXES = [
  { rect: [556, 204, 710, 299], at: 39.6 },
  { rect: [781, 298, 935, 393], at: 40.9 },
  { rect: [610, 395, 763, 491], at: 41.9 },
] as const satisfies readonly { rect: Rect; at: number }[];

function Reassure({ t }: { t: number }) {
  const first = RE_BOXES[0].rect;
  return (
    <>
      {shadowed("re-1")}
      {shadowed("re-2")}
      {shadowed("re-3")}
      {RE_BOXES.map((box) => {
        const p = easeOut(ramp(t, box.at, 0.15));
        return (
          <Fill key={box.at} rect={box.rect} style={{ boxShadow: "3px 4px 4px rgba(0,0,0,0.35)" }}>
            {t >= box.at ? (
              <Inside rect={first} dy={(p - 1) * 95}>
                <L id="re-box" />
              </Inside>
            ) : null}
          </Fill>
        );
      })}
      <Rise t={t} at={43.1}>
        <L id="re-4" shadow={CAPTION_SHADOW} colors={run(7, 11, SOFT_PINK)} />
      </Rise>
      {shadowed("re-disc-1")}
      {shadowed("re-disc-2")}
    </>
  );
}

// ── 지금 바로 전화 주세요 ──────────────────────────────────────────────────
const CALL_BOX: Rect = [894, 653, 1456, 803];

function Call({ t }: { t: number }) {
  const sweep = ramp(t, 46.25, 0.4);
  return (
    <>
      {shadowed("call-a")}
      <Fill rect={CALL_BOX} style={{ boxShadow: "3px 4px 5px rgba(0,0,0,0.35)" }}>
        <Inside rect={CALL_BOX}>
          <L id="call-b" />
        </Inside>
        {sweep > 0 && sweep < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(100deg, transparent ${sweep * 140 - 40}%, rgba(255,255,255,0.45) ${sweep * 140 - 20}%, transparent ${sweep * 140}%)`,
            }}
          />
        ) : null}
      </Fill>
    </>
  );
}

export function SceneCaption({ scene, t }: { scene: SceneId; t: number }) {
  switch (scene) {
    case "family":
      return <FamilyCard t={t} />;
    case "time":
    case "strength":
    case "money":
      return <Cost scene={scene} t={t} />;
    case "afford":
      return <L id="afford" shadow={CAPTION_SHADOW} colors={run(1, 3, CAPTION_RED)} visible={(i) => t >= 19.9 + i * 0.1} />;
    case "presenter":
      return (
        <>
          <NameTag t={t} />
          <NaverSearch t={t} />
        </>
      );
    case "product":
      return (
        <>
          <Product t={t} />
          <NaverSearch t={t} />
        </>
      );
    case "rider":
      return <Rider t={t} />;
    case "diagnosis":
      return <Diagnosis t={t} />;
    case "reassure":
      return <Reassure t={t} />;
    case "call":
      return <Call t={t} />;
    default:
      return null;
  }
}
