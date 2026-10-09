import type { ReactNode } from "react";
import type { SceneId } from "../scenes";
import {
  Box,
  CYAN,
  Disc,
  DROP,
  easeOut,
  family,
  Fit,
  FOOT,
  GLOW,
  INK,
  line,
  ORANGE,
  pop,
  PURPLE,
  ramp,
  RED,
  WHITE,
  type LineId,
} from "./type";

// Scene captions from the first insurance shot to the product card. Times are
// seconds on the spot clock, taken from per-frame colour counts at 10 fps.
const NAVY_TEAL = "linear-gradient(90deg, #2f2769 0%, #27366e 25%, #1d4b78 50%, #105a85 72%, #0b6a8d 92%, #187387 100%)";

const Foot = ({ id }: { id: LineId }) => <Fit id={id} color={FOOT} shadow={GLOW} />;

/** Hospital-type discs; labels centred with the fitted size of the first disc. */
function Discs({
  centres,
  cy,
  labels,
  colors,
  label,
  scales,
}: {
  centres: readonly number[];
  cy: number;
  labels: readonly string[];
  colors: readonly (readonly [string, string])[];
  label: LineId;
  scales?: readonly number[];
}) {
  // Measured offset of the labels' ink from the disc centres (px).
  const nudge = label === "c-icon-1a" ? [-5, 1.5] : [-4.5, 1.5];
  const style = line(label);
  return (
    <>
      {centres.map((cx, i) => (
        <Disc key={labels[i]} cx={cx} cy={cy} d={148} from={colors[i][0]} to={colors[i][1]} scale={scales ? scales[i] : 1}>
          <div
            style={{
              fontFamily: family(style.family),
              fontSize: style.size,
              fontWeight: style.weight,
              letterSpacing: `${style.track}em`,
              lineHeight: `${Math.round(style.size * 1.08)}px`,
              color: WHITE,
              textAlign: "center",
              whiteSpace: "pre",
              textShadow: "0 1px 3px rgba(20,40,80,0.45)",
              transform: `translate(${nudge[0]}px, ${nudge[1]}px)`,
            }}
          >
            {labels[i]}
          </div>
        </Disc>
      ))}
    </>
  );
}

const HOSPITAL_COLORS = [
  ["#aedbfa", "#1f97f6"],
  ["#d3e5f6", "#21b8c8"],
  ["#ecf3c6", "#3a9c90"],
  ["#c3ddf6", "#5d4fe8"],
] as const;

/** Flip cards: white tiles with one glyph each, centred. */
function Cards({
  xs,
  y,
  w,
  h,
  glyphs,
  size,
  top,
  weight,
  font,
  color,
}: {
  xs: readonly number[];
  y: number;
  w: number;
  h: number;
  glyphs: readonly string[];
  size: number;
  top: number;
  weight: number;
  font: string;
  color: string;
}) {
  return (
    <>
      {xs.map((x, i) => (
        <Box key={x} x={x} y={y} w={w} h={h} style={{ background: "#f8f8f8", boxShadow: "0 4px 10px rgba(0,0,0,0.28)" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: top - y,
              fontFamily: font,
              fontSize: size,
              fontWeight: weight,
              lineHeight: 1,
              textAlign: "center",
              color,
            }}
          >
            {glyphs[i]}
          </div>
        </Box>
      ))}
    </>
  );
}

function Counter({ t }: { t: number }) {
  const p = 1 - (1 - ramp(t, 11.6, 13.1)) ** 2;
  const value = String(Math.round(365 + 175 * p)).padStart(3, "0");
  const digits = line("k-digits");
  const plus = ramp(t, 11.6, 12.3);
  const plusColor = plus < 0.5 ? mix("#f6b31f", "#f58a30", plus * 2) : mix("#f58a30", "#ef3a5d", plus * 2 - 1);
  const head = (text: string, left: number, purple: boolean) => (
    <div
      style={{
        position: "absolute",
        left,
        top: 142,
        fontFamily: family("gm"),
        fontSize: 105,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        whiteSpace: "pre",
        color: purple ? PURPLE : CYAN,
        textShadow: GLOW,
      }}
    >
      {text}
    </div>
  );
  return (
    <>
      {head("간병인 비용", 289, t >= 13.3)}
      {head("보장?", 1394, t >= 13.95)}
      <Fit id="k-max" color={INK} shadow={GLOW} />
      <Fit id="k-day" color={INK} shadow={GLOW} />
      <Cards
        xs={[824, 1014, 1198]}
        y={136}
        w={178}
        h={180}
        glyphs={Array.from(value)}
        size={digits.size}
        top={digits.top}
        weight={digits.weight}
        font={family(digits.family)}
        color={t >= 13.1 ? RED : INK}
      />
      {t < 13.2 ? <Fit id="k-plus" color={plusColor} shadow={GLOW} scale={0.73 + 0.27 * easeOut(plus)} /> : null}
      <Foot id="k-foot" />
    </>
  );
}

