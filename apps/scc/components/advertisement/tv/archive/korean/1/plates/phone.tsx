import { SvgFilters, blur } from "../../../stage/svg-filters";
import { memo, type ReactNode } from "react";

// Close-up: two hands hold a phone at the bus stop; screen content is live.
export const PHONE_SCREEN = { x: 712, y: 92, width: 456, height: 900, radius: 46 } as const;

const SKIN = "#c99476";
const SKIN_SHADE = "#a87459";

const Backdrop = memo(function Backdrop() {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <SvgFilters />
      <defs>
        <linearGradient id="lina-phone-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#13221f" />
          <stop offset="1" stopColor="#0a1312" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#lina-phone-bg)" />
      <g filter={blur(18)}>
        <rect x={-100} y={340} width={1000} height={90} fill="#cfc29a" opacity={0.55} />
        <circle cx={1620} cy={260} r={80} fill="#ffcf8a" opacity={0.25} />
        <circle cx={1500} cy={720} r={120} fill="#5d8f86" opacity={0.25} />
      </g>
    </svg>
  );
});

function Hands({ tap }: { tap: { x: number; y: number; pressed: number } }) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* left hand cradles the phone */}
      <path d="M560 1080 C580 900 620 760 690 640 C712 600 730 620 724 660 L716 820 C760 830 760 900 720 930 L690 1080 Z" fill={SKIN} />
      <path d="M690 640 C712 600 730 620 724 660 L716 760 C700 720 690 690 690 640 Z" fill={SKIN_SHADE} opacity={0.6} />
      <path d="M1160 700 C1210 690 1230 730 1196 760 L1168 770 Z" fill={SKIN} />
      <path d="M1164 790 C1214 784 1228 822 1194 846 L1166 852 Z" fill={SKIN} />
      {/* right hand's index finger taps */}
      <g transform={`translate(${tap.x} ${tap.y + tap.pressed * 8})`}>
        <path d="M0 0 C-6 -40 22 -52 36 -18 L70 90 C110 110 170 160 200 260 L40 300 C10 220 -10 120 0 0 Z" fill={SKIN} />
        <path d="M2 -6 C4 -30 24 -36 30 -16 C20 -24 8 -22 2 -6 Z" fill="#e8c2ab" />
        <path d="M70 90 C110 110 170 160 200 260 L150 270 C130 190 100 140 70 90 Z" fill={SKIN_SHADE} opacity={0.5} />
      </g>
    </svg>
  );
}

export function PhoneInHands({ children, tap }: { children: ReactNode; tap: { x: number; y: number; pressed: number } }) {
  const s = PHONE_SCREEN;
  return (
    <>
      <Backdrop />
      <div
        style={{
          position: "absolute",
          left: s.x - 18,
          top: s.y - 18,
          width: s.width + 36,
          height: s.height + 36,
          borderRadius: s.radius + 18,
          background: "linear-gradient(135deg, #2b2f33, #0d0f11)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: s.x,
          top: s.y,
          width: s.width,
          height: s.height,
          borderRadius: s.radius,
          overflow: "hidden",
          background: "#f4f1ea",
        }}
      >
        {children}
        <div style={{ position: "absolute", top: 18, left: "50%", width: 18, height: 18, marginLeft: -9, borderRadius: 9, background: "#111" }} />
      </div>
      <Hands tap={tap} />
    </>
  );
}
