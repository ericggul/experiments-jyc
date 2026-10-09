import { SvgFilters, blur, glow } from "../../../stage/svg-filters";
import { memo } from "react";
import { Figure, LOOKS, type Look } from "./figures";

// The spot's central image: the waiting crowd seen through an X-ray, glass
// shelter as glowing wireframe, one body already carrying a red lesion.
const BONE = "#d8f0ff";
const FLESH = "rgba(120, 190, 255, 0.16)";

type Rider = { x: number; height: number; look: Look; sit?: boolean };

const RIDERS: readonly Rider[] = [
  { x: 400, height: 470, look: LOOKS.darkSuit },
  { x: 610, height: 455, look: LOOKS.orangeCoat },
  { x: 800, height: 480, look: LOOKS.walker },
  { x: 1010, height: 400, look: LOOKS.miso, sit: true },
  { x: 1250, height: 470, look: LOOKS.seated },
  { x: 1640, height: 480, look: LOOKS.darkSuit },
];
const LESION = 4;
const GROUND = 960;

function Skeleton({ x, height, sit = false, lesion = false }: { x: number; height: number; sit?: boolean; lesion?: boolean }) {
  const u = height / 100;
  const hip = sit ? 66 : 54;
  const top = sit ? 38 : 18;
  const ribs = [0, 1, 2, 3, 4, 5];
  return (
    <g transform={`translate(${x} ${GROUND - height}) scale(${u})`}>
      {/* soft tissue */}
      <ellipse cx={0} cy={top - 8} rx={6} ry={7.2} fill={FLESH} />
      <path d={`M-11 ${top + 2} Q0 ${top - 3} 11 ${top + 2} L12 ${hip + 4} L-12 ${hip + 4} Z`} fill={FLESH} />
      <path d={`M-12 ${top + 3} L-14 ${hip + 2} M12 ${top + 3} L14 ${hip + 2}`} stroke={FLESH} strokeWidth={5} strokeLinecap="round" />
      {sit ? (
        <path d={`M-8 ${hip + 2} h20 v30 M-2 ${hip + 2} h12 v30`} stroke={FLESH} strokeWidth={7} fill="none" />
      ) : (
        <path d={`M-5 ${hip + 2} L-6 99 M5 ${hip + 2} L6 99`} stroke={FLESH} strokeWidth={7} strokeLinecap="round" />
      )}
      {/* skeleton */}
      <g stroke={BONE} strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.95}>
        <ellipse cx={0} cy={top - 9} rx={4.6} ry={5.6} fill="rgba(216,240,255,0.25)" />
        <path d={`M-2.6 ${top - 4} q2.6 2.2 5.2 0`} />
        <line x1={0} y1={top - 3} x2={0} y2={hip} strokeDasharray="1.1 0.6" strokeWidth={1.6} />
        <path d={`M-9 ${top + 1} Q0 ${top - 1.5} 9 ${top + 1}`} />
        {ribs.map((r) => (
          <path key={r} d={`M0 ${top + 3 + r * 3.2} Q-8 ${top + 2 + r * 3.2} -7 ${top + 6 + r * 3.2} M0 ${top + 3 + r * 3.2} Q8 ${top + 2 + r * 3.2} 7 ${top + 6 + r * 3.2}`} />
        ))}
        <path d={`M-7 ${hip - 2} Q0 ${hip + 5} 7 ${hip - 2} Q4 ${hip + 1} 0 ${hip + 2} Q-4 ${hip + 1} -7 ${hip - 2} Z`} fill="rgba(216,240,255,0.18)" />
        <path d={`M-9 ${top + 1.5} L-12 ${top + 18} L-13 ${hip + 2} M9 ${top + 1.5} L12 ${top + 18} L13 ${hip + 2}`} />
        {sit ? (
          <path d={`M-4 ${hip + 1} L10 ${hip + 2} L10 ${hip + 30} M3 ${hip + 1} L14 ${hip + 2} L13 ${hip + 30}`} />
        ) : (
          <path d={`M-4 ${hip + 1} L-5 76 L-6 98 M4 ${hip + 1} L5 76 L6 98`} />
        )}
        <circle cx={sit ? 10 : -5} cy={sit ? hip + 2 : 76} r={1.2} />
        <circle cx={sit ? 14 : 5} cy={sit ? hip + 2 : 76} r={1.2} />
      </g>
      {lesion ? (
        <g>
          <circle cx={-2} cy={top + 13} r={4.2} fill="#ff2a3a" opacity={0.35} filter={blur(2)} />
          <circle cx={-2} cy={top + 13} r={2} fill="#ff4050" />
        </g>
      ) : null}
    </g>
  );
}

