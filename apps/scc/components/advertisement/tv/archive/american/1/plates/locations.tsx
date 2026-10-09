import { SvgFilters, blur } from "../../../stage/svg-filters";
import { memo } from "react";

// Daylight location plates: firehouse apron, farm field, butterfly
// conservatory, and the bathroom-scale insert.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function Crowd({ seed, count, y, height, spread = 1920 }: { seed: number; count: number; y: number; height: number; spread?: number }) {
  const rand = seeded(seed);
  const tops = ["#3b4a63", "#c44b3a", "#e0d2b5", "#5b7b5a", "#2a2f3a", "#d99a3c", "#8aa3c8"];
  const skins = ["#d9a98a", "#b47c5c", "#e8bfa6", "#8d5a40"];
  return (
    <g filter={blur(5)}>
      {Array.from({ length: count }, (_, i) => {
        const x = rand() * spread;
        const h = height * (0.8 + rand() * 0.4);
        return (
          <g key={i}>
            <rect x={x - h * 0.13} y={y - h * 0.82} width={h * 0.26} height={h * 0.5} rx={h * 0.08} fill={tops[Math.floor(rand() * tops.length)]} />
            <rect x={x - h * 0.1} y={y - h * 0.34} width={h * 0.2} height={h * 0.34} fill="#2f3440" />
            <circle cx={x} cy={y - h * 0.9} r={h * 0.09} fill={skins[Math.floor(rand() * skins.length)]} />
          </g>
        );
      })}
    </g>
  );
}

export const FirehousePlate = memo(function FirehousePlate({ wide = false }: { wide?: boolean }) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id="oz-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc3ef" />
          <stop offset="1" stopColor="#d9ecf7" />
        </linearGradient>
        <pattern id="oz-brick" width="80" height="40" patternUnits="userSpaceOnUse">
          <rect width="80" height="40" fill="#9a4a36" />
          <path d="M0 20 h80 M0 40 h80 M40 0 v20 M0 20 v20 M80 20 v20" stroke="#c7a593" strokeWidth={3} />
        </pattern>
        <linearGradient id="oz-truck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef3b2e" />
          <stop offset="1" stopColor="#a5130f" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#oz-sky)" />
      <g filter={blur(4)}>
        <rect x={0} y={0} width={1920} height={760} fill="url(#oz-brick)" />
        <rect x={wide ? 240 : 520} y={140} width={wide ? 1440 : 1100} height={620} fill="#2a2826" />
        <rect x={wide ? 240 : 520} y={120} width={wide ? 1440 : 1100} height={24} fill="#d9d4c8" />
        {wide ? (
          <>
            <circle cx={1620} cy={420} r={140} fill="#5f8f3f" />
            <circle cx={1500} cy={360} r={110} fill="#6fa047" />
            <rect x={1560} y={460} width={18} height={300} fill="#5a4630" />
          </>
        ) : null}
      </g>
      <rect x={0} y={760} width={1920} height={320} fill="#bdb6ab" />
      <g filter={blur(wide ? 3 : 7)}>
        <path d={wide ? "M300 380 L1100 380 L1180 520 L1180 820 L300 820 Z" : "M-200 160 L700 160 L820 420 L820 900 L-200 900 Z"} fill="url(#oz-truck)" />
        <rect x={wide ? 340 : -150} y={wide ? 420 : 220} width={wide ? 300 : 600} height={wide ? 120 : 220} rx={10} fill="#2b3640" opacity={0.85} />
        <rect x={wide ? 300 : -200} y={wide ? 640 : 600} width={wide ? 880 : 1020} height={wide ? 26 : 50} fill="#e8e8e8" />
        <circle cx={wide ? 480 : 160} cy={wide ? 820 : 900} r={wide ? 70 : 140} fill="#1c1c1c" />
        <circle cx={wide ? 1000 : 640} cy={wide ? 820 : 900} r={wide ? 70 : 140} fill="#1c1c1c" />
      </g>
      {wide ? <Crowd seed={5} count={16} y={840} height={300} /> : <Crowd seed={8} count={6} y={900} height={420} spread={1000} />}
    </svg>
  );
});

