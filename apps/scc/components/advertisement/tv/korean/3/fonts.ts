import { Do_Hyeon } from "next/font/google";

// Do Hyeon for every caption: the closest measured match to the capture
// (won 7 of 8 sampled caption styles by per-syllable IoU).
export const doHyeon = Do_Hyeon({ weight: "400", subsets: ["latin"], display: "block", preload: false });

/** Every fitted family name resolves to the one typeface. */
export const FAMILY: Record<string, string> = new Proxy({}, { get: () => doHyeon.style.fontFamily });
