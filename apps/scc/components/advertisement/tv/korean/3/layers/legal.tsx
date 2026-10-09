import type { ReactNode } from "react";
import { AiaMark } from "./bar";
import { LEGAL_HIGHLIGHT, LEGAL_INK, LEGAL_RED, L, WHITE, run } from "./text";

// End cards (47.18 s →): red ground, rounded white card, dashed notice box.
const DASH = "#c41f45";
const KDIC_RED = "#e40113";
const KDIC_BLUE = "#0a276b";

function KdicMark() {
  return (
    <>
      <svg style={{ position: "absolute", left: 96, top: 545 }} width={329} height={211} viewBox="0 0 329 211" aria-hidden>
        <path d="M0 0h329v66h-15V15H15v51H0z" fill={KDIC_RED} />
        <path d="M0 142h15v54h299v-54h15v69H0z" fill={KDIC_BLUE} />
      </svg>
      <L id="kdic-en" color={KDIC_BLUE} />
      <L id="kdic-name" color={KDIC_BLUE} />
      <L id="kdic-limit" color={KDIC_BLUE} />
    </>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: LEGAL_RED }} />
      <L id="L-title" />
      <AiaMark x={1588} y={9} size={80} />
      <L id="L-tag-1" />
      <L id="L-tag-2" />
      <div style={{ position: "absolute", left: 30, top: 107, width: 1861, height: 866, background: "#fdfdfc", borderRadius: 74 }} />
      <L id="L-approval" color={LEGAL_INK} />
      {children}
      <svg style={{ position: "absolute", left: 322, top: 839 }} width={1277} height={118} viewBox="0 0 1277 118" aria-hidden>
        <rect x={2.5} y={2.5} width={1272} height={113} rx={14} fill="none" stroke={DASH} strokeWidth={5} strokeDasharray="9 7" />
      </svg>
      <L id="L-box-1" color={LEGAL_INK} colors={run(14, 26, LEGAL_HIGHLIGHT)} />
      <L id="L-box-2" color={LEGAL_INK} colors={run(9, 99, LEGAL_HIGHLIGHT)} />
      <L id="L-free" color={WHITE} />
      <L id="L-phone" color={WHITE} />
    </>
  );
}

export function LegalNotice() {
  return (
    <Chrome>
      <L id="L1-head" color={LEGAL_INK} />
      <L id="L1-body-1" color={LEGAL_INK} colors={run(0, 6, LEGAL_HIGHLIGHT)} />
      <L id="L1-body-2" color={LEGAL_INK} />
      <L id="L2-head" color={LEGAL_INK} />
      <KdicMark />
      <L id="L2-body-1" color={LEGAL_INK} />
      <L id="L2-body-2" color={LEGAL_INK} />
    </Chrome>
  );
}

export function LegalTerms() {
  return (
    <Chrome>
      <L id="L3-b1" color={LEGAL_INK} />
      <L id="L3-b2" color={LEGAL_INK} />
      <L id="L3-b3" color={LEGAL_INK} />
      <L id="L3-head" color={LEGAL_INK} />
      <L id="L3-body" color={LEGAL_INK} colors={run(0, 17, LEGAL_HIGHLIGHT)} />
    </Chrome>
  );
}
