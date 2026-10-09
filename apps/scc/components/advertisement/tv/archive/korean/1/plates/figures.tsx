// Night-lit people for the bus-stop footage. Faces stay soft and unspecific:
// the clone reproduces staging and light, not the cast.

export type Look = {
  skin: string;
  hair: string;
  hairStyle: "bob" | "short" | "long" | "tied";
  coat: string;
  inner?: string;
  pants: string;
  bag?: string;
};

type FigureProps = {
  x: number;
  /** Ground line (feet). */
  y: number;
  height: number;
  look: Look;
  pose?: "stand" | "phone" | "walk" | "sit" | "look-up";
  /** Phone screen glow on the face, 0..1. */
  glow?: number;
  light?: number;
  mirror?: boolean;
};

export function Figure({ x, y, height, look, pose = "stand", glow = 0, light = 0.5, mirror = false }: FigureProps) {
  const u = height / 100;
  const sitting = pose === "sit";
  const torsoTop = sitting ? 38 : 18;
  const hip = sitting ? 66 : 54;
  const headR = 6.4;
  const headY = torsoTop - headR - 1.5;
  const tilt = pose === "phone" ? 6 : pose === "look-up" ? -7 : 0;
  const stride = pose === "walk" ? 6 : 1.6;
  const rim = `rgba(190, 220, 255, ${0.18 + light * 0.25})`;

  return (
    <g transform={`translate(${x} ${y - height}) scale(${mirror ? -u : u} ${u})`}>
      <ellipse cx={0} cy={100} rx={14} ry={2.2} fill="rgba(0,0,0,0.35)" />
      {sitting ? (
        <>
          <path d={`M-7 ${hip} h18 v6 h-4 v28 h-5 v-22 h-9 Z`} fill={look.pants} />
          <path d={`M-1 ${hip} h14 v6 h-4 v28 h-5 v-22 h-5 Z`} fill={look.pants} opacity={0.85} />
        </>
      ) : (
        <>
          <path d={`M${-6.5 - stride} 99 L-5.5 ${hip} L0 ${hip} L${-1.5 - stride * 0.4} 99 Z`} fill={look.pants} />
          <path d={`M${1.5 + stride * 0.4} 99 L0.2 ${hip} L5.5 ${hip} L${6.5 + stride} 99 Z`} fill={look.pants} opacity={0.88} />
          <rect x={-8 - stride} y={97.5} width={7} height={2.6} rx={1.2} fill="#141414" />
          <rect x={1 + stride} y={97.5} width={7} height={2.6} rx={1.2} fill="#141414" />
        </>
      )}
      <path
        d={`M-10 ${torsoTop + 3} Q-10.5 ${torsoTop} -6 ${torsoTop - 0.5} L6 ${torsoTop - 0.5} Q10.5 ${torsoTop} 10 ${torsoTop + 3} L11 ${hip + 4} L-11 ${hip + 4} Z`}
        fill={look.coat}
      />
      {look.inner ? <path d={`M-3 ${torsoTop} L3 ${torsoTop} L2 ${hip} L-2 ${hip} Z`} fill={look.inner} /> : null}
      <path d={`M10 ${torsoTop + 3} L11 ${hip + 4}`} stroke={rim} strokeWidth={0.9} />
      {pose === "phone" ? (
        <>
          <path d={`M-9 ${torsoTop + 3} L-11 ${torsoTop + 22} L-2 ${torsoTop + 20}`} stroke={look.coat} strokeWidth={4.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M9 ${torsoTop + 3} L10 ${torsoTop + 22} L1 ${torsoTop + 20}`} stroke={look.coat} strokeWidth={4.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x={-3} y={torsoTop + 15} width={5} height={8} rx={0.8} fill={`rgba(210, 235, 255, ${0.55 + glow * 0.45})`} transform={`rotate(-15 0 ${torsoTop + 19})`} />
          <circle cx={-2} cy={torsoTop + 20.5} r={1.9} fill={look.skin} />
          <circle cx={2} cy={torsoTop + 20.5} r={1.9} fill={look.skin} />
        </>
      ) : (
        <>
          <path d={`M-9.5 ${torsoTop + 3} L${-12 - (pose === "walk" ? 2 : 0)} ${hip + 2}`} stroke={look.coat} strokeWidth={4.4} strokeLinecap="round" />
          <path d={`M9.5 ${torsoTop + 3} L${12 + (pose === "walk" ? 2 : 0)} ${hip + 2}`} stroke={look.coat} strokeWidth={4.4} strokeLinecap="round" />
          <circle cx={-12.3} cy={hip + 3.4} r={1.8} fill={look.skin} />
          <circle cx={12.3} cy={hip + 3.4} r={1.8} fill={look.skin} />
        </>
      )}
      {look.bag ? <rect x={9} y={hip - 6} width={8} height={10} rx={1.6} fill={look.bag} /> : null}
      <rect x={-2.4} y={torsoTop - 3.6} width={4.8} height={4.4} fill={look.skin} />
      <g transform={`rotate(${tilt} 0 ${headY + headR})`}>
        <ellipse cx={0} cy={headY} rx={headR * 0.86} ry={headR} fill={look.skin} />
        <ellipse cx={0} cy={headY + 1} rx={headR * 0.86} ry={headR} fill={`rgba(220, 240, 255, ${glow * 0.35})`} />
        <Hair style={look.hairStyle} color={look.hair} cy={headY} r={headR} />
      </g>
    </g>
  );
}

function Hair({ style, color, cy, r }: { style: Look["hairStyle"]; color: string; cy: number; r: number }) {
  switch (style) {
    case "bob":
      return <path d={`M${-r - 0.6} ${cy + r * 0.9} Q${-r - 1.4} ${cy - r * 1.3} 0 ${cy - r * 1.12} Q${r + 1.4} ${cy - r * 1.3} ${r + 0.6} ${cy + r * 0.9} L${r - 1.6} ${cy + r * 0.9} Q${r - 1} ${cy - r * 0.2} ${-r * 0.2} ${cy - r * 0.42} Q${-r + 1.2} ${cy} ${-r + 1.6} ${cy + r * 0.9} Z`} fill={color} />;
    case "long":
      return <path d={`M${-r - 0.8} ${cy + r * 2.4} Q${-r - 1.6} ${cy - r * 1.3} 0 ${cy - r * 1.12} Q${r + 1.6} ${cy - r * 1.3} ${r + 0.8} ${cy + r * 2.4} L${r - 1.4} ${cy + r * 2.2} Q${r - 1} ${cy - r * 0.3} 0 ${cy - r * 0.5} Q${-r + 1} ${cy - r * 0.3} ${-r + 1.4} ${cy + r * 2.2} Z`} fill={color} />;
    case "tied":
      return (
        <>
          <path d={`M${-r} ${cy} Q${-r} ${cy - r * 1.15} 0 ${cy - r * 1.1} Q${r} ${cy - r * 1.15} ${r} ${cy} Q${r * 0.5} ${cy - r * 0.55} 0 ${cy - r * 0.6} Q${-r * 0.5} ${cy - r * 0.55} ${-r} ${cy} Z`} fill={color} />
          <circle cx={r * 0.7} cy={cy - r * 0.9} r={r * 0.45} fill={color} />
        </>
      );
    default:
      return <path d={`M${-r} ${cy - r * 0.05} Q${-r - 0.2} ${cy - r * 1.25} 0 ${cy - r * 1.12} Q${r + 0.2} ${cy - r * 1.25} ${r} ${cy - r * 0.05} Q${r * 0.4} ${cy - r * 0.6} 0 ${cy - r * 0.62} Q${-r * 0.6} ${cy - r * 0.55} ${-r} ${cy - r * 0.05} Z`} fill={color} />;
  }
}

export const LOOKS = {
  miso: { skin: "#d7ab92", hair: "#1c1512", hairStyle: "bob", coat: "#6f7a78", inner: "#e8e6df", pants: "#2c2d33", bag: "#8a7354" },
  orangeCoat: { skin: "#dcb39b", hair: "#21170f", hairStyle: "long", coat: "#c98e66", inner: "#efe7dc", pants: "#2b2b30" },
  darkSuit: { skin: "#c99a80", hair: "#121212", hairStyle: "short", coat: "#20232b", inner: "#d7d9de", pants: "#1b1d22" },
  seated: { skin: "#c99a80", hair: "#121212", hairStyle: "short", coat: "#24262c", pants: "#5a6a7e" },
  walker: { skin: "#c99a80", hair: "#16120f", hairStyle: "long", coat: "#33405a", pants: "#c8ccd0" },
} as const satisfies Record<string, Look>;