function Shelter({ xray }: { xray: boolean }) {
  const stroke = xray ? "#b9e2ff" : "#3a4d58";
  const fill = xray ? "rgba(140, 200, 255, 0.07)" : "rgba(120, 150, 170, 0.08)";
  
  return (
    <g filter={xray ? glow(6) : undefined} stroke={stroke} strokeWidth={xray ? 3 : 8} fill="none">
      <path d="M260 160 L1720 160 L1790 110 L330 110 Z" fill={fill} />
      <path d="M260 160 v40 h1460 v-40" />
      {[280, 700, 1120, 1540, 1700].map((x) => (
        <g key={x}>
          <line x1={x} y1={200} x2={x} y2={GROUND} />
          {xray ? <line x1={x + 14} y1={200} x2={x + 14} y2={GROUND} opacity={0.5} /> : null}
        </g>
      ))}
      <rect x={290} y={230} width={400} height={600} fill={fill} />
      <rect x={1130} y={230} width={400} height={600} fill={fill} />
      <rect x={720} y={240} width={380} height={90} fill={fill} />
      <path d="M760 280 h300 M760 300 h220" opacity={0.7} />
      <rect x={760} y={830} width={600} height={16} fill={fill} />
      <path d="M800 846 v60 M1320 846 v60" />
      <path d="M820 210 c0 60 40 70 90 70" opacity={0.7} />
      <rect x={880} y={200} width={70} height={46} />
    </g>
  );
}

export const XrayStopPlate = memo(function XrayStopPlate({ xray }: { xray: boolean }) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id={xray ? "lina-xray-bg" : "lina-photo-bg"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={xray ? "#040a14" : "#080c11"} />
          <stop offset="0.75" stopColor={xray ? "#0b1828" : "#18232b"} />
          <stop offset="1" stopColor={xray ? "#050b14" : "#0a0e12"} />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill={`url(#${xray ? "lina-xray-bg" : "lina-photo-bg"})`} />
      <g opacity={xray ? 0.35 : 0.8} filter={blur(4)}>
        <rect x={0} y={120} width={250} height={600} fill={xray ? "#0f2236" : "#121a21"} />
        <rect x={30} y={200} width={180} height={34} fill={xray ? "#6fa2c8" : "#e8eef2"} opacity={0.6} />
        <rect x={1780} y={60} width={160} height={700} fill={xray ? "#0f2236" : "#141c23"} />
      </g>
      <rect x={0} y={GROUND} width={1920} height={120} fill={xray ? "#07111d" : "#0d1216"} />
      <line x1={0} y1={GROUND} x2={1920} y2={GROUND} stroke={xray ? "#4d7fa8" : "#26323a"} strokeWidth={4} />
      <Shelter xray={xray} />
      {RIDERS.map((rider, i) =>
        xray ? (
          <g key={rider.x} filter={glow(5)}>
            <Skeleton x={rider.x} height={rider.height} sit={rider.sit} lesion={i === LESION} />
          </g>
        ) : (
          <Figure key={rider.x} x={rider.x} y={GROUND} height={rider.height} look={rider.look} pose={rider.sit ? "sit" : i === 2 ? "phone" : "stand"} glow={0.6} light={0.7} />
        ),
      )}
    </svg>
  );
});

/** Close X-ray torso filling the frame behind the product title. */
export const XrayTorsoPlate = memo(function XrayTorsoPlate() {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <rect width={1920} height={1080} fill="#06101c" />
      <g opacity={0.55} filter={blur(3)}>
        <g filter={glow(10)}>
          <Skeleton x={130} height={1500} />
          <Skeleton x={760} height={1650} lesion />
          <Skeleton x={1820} height={1500} />
        </g>
      </g>
      <rect x={1180} y={0} width={18} height={1080} fill="#9fcfff" opacity={0.22} />
      <rect x={1260} y={0} width={8} height={1080} fill="#9fcfff" opacity={0.18} />
    </svg>
  );
});
