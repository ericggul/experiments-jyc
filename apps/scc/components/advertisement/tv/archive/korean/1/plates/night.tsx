import { SvgFilters, blur } from "../../../stage/svg-filters";
import { memo } from "react";
import { Figure, LOOKS } from "./figures";

// Night footage plates for 서울 마곡동: wide street, then the bus shelter.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function Bokeh({ seed, count, y, spread, colors, size }: { seed: number; count: number; y: number; spread: number; colors: string[]; size: [number, number] }) {
  const rand = seeded(seed);
  return (
    <g filter={blur(6)}>
      {Array.from({ length: count }, (_, i) => {
        const r = size[0] + rand() * (size[1] - size[0]);
        return (
          <circle
            key={i}
            cx={rand() * 1920}
            cy={y + (rand() - 0.5) * spread}
            r={r}
            fill={colors[Math.floor(rand() * colors.length)]}
            opacity={0.35 + rand() * 0.5}
          />
        );
      })}
    </g>
  );
}

function Tower({ x, w, h, seed, tint }: { x: number; w: number; h: number; seed: number; tint: string }) {
  const rand = seeded(seed);
  const cols = Math.max(3, Math.floor(w / 34));
  const rows = Math.floor(h / 30);
  const windows = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (rand() < 0.42) continue;
      windows.push(
        <rect
          key={`${r}-${c}`}
          x={x + 10 + c * ((w - 20) / cols)}
          y={760 - h + 14 + r * 30}
          width={(w - 20) / cols - 8}
          height={14}
          fill={rand() > 0.7 ? "#f3d9a4" : tint}
          opacity={0.45 + rand() * 0.5}
        />,
      );
    }
  }
  return (
    <g>
      <rect x={x} y={760 - h} width={w} height={h} fill="#0d141d" />
      {windows}
    </g>
  );
}

export const StreetPlate = memo(function StreetPlate() {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id="lina-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05080d" />
          <stop offset="0.6" stopColor="#121b26" />
          <stop offset="1" stopColor="#1d2733" />
        </linearGradient>
        <linearGradient id="lina-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2129" />
          <stop offset="1" stopColor="#0a0d11" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#lina-night-sky)" />
      <g filter={blur(2.5)}>
        <Tower x={-40} w={300} h={620} seed={3} tint="#cfe3f4" />
        <Tower x={330} w={210} h={540} seed={5} tint="#e7eef7" />
        <Tower x={560} w={170} h={680} seed={9} tint="#d8e6ef" />
        <Tower x={1180} w={260} h={600} seed={13} tint="#cfe0ee" />
        <Tower x={1480} w={190} h={500} seed={17} tint="#f0e6cf" />
        <Tower x={1690} w={260} h={660} seed={19} tint="#d6e4f1" />
      </g>
      <rect x={0} y={760} width={1920} height={320} fill="url(#lina-road)" />
      <path d="M0 860 L1920 820" stroke="#2c3540" strokeWidth={3} opacity={0.6} />
      <Bokeh seed={31} count={26} y={780} spread={70} colors={["#ff9b3d", "#ffcf7a", "#fff1d0"]} size={[6, 18]} />
      <Bokeh seed={37} count={18} y={840} spread={40} colors={["#ff3b2f", "#ff6a3d"]} size={[5, 12]} />
      <Bokeh seed={41} count={14} y={830} spread={40} colors={["#ffffff", "#e8f2ff"]} size={[6, 14]} />
      {[180, 520, 980, 1420, 1800].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={330 + i * 12} x2={x} y2={800} stroke="#1a1f26" strokeWidth={8} />
          <circle cx={x} cy={326 + i * 12} r={34} fill="#ffb14a" opacity={0.75} filter={blur(10)} />
          <circle cx={x} cy={326 + i * 12} r={8} fill="#fff1c9" />
        </g>
      ))}
    </svg>
  );
});

/** Bus shelter at night: lit ad panel, route sign, the waiting crowd. */
export const BusStopPlate = memo(function BusStopPlate({ glow = 1 }: { glow?: number }) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <SvgFilters />
      <defs>
        <linearGradient id="lina-stop-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b10" />
          <stop offset="0.7" stopColor="#142028" />
          <stop offset="1" stopColor="#0b1014" />
        </linearGradient>
        <radialGradient id="lina-lightbox" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe8ee" />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#lina-stop-bg)" />
      <g filter={blur(3)}>
        <Tower x={1500} w={420} h={700} seed={23} tint="#e9f2fb" />
        <Tower x={-60} w={340} h={560} seed={29} tint="#c9dceb" />
      </g>
      <Bokeh seed={43} count={30} y={640} spread={300} colors={["#ffb35c", "#fff0cf", "#9fd3ff"]} size={[8, 22]} />
      <rect x={0} y={880} width={1920} height={200} fill="#0c1115" />
      <rect x={0} y={872} width={1920} height={10} fill="#25313a" />
      {/* shelter */}
      <rect x={880} y={150} width={720} height={44} fill="#1b2a33" />
      <rect x={1040} y={86} width={240} height={60} rx={4} fill="#0e1a20" />
      <rect x={1060} y={98} width={200} height={36} rx={3} fill="#cfeee6" opacity={0.9} />
      <rect x={1056} y={350} width={300} height={500} fill="url(#lina-lightbox)" opacity={0.92 * glow} />
      <rect x={1056} y={350} width={300} height={500} fill="none" stroke="#2c3b44" strokeWidth={10} />
      <rect x={1520} y={150} width={26} height={730} fill="#5c8f96" opacity={0.7} />
      <rect x={1540} y={150} width={10} height={730} fill="#9cd2d6" opacity={0.6} />
      <rect x={900} y={150} width={20} height={730} fill="#33464f" />
      <rect x={1180} y={860} width={260} height={18} fill="#26343c" />
      <g opacity={0.9}>
        <Figure x={1180} y={872} height={330} look={LOOKS.orangeCoat} light={0.9} />
        <Figure x={1270} y={872} height={350} look={LOOKS.darkSuit} light={0.8} />
        <Figure x={1330} y={878} height={300} look={LOOKS.seated} pose="sit" light={0.6} />
      </g>
      <Figure x={930} y={1000} height={480} look={LOOKS.miso} pose="phone" glow={1} light={0.6} />
      <Figure x={1740} y={1010} height={470} look={LOOKS.walker} pose="walk" light={0.3} mirror />
    </svg>
  );
});
