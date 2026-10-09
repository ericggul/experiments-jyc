import { Box, family, Fit, ramp, type LineId, type Run } from "./type";

// Closing disclosure page (54.8 s →): white sheet on lavender, S-Core Dream.
// The first two bullet clauses are tinted red in two steps (54.8 / 56.4, 57.7).
const TEXT = "#2b2b2d";
const LEGAL_RED = "#e2353f";
const HEAD = "#a4508a";

const BODY: readonly LineId[] = ["l-3", "l-4", "l-5", "l-6", "l-7", "l-8", "l-9", "l-10", "l-11", "l-12"];
const HEADS: readonly LineId[] = ["l-h1", "l-h2", "l-h3"];

function DepositBadge() {
  const f = family("score");
  return (
    <Box x={166} y={510} w={234} h={150}>
      <Box x={0} y={0} w={234} h={10} style={{ background: "#e2353f" }} />
      <Box x={0} y={0} w={10} h={34} style={{ background: "#e2353f" }} />
      <Box x={224} y={0} w={10} h={34} style={{ background: "#e2353f" }} />
      <Box x={0} y={140} w={234} h={10} style={{ background: "#3e4d8c" }} />
      <Box x={0} y={112} w={10} h={38} style={{ background: "#3e4d8c" }} />
      <Box x={224} y={112} w={10} h={38} style={{ background: "#3e4d8c" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 28, textAlign: "center", fontFamily: f, fontSize: 17, fontWeight: 600, color: "#3e4d8c" }}>예금보험공사</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 52, textAlign: "center", fontFamily: f, fontSize: 38, fontWeight: 700, letterSpacing: "-0.06em", lineHeight: 1, color: "#3466b4" }}>
        보호금융상품
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 104, textAlign: "center", fontFamily: f, fontSize: 15, fontWeight: 600, color: "#3e4d8c" }}>1인당 최고 1억원</div>
    </Box>
  );
}

export function LegalPage({ t }: { t: number }) {
  const first: Run[] = [[1, 11, LEGAL_RED]];
  if (t >= 56.4) first.push([11, 11 + Math.round(12 * ramp(t, 56.4, 57.0)), LEGAL_RED]);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#dcd4f4" }} />
      <Box x={39} y={34} w={1841} h={867} style={{ background: "#fefefe" }} />
      <Fit id="l-review" color="#555556" />
      <Fit id="l-1" color={TEXT} runs={first} />
      <Fit id="l-2" color={TEXT} runs={t >= 57.7 ? [[1, 17, LEGAL_RED]] : []} />
      {HEADS.map((id) => (
        <Fit key={id} id={id} color={HEAD} />
      ))}
      {BODY.map((id) => (
        <Fit key={id} id={id} color={TEXT} />
      ))}
      <DepositBadge />
    </>
  );
}
