import type { ReactNode } from "react";
import { Plate } from "../../../player";
import { plateUrl, type PlateId } from "../scenes";
import { HeungkukMark } from "./bar";
import { BLACK, GREY, L, LAVENDER, MAROON, PINK, WHITE, easeOut, ramp, type LineId } from "./text";

// Programme scenes between the gift segments. Times are on the spot clock;
// rectangles were measured on the 1080p upscale of the capture.
const BAND = "#e61685";

const box = (left: number, top: number, width: number, height: number, background: string, radius = 0): ReactNode => (
  <div style={{ position: "absolute", left, top, width, height, background, borderRadius: radius }} />
);

/** Left-to-right wipe used for list rows and the maroon notices. */
function Wipe({ k, from, to, children }: { k: number; from: number; to: number; children: ReactNode }) {
  if (k <= 0) return null;
  const edge = from + (to - from) * k;
  return <div style={{ position: "absolute", inset: 0, clipPath: k >= 1 ? undefined : `inset(0 ${1920 - edge}px 0 0)` }}>{children}</div>;
}

/** Name tag: masked name on white, gold divider, licence line on pink. */
function NameTag({ name, white, pink, top = 853 }: { name: LineId; white: [number, number]; pink: [number, number]; top?: number }) {
  const dx = pink[0] - 270;
  return (
    <>
      {box(white[0], top, white[1] - white[0], 54, "rgba(255,255,255,0.92)")}
      {box(white[1] + 3, top + 1, 7, 52, "#b8861c")}
      {box(pink[0], top + 1, pink[1] - pink[0], 51, BAND)}
      <L id={name} color={GREY} />
      <L id="tag" style={{ transform: `translateX(${dx}px)` }} />
    </>
  );
}

// ── Brand card (6.01–9.41) ───────────────────────────────────────────────
const CARD_REVEAL = { 치: 7.1, 매: 8.1, 간: 7.75, 병: 7.5, 보: 7.25, 험: 7.4 } as const;
const FAMILY_REVEAL = [7.9, 7.6, 7.75, 7.9];

export function BrandCard({ t }: { t: number }) {
  const flip = easeOut(ramp(t, 6.01, 6.55));
  const title = [CARD_REVEAL.치, CARD_REVEAL.매, CARD_REVEAL.간, CARD_REVEAL.병, CARD_REVEAL.보, CARD_REVEAL.험];
  return (
    <div style={{ position: "absolute", inset: 0, transform: `perspective(1600px) rotateY(${(1 - flip) * 78}deg)`, transformOrigin: "513px 491px", opacity: flip > 0 ? 1 : 0 }}>
      <div style={{ position: "absolute", left: 222, top: 241, width: 583, height: 500, border: `21px solid ${PINK}`, boxSizing: "border-box", background: "#ffffff" }} />
      <div style={{ position: "absolute", left: 368, top: 332 }}>
        <HeungkukMark width={80} color="#ea028b" />
      </div>
      <L id="card-hk" color="#1d1a4a" />
      <div style={{ position: "absolute", left: 470, top: 369, fontSize: 17, fontWeight: 500, lineHeight: 1, color: "#1d1a4a", whiteSpace: "pre" }}>Life Insurance</div>
      <L id="card-1a" color="#2a0d55" />
      <L id="card-1b" color="#2a0d55" />
      <L id="card-2" color="transparent" colors={(i) => (t >= FAMILY_REVEAL[i] ? "#282c29" : undefined)} />
      <L
        id="card-3"
        color="transparent"
        colors={(i) => {
          if (t < title[i]) return undefined;
          if (i === 2) return LAVENDER;
          if (i < 2) return t < 8.4 ? LAVENDER : "#3b2d5f";
          return "#312357";
        }}
      />
    </div>
  );
}

// ── Presenter: diagnosis criteria (9.41–13.65) ───────────────────────────
export function Criteria({ t }: { t: number }) {
  return (
    <>
      <L id="pm-1" color={BLACK} />
      <L id="pm-2" color={BLACK} />
      <L id="pm-3" color={PINK} />
      <L id="pm-4" color={GREY} />
      <L id="pm-5" color={GREY} />
      <L id="pm-6" color={GREY} />
      {t < 12.8 ? <NameTag name="pm-name" white={[120, 258]} pink={[270, 622]} /> : null}
    </>
  );
}

// ── CDR payouts (13.65–27.93) ─────────────────────────────────────────────
const ROWS = [
  { at: 13.65, head: ["cdr-1a", "cdr-1b"], band: [159, 203, 491, 88], text: "band-1", amount: ["amt-1a", "amt-1b"], cx: 815, cy: 246 },
  { at: 14.88, head: ["cdr-2a", "cdr-2b"], band: [158, 416, 560, 90], text: "band-2", amount: ["amt-2a", "amt-2b"], cx: 884, cy: 461 },
  { at: 16.1, head: ["cdr-3a", "cdr-3b"], band: [159, 637, 491, 88], text: "band-3", amount: ["amt-3a", "amt-3b"], cx: 842, cy: 680 },
] as const;

export function Cdr({ t }: { t: number }) {
  return (
    <>
      {ROWS.map((row) => {
        // Each row slides in from the left at ≈1.9 px/ms (right edge tracked per frame).
        const shift = -800 * (1 - ramp(t, row.at, row.at + 0.42));
        const pulse = ramp(t, row.at + 0.65, row.at + 0.95);
        const scale = 1 + 0.12 * Math.sin(pulse * Math.PI);
        const [left, top, width, height] = row.band;
        if (t < row.at) return null;
        return (
          <div key={row.text} style={{ position: "absolute", inset: 0, transform: `translateX(${shift}px)` }}>
            <L id={row.head[0]} color={BLACK} />
            <L id={row.head[1]} color={BLACK} />
            <div style={{ position: "absolute", inset: 0 }}>
              {box(left, top, width, height, BAND)}
              <L id={row.text} />
              <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: `${row.cx}px ${row.cy}px` }}>
                <L id={row.amount[0]} color={PINK} />
                <L id={row.amount[1]} color={PINK} />
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ opacity: ramp(t, 13.65, 13.95) }}>
        <L id="cdr-note" color={GREY} />
      </div>
    </>
  );
}

