import type { ReactNode } from "react";
import { Plate } from "../../../player";
import { plateUrl, type PlateId } from "../scenes";
import { HeungkukMark, NUMBER_OUTLINE } from "./bar";
import { BLACK, LEGAL_PINK, L, WHITE, blinkOn, outline, run, type LineId } from "./text";

// The four closing disclosure pages: pink surround, white sheet x 230–1694,
// y 0–878, title and number on the pink band. Text transcribed from the capture.
const SURROUND = "#eb1684";
const RULE = "#7a0a45";
const TITLE_OUTLINE = outline(2.4, "#2a0016");
/** Horizontal stretch of the title to its measured ink width (815 px from x 118). */
const TITLE_STRETCH = { transform: "scaleX(1.057)", transformOrigin: "3px 0" } as const;

type Blink = readonly (readonly [number, number])[];

const box = (left: number, top: number, width: number, height: number, background: string): ReactNode => (
  <div style={{ position: "absolute", left, top, width, height, background }} />
);

/** A legal line with an optional pink syllable range that may blink. */
function P({ id, t, from = 0, to = 999, blink }: { id: LineId; t: number; from?: number; to?: number; blink?: Blink }) {
  const on = blink ? blinkOn(t, blink) : true;
  return <L id={id} color={BLACK} colors={run(from, to, on ? LEGAL_PINK : "transparent")} />;
}

function Figure({ plate, left, top, width, height, plates }: { plate: PlateId; left: number; top: number; width: number; height: number; plates: boolean }) {
  if (!plates) return null;
  return (
    <div style={{ position: "absolute", left, top, width, height, overflow: "hidden" }}>
      <Plate src={plateUrl(plate)} />
    </div>
  );
}