function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
}

const CANCER_CARD_X = [626, 830, 1033, 1236] as const;

function cancerGlyphs(t: number) {
  const first = t < 26.8 ? "한" : t < 27.2 ? "1" : t < 27.6 ? "3" : t < 28.0 ? "7" : "매";
  return [first, t < 27.0 ? "번" : "년", t < 27.3 ? "만" : "계", t < 27.3 ? "?" : "속"];
}

function CancerOnce({ t }: { t: number }) {
  const settled = t >= 28.4;
  const card = line(settled ? "o-yearly" : "o-once");
  return (
    <>
      <Fit id="o-cancer" color={t >= 25.8 ? PURPLE : CYAN} shadow={GLOW} scale={t >= 25.8 ? pop(t, 25.8, 0.3) : 1} />
      {t >= 22.3 ? (
        <Cards
          xs={CANCER_CARD_X}
          y={141}
          w={192}
          h={194}
          glyphs={cancerGlyphs(t)}
          size={card.size}
          top={card.top}
          weight={card.weight}
          font={family(card.family)}
          color={settled ? RED : "#2c2c2c"}
        />
      ) : null}
      {t >= 22.8 && !settled ? <Fit id="o-cover-q" color={CYAN} shadow={GLOW} scale={pop(t, 22.8, 0.3)} /> : null}
      {settled ? <Fit id="o-cover" color={PURPLE} shadow={GLOW} scale={pop(t, 28.4, 0.3)} /> : null}
      <Foot id="o-foot-1" />
      <Foot id="o-foot-2" />
    </>
  );
}

function CancerYearly({ t }: { t: number }) {
  const pops = [32.7, 33.0, 33.4, 33.7].map((at) => pop(t, at, 0.3));
  const plus = pop(t, 34.4, 0.3);
  return (
    <>
      <Fit id="y-cancer" color={ORANGE} shadow={GLOW} reveal={ramp(t, 30.15, 30.4)} />
      <Fit id="y-first" color={INK} shadow={GLOW} scale={pop(t, 31.1, 0.4)} />
      {plus > 0 ? (
        <Disc cx={1243} cy={283} d={70} from="#7fe6ee" to="#2cc79f" scale={plus}>
          <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden>
            <path d="M17 5v24M5 17h24" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" />
          </svg>
        </Disc>
      ) : null}
      <Fit id="y-yearly" color={INK} shadow={GLOW} reveal={ramp(t, 35.0, 36.2)} />
      <Fit id="y-cancer-s" color={ORANGE} shadow={GLOW} scale={pop(t, 36.9, 0.3)} />
      <Discs
        centres={[970, 1153.5, 1337, 1520.5]}
        cy={662}
        labels={["전이암", "재발암", "원발암", "잔존암"]}
        colors={HOSPITAL_COLORS}
        label="y-icon-1"
        scales={pops}
      />
      <Foot id="y-foot-1" />
      <Foot id="y-foot-2" />
    </>
  );
}

function Metastasis({ t }: { t: number }) {
  const box = ramp(t, 38.5, 38.9);
  return (
    <>
      <Box x={991} y={223} w={606} h={112} style={{ background: NAVY_TEAL, clipPath: `inset(0 ${(1 - box) * 100}% 0 0)` }} />
      <Fit id="m-box" color={WHITE} reveal={box} />
      <Fit id="m-cure-a" color={INK} shadow={GLOW} reveal={ramp(t, 39.2, 39.4)} />
      <Fit id="m-cure-b" color={CYAN} shadow={GLOW} reveal={ramp(t, 39.4, 39.5)} />
      <Fit id="m-living-a" color={INK} shadow={GLOW} reveal={ramp(t, 40.2, 40.3)} />
      <Fit id="m-living-b" color={RED} shadow={GLOW} reveal={ramp(t, 41.6, 42.0)} />
      <Fit id="m-long" color={INK} shadow={GLOW} reveal={ramp(t, 43.6, 43.8)} />
      <Foot id="m-foot" />
    </>
  );
}

/** 지병 / 과거병력 / 75세 lines; the senior shot shows them complete. */
function Conditions({ t, complete }: { t: number; complete: boolean }) {
  const r = (a: number, b: number) => (complete ? 1 : ramp(t, a, b));
  return (
    <>
      <Fit id="h-1a" color={ORANGE} shadow={GLOW} reveal={complete || t >= 44.68 ? 1 : 0} />
      <Fit id="h-1b" color={INK} shadow={GLOW} reveal={complete ? 1 : 0.25 + 0.75 * ramp(t, 44.9, 45.2)} />
      <Fit id="h-2a" color={ORANGE} shadow={GLOW} reveal={r(45.8, 46.1)} />
      <Fit id="h-2b" color={INK} shadow={GLOW} reveal={r(46.1, 46.4)} />
      <Fit id="h-3a" color={ORANGE} shadow={GLOW} reveal={r(47.2, 47.5)} />
      <Fit id="h-3b" color={INK} shadow={GLOW} reveal={r(47.5, 47.8)} />
      <Foot id="h-foot-1" />
      <Foot id="h-foot-2" />
    </>
  );
}