// ── Presenter: monthly care money (44.58–55.72) ──────────────────────────
const CARE_LINES = [
  { id: "pw-1", at: 45.5, color: GREY },
  { id: "pw-2a", at: 45.4, color: PINK },
  { id: "pw-2b", at: 45.4, color: PINK },
  { id: "pw-2c", at: 45.4, color: PINK },
  { id: "pw-3", at: 45.25, color: GREY },
  { id: "pw-4", at: 45.15, color: BLACK },
  { id: "pw-5", at: 45.15, color: GREY },
] as const;

export function Care({ t }: { t: number }) {
  const band = easeOut(ramp(t, 44.62, 44.95));
  const zoom = ramp(t, 46.15, 46.5);
  const big = zoom > 0 && zoom < 1 ? 1 + 0.9 * (1 - easeOut(zoom)) : 1;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${0.4 + 0.6 * band})`, transformOrigin: "526px 249px", opacity: band > 0 ? 1 : 0 }}>
        {box(120, 199, 810, 101, BAND)}
        <L id="pw-band" />
      </div>
      {CARE_LINES.map((line) => {
        const k = easeOut(ramp(t, line.at, line.at + 0.2));
        if (k <= 0) return null;
        const scale = line.id.startsWith("pw-2") ? big : 1;
        return (
          <div key={line.id} style={{ position: "absolute", inset: 0, opacity: k, transform: `translateY(${(1 - k) * 24}px) scale(${scale})`, transformOrigin: "420px 462px" }}>
            <L id={line.id} color={line.color} />
          </div>
        );
      })}
      {t < 48.1 ? <NameTag name="pw-name" white={[1325, 1463]} pink={[1474, 1824]} /> : null}
    </>
  );
}

// ── Maroon notices (27.93–44.58 and 55.72–70.47) ─────────────────────────
const NOTICE_DIAGNOSIS = [27.95, 28.4, 29.0, 29.6, 30.2, 30.8, 31.3, 31.9, 32.5];
const NOTICE_ONSET = [56.0, 56.5, 57.2, 57.8, 58.3, 59.0, 59.5, 60.1, 60.7, 61.3, 62.0];

export function Notice({ t, which }: { t: number; which: "diagnosis" | "onset" }) {
  const times = which === "diagnosis" ? NOTICE_DIAGNOSIS : NOTICE_ONSET;
  const prefix = which === "diagnosis" ? "d1" : "d2";
  return (
    <>
      {box(948, 0, 972, 927, MAROON)}
      {times.map((at, i) => {
        const id = `${prefix}-${i + 1}` as LineId;
        return (
          <Wipe key={id} k={ramp(t, at, at + 0.35)} from={1000} to={1860}>
            <L id={id} />
          </Wipe>
        );
      })}
    </>
  );
}

// ── Premium example (70.47–78.91) ────────────────────────────────────────
const EXAMPLE_ROWS = [367, 475, 585];
const EXAMPLE_COLS = [
  { left: 450, width: 390, fill: "#92b9ca" },
  { left: 853, width: 225, fill: "#a1a8a5" },
  { left: 1087, width: 390, fill: "#bd8ab0" },
];

function Figure({ plate, left, top, width, height, plates }: { plate: PlateId; left: number; top: number; width: number; height: number; plates: boolean }) {
  if (!plates) return null;
  return (
    <div style={{ position: "absolute", left, top, width, height, overflow: "hidden" }}>
      <Plate src={plateUrl(plate)} />
    </div>
  );
}

export function Example({ t, plates }: { t: number; plates: boolean }) {
  const flip = easeOut(ramp(t, 70.5, 70.9));
  return (
    <>
      {box(0, 0, 1920, 927, "#70294b")}
      <L id="ex-head" />
      <div style={{ position: "absolute", inset: 0, transform: `scaleY(${flip})`, transformOrigin: "960px 470px" }}>
        {box(140, 200, 1640, 537, "#f7fbf9", 36)}
        <div style={{ position: "absolute", left: 0, top: 176, width: 425, height: 80, background: "#adafad", borderRadius: "0 40px 40px 0" }} />
        <div style={{ position: "absolute", left: 128, top: 186, fontSize: 52, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.04em", color: WHITE, whiteSpace: "pre" }}>보험료 예시</div>
        <Figure plate="cartoon-grandpa" left={230} top={300} width={175} height={400} plates={plates} />
        <Figure plate="cartoon-grandma" left={1505} top={305} width={190} height={400} plates={plates} />
        <L id="ex-m" color="#466dbb" />
        {box(853, 258, 225, 97, "#e6e8e6", 10)}
        <L id="ex-age" color="#464947" />
        <L id="ex-f" color="#bc4c9b" />
        {EXAMPLE_ROWS.map((top, r) =>
          EXAMPLE_COLS.map((col, c) => (
            <div key={`cell-${r}${c}`}>
              {box(col.left, top, col.width, 100, col.fill, 10)}
              {c === 1 ? (
                <L id={`ex-${r}${c}` as LineId} />
              ) : (
                <>
                  <L id={`ex-${r}${c}a` as LineId} />
                  <L id={`ex-${r}${c}b` as LineId} />
                </>
              )}
            </div>
          )),
        )}
      </div>
      <L id="ex-foot" />
    </>
  );
}