function Sheet({ t, rule, footerShift, plates, children }: { t: number; rule: number; footerShift: number; plates: boolean; children: ReactNode }) {
  const fee = blinkOn(t, [[116.7, 119.2]]);
  return (
    <>
      {box(0, 0, 1920, 1080, SURROUND)}
      {box(230, 0, 1464, 878, "#fafcfa")}
      <div style={{ position: "absolute", left: 1502, top: 30 }}>
        <HeungkukMark width={48} color="#e10081" />
      </div>
      <div style={{ position: "absolute", left: 1556, top: 28, fontSize: 23, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em", color: "#1d1a4a", whiteSpace: "pre" }}>Heungkuk</div>
      <div style={{ position: "absolute", left: 1564, top: 52, fontSize: 8, fontWeight: 500, lineHeight: 1, color: "#1d1a4a", whiteSpace: "pre" }}>Life Insurance</div>
      <L id="lg-sim" color="#303330" />
      {children}
      {box(320, rule, 1277, 3, RULE)}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${footerShift}px)` }}>
        <P id="lg-f1" t={t} from={14} to={25} />
        <P id="lg-f2" t={t} from={9} />
      </div>
      {footerShift === 0 ? <L id="lg-f3" color={fee ? LEGAL_PINK : "transparent"} /> : null}
      <Figure plate="cartoon-grandpa" left={135} top={540} width={150} height={340} plates={plates} />
      <Figure plate="cartoon-grandma" left={1598} top={545} width={165} height={335} plates={plates} />
      <L id="lg-title-a" shadow={TITLE_OUTLINE} />
      <L id="lg-title-b" shadow={TITLE_OUTLINE} style={TITLE_STRETCH} />
      <L id="lg-phone" shadow={NUMBER_OUTLINE} />
      <L id="lg-addr" color={WHITE} />
    </>
  );
}

// Premium table: columns and rows measured on the 85–88 s page.
const PT_COLS = [347, 539, 834, 1129];
const PT_WIDTHS = [186, 290, 288, 289];
const PT_ROWS = [369, 448, 526];

function PremiumPage({ t, plates }: { t: number; plates: boolean }) {
  const fills = [
    ["#c7c9c7", "#929492", "#929492", "#929492"],
    ["#90b5cb", "#edefec", "#f5107f", "#edefec"],
    ["#ba89b0", "#edefec", "#f5107f", "#edefec"],
  ];
  return (
    <Sheet t={t} rule={753} footerShift={42} plates={plates}>
      <P id="pp-1" t={t} from={5} />
      <P id="pp-2" t={t} from={5} blink={[[85.0, 87.6]]} />
      <P id="pp-3" t={t} from={8} />
      <L id="pp-4" color={BLACK} />
      <P id="pp-5" t={t} from={5} />
      {PT_ROWS.map((top, r) =>
        PT_COLS.map((left, c) => <div key={`pt-cell-${r}${c}`}>{box(left, top, PT_WIDTHS[c], 72, fills[r][c])}</div>),
      )}
      {(["pt-01", "pt-02", "pt-03", "pt-10", "pt-20", "pt-12", "pt-22"] as const).map((id) => (
        <L key={id} id={id} />
      ))}
      {(["pt-11", "pt-13", "pt-21", "pt-23"] as const).map((id) => (
        <L key={id} id={id} color={BLACK} />
      ))}
    </Sheet>
  );
}

// Refund table: header 180–222, eight 43 px rows on a 47 px pitch.
const RT_COLS = [340, 512, 687, 1028, 1295];
const RT_WIDTHS = [168, 171, 337, 263, 232];
const RT_FILLS = ["#484a48", "#ba89ac", "#ecefec", "#ecefec", "#ecefec"];
const RT_DASH_ROWS = [1, 2, 3, 4, 5, 8];

function RefundPage({ t, plates }: { t: number; plates: boolean }) {
  const rows = Array.from({ length: 8 }, (_, i) => i + 1);
  return (
    <Sheet t={t} rule={711} footerShift={0} plates={plates}>
      <P id="rf-1" t={t} />
      <P id="rf-2" t={t} blink={[[88.4, 92.6]]} />
      <L id="rf-3" color={BLACK} />
      {RT_COLS.map((left, c) => (
        <div key={`rt-head-${c}`}>{box(left, 180, RT_WIDTHS[c], 42, "#9ea09e")}</div>
      ))}
      {rows.map((r) =>
        RT_COLS.map((left, c) => <div key={`rt-cell-${r}${c}`}>{box(left, 226 + 47 * (r - 1), RT_WIDTHS[c], 43, RT_FILLS[c])}</div>),
      )}
      {RT_COLS.map((_, c) => (
        <L key={`rt-0${c}`} id={`rt-0${c}` as LineId} />
      ))}
      {rows.map((r) => (
        <div key={`rt-row-${r}`}>
          <L id={`rt-${r}0` as LineId} />
          <L id={`rt-${r}1` as LineId} />
          <L id={`rt-${r}2` as LineId} color={BLACK} />
          {RT_DASH_ROWS.includes(r) ? box(1222, 226 + 47 * (r - 1) + 20, 14, 3, BLACK) : <L id={`rt-${r}3` as LineId} color={BLACK} />}
          <L id={`rt-${r}4` as LineId} color={BLACK} />
        </div>
      ))}
      <L id="rf-4" color={BLACK} />
      <L id="rf-5" color={BLACK} />
    </Sheet>
  );
}

function NoticePage({ t, plates }: { t: number; plates: boolean }) {
  const first = [[93.1, 99.3]] as const;
  const second = [[100.2, 106.5]] as const;
  return (
    <Sheet t={t} rule={711} footerShift={0} plates={plates}>
      <L id="n1-1" color={BLACK} />
      <P id="n1-2" t={t} blink={first} />
      <P id="n1-3" t={t} blink={first} />
      <L id="n1-4" color={BLACK} />
      <P id="n1-5" t={t} blink={second} />
      <P id="n1-6" t={t} blink={second} />
      {(["n1-7", "n1-8", "n1-9", "n1-10", "n1-11"] as const).map((id) => (
        <L key={id} id={id} color={BLACK} />
      ))}
    </Sheet>
  );
}

function ProtectionPage({ t, plates }: { t: number; plates: boolean }) {
  const first = [[107.4, 113.0]] as const;
  return (
    <Sheet t={t} rule={711} footerShift={0} plates={plates}>
      <L id="n2-1" color={BLACK} />
      <P id="n2-2" t={t} blink={first} />
      <P id="n2-3" t={t} blink={first} />
      <L id="n2-4" color={BLACK} />
      <P id="n2-5" t={t} blink={[[113.9, 116.0]]} />
      {(["n2-6", "n2-7", "n2-8", "n2-9", "n2-10"] as const).map((id) => (
        <L key={id} id={id} color={BLACK} />
      ))}
    </Sheet>
  );
}

export const LEGAL_PAGES = {
  "legal-premium": PremiumPage,
  "legal-refund": RefundPage,
  "legal-notice": NoticePage,
  "legal-protection": ProtectionPage,
} as const;