function Product({ t }: { t: number }) {
  const box = pop(t, 51.8, 0.3);
  return (
    <>
      <Fit id="p-100" color={INK} shadow={GLOW} />
      <Fit id="p-easy-a" color="#3d9ad8" shadow={GLOW} />
      <Fit id="p-easy-b" color={INK} shadow={GLOW} />
      <Fit id="p-hk" color="#6a6689" shadow={GLOW} scale={pop(t, 50.6, 0.3)} />
      <Fit id="p-dasarang" color="#5f4d8e" shadow={GLOW} scale={pop(t, 51.1, 0.3)} />
      {box > 0 ? (
        <Box
          x={1268}
          y={416}
          w={140}
          h={68}
          style={{ background: "linear-gradient(90deg, #bb5393, #d84a90)", borderRadius: 8, transform: `scale(${box})` }}
        />
      ) : null}
      <Fit id="p-3n5" color={WHITE} scale={box} />
      <Fit id="p-gpgg" color={PURPLE} shadow={GLOW} reveal={ramp(t, 52.3, 52.7)} />
      <Fit id="p-call" color={INK} shadow={GLOW} reveal={ramp(t, 53.2, 53.7)} />
      <Fit id="p-call-2" color="#f78a3f" shadow={GLOW} scale={pop(t, 53.8, 0.3)} />
      <Foot id="p-foot-1" />
      <Foot id="p-foot-2" />
    </>
  );
}

export function SceneOverlay({ scene, t }: { scene: SceneId; t: number }): ReactNode {
  switch (scene) {
    case "worry":
      return (
        <>
          {t >= 6.0 ? (
            <>
              <Box x={922} y={566} w={612} h={101} style={{ background: "linear-gradient(90deg, #fed61c, #ffd97a)" }} />
              <Fit id="w-yellow" color="#3d2f6b" />
              <Box x={922} y={669} w={839} h={98} style={{ background: "linear-gradient(90deg, #452f86, #6660e0)" }} />
              <Fit id="w-purple" color={WHITE} />
            </>
          ) : null}
          <Fit id="w-sub" color={WHITE} shadow={DROP} />
        </>
      );
    case "relief":
      return t >= 9.9 ? <Fit id="r-worry" color="#433b6f" shadow={GLOW} scale={pop(t, 9.9, 0.5)} /> : null;
    case "counter":
      return <Counter t={t} />;
    case "carer": {
      // Two-step wipe measured on the capture: 43% by 15.6 s, hold, complete by 16.3 s.
      const box = t < 15.9 ? 0.43 * ramp(t, 15.2, 15.6) : 0.43 + 0.57 * ramp(t, 15.9, 16.3);
      return (
        <>
          <Fit id="c-sub" color={ORANGE} shadow={GLOW} />
          <Box x={946} y={266} w={673} h={116} style={{ background: NAVY_TEAL, clipPath: `inset(0 ${(1 - box) * 100}% 0 0)` }} />
          <Fit id="c-box" color={WHITE} reveal={box} />
          <Fit id="c-max" color={CYAN} shadow={GLOW} reveal={ramp(t, 17.2, 17.7)} runs={[[2, 6, "#e63e5f"], [6, 9, "#4cb4ea"]]} />
          <Discs centres={[1029, 1200, 1371, 1542]} cy={602} labels={["일반\n병원", "한방\n병원", "동네\n의원", "정신\n병원"]} colors={HOSPITAL_COLORS} label="c-icon-1a" />
          <Fit id="c-longer" color={INK} shadow={GLOW} reveal={ramp(t, 19.2, 19.8)} />
          <Fit id="c-name" color="#555358" shadow={GLOW} />
          <Foot id="c-foot" />
        </>
      );
    }
    case "cancer-once":
      return <CancerOnce t={t} />;
    case "cancer-yearly":
      return <CancerYearly t={t} />;
    case "metastasis":
      return <Metastasis t={t} />;
    case "chronic":
      return <Conditions t={t} complete={false} />;
    case "senior":
      return (
        <>
          <Conditions t={t} complete />
          <Fit id="s-easy-a" color={PURPLE} shadow={GLOW} reveal={ramp(t, 48.3, 48.65)} />
          <Fit id="s-easy-b" color={INK} shadow={GLOW} reveal={ramp(t, 48.65, 48.8)} />
          <Fit id="s-join" color="#4c336b" shadow={GLOW} scale={pop(t, 49.3, 0.3)} />
        </>
      );
    case "product":
      return <Product t={t} />;
    default:
      return null;
  }
}