export const FarmPlate = memo(function FarmPlate({ near = false }: { near?: boolean }) {
  const rows = Array.from({ length: 22 }, (_, i) => i);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id="oz-farm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ea7e6" />
          <stop offset="1" stopColor="#cfe7f6" />
        </linearGradient>
        <radialGradient id="oz-sun" cx="0.82" cy="0.18" r="0.5">
          <stop offset="0" stopColor="rgba(255,250,220,0.9)" />
          <stop offset="1" stopColor="rgba(255,250,220,0)" />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#oz-farm-sky)" />
      <g filter={blur(3)}>
        {[120, 380, 640, 980, 1300, 1600, 1860].map((x, i) => (
          <ellipse key={x} cx={x} cy={470} rx={160 + (i % 3) * 30} ry={70} fill={i % 2 ? "#3f6e34" : "#4b7c3a"} />
        ))}
      </g>
      <rect x={0} y={480} width={1920} height={600} fill="#6a9a3c" />
      <g filter={blur(near ? 6 : 2)}>
        {rows.map((i) => {
          const spread = (i - 11) / 11;
          return <path key={i} d={`M${960 + spread * 260} 490 L${960 + spread * 3400} 1080`} stroke={i % 2 ? "#4f7f2c" : "#3b2e22"} strokeWidth={i % 2 ? 46 : 16} opacity={0.75} />;
        })}
      </g>
      <rect width={1920} height={1080} fill="url(#oz-sun)" />
      {near ? null : <Crowd seed={13} count={5} y={720} height={260} spread={1600} />}
    </svg>
  );
});

export const ConservatoryPlate = memo(function ConservatoryPlate() {
  const rand = seeded(29);
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <rect width={1920} height={1080} fill="#e9f1ef" />
      <g stroke="#ffffff" strokeWidth={10} opacity={0.9}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={i * 180} y1={0} x2={960 + (i * 180 - 960) * 0.6} y2={360} />
        ))}
        <line x1={0} y1={160} x2={1920} y2={160} />
      </g>
      <g filter={blur(6)}>
        {Array.from({ length: 40 }, (_, i) => (
          <ellipse
            key={i}
            cx={rand() * 1920}
            cy={260 + rand() * 520}
            rx={80 + rand() * 160}
            ry={60 + rand() * 110}
            fill={["#3e7a3a", "#5a9c45", "#2f6230", "#79b257"][i % 4]}
            opacity={0.9}
          />
        ))}
      </g>
      <g filter={blur(2)}>
        {Array.from({ length: 70 }, (_, i) => {
          const x = 1080 + rand() * 840;
          const y = 300 + rand() * 520;
          return <circle key={i} cx={x} cy={y} r={14 + rand() * 22} fill={["#e0262c", "#c3161d", "#f0473f"][i % 3]} />;
        })}
      </g>
      <rect x={0} y={800} width={1920} height={280} fill="#cfd4c6" />
      <g stroke="#f6f6f2" strokeWidth={12} filter={blur(2)}>
        <line x1={0} y1={760} x2={1920} y2={720} />
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1={i * 130} y1={760 - i * 2.5} x2={i * 130} y2={860} />
        ))}
      </g>
    </svg>
  );
});

/** Close insert: analogue bathroom scale on grass, needle swept by `needle` 0..1. */
export function ScaleInsert({ needle }: { needle: number }) {
  const angle = -120 + needle * 34;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <rect width={1920} height={1080} fill="#6aa045" />
      <g filter={blur(8)}>
        <rect x={0} y={0} width={1920} height={300} fill="#8cc3ef" opacity={0.6} />
        <rect x={1300} y={300} width={500} height={600} fill="#e5e7ea" opacity={0.5} />
      </g>
      <g transform="translate(560 560)">
        <circle r={430} fill="#c9ccd0" />
        <circle r={392} fill="#f8f8f6" />
        {Array.from({ length: 61 }, (_, i) => {
          const a = ((-150 + i * 5) * Math.PI) / 180;
          const long = i % 5 === 0;
          return (
            <line key={i} x1={Math.cos(a) * 370} y1={Math.sin(a) * 370} x2={Math.cos(a) * (long ? 320 : 345)} y2={Math.sin(a) * (long ? 320 : 345)} stroke="#2b2b2b" strokeWidth={long ? 6 : 3} />
          );
        })}
        <g transform={`rotate(${angle})`}>
          <path d="M0 -12 L330 -3 L330 3 L0 12 Z" fill="#d71f26" />
        </g>
        <circle r={34} fill="#3c3c3c" />
      </g>
    </svg>
  );
}
