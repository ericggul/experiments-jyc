// Thin line pictograms in the spot's app-card style (sage strokes on mint tiles).
import type { ReactNode } from "react";
type IconProps = { size: number; color?: string };

const frame = (size: number, color: string, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={color}
    strokeWidth={3.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export function StethoscopeIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <path d="M26 14 v22 a18 18 0 0 0 36 0 v-22" />
      <path d="M22 14 h8 M58 14 h8" />
      <path d="M44 54 v12 a16 16 0 0 0 32 0 v-8" />
      <circle cx={76} cy={50} r={8} />
      <circle cx={76} cy={50} r={3} />
    </>
  ));
}

export function CellIcon({ size, color = "#6d8a78" }: IconProps) {
  const spikes = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  return frame(size, color, (
    <>
      <circle cx={50} cy={50} r={22} />
      {spikes.map((a) => (
        <g key={a}>
          <line x1={50 + Math.cos(a) * 22} y1={50 + Math.sin(a) * 22} x2={50 + Math.cos(a) * 32} y2={50 + Math.sin(a) * 32} />
          <circle cx={50 + Math.cos(a) * 35} cy={50 + Math.sin(a) * 35} r={3} />
        </g>
      ))}
      <circle cx={43} cy={45} r={4} />
      <circle cx={57} cy={55} r={5} />
      <circle cx={55} cy={41} r={2.5} />
    </>
  ));
}

export function HouseIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <path d="M14 50 L50 20 L86 50" />
      <path d="M24 42 v40 h52 v-40" />
      <path d="M42 82 v-20 h16 v20" />
      <path d="M66 26 v12" />
      <circle cx={50} cy={48} r={6} />
    </>
  ));
}

export function ScalpelIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <path d="M22 82 L56 48" />
      <path d="M56 48 C66 32 74 22 84 16 C82 30 74 42 62 54 Z" />
      <path d="M30 74 l6 6" />
      <path d="M18 64 c6 -4 10 -4 14 0" />
    </>
  ));
}

export function CapsuleIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <rect x={14} y={36} width={52} height={24} rx={12} transform="rotate(-30 40 48)" />
      <path d="M33 34 L45 58" />
      <circle cx={70} cy={66} r={14} />
      <path d="M60 56 L80 76" />
    </>
  ));
}

export function TargetSyringeIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <circle cx={34} cy={34} r={18} />
      <circle cx={34} cy={34} r={9} />
      <circle cx={34} cy={34} r={2} />
      <path d="M40 74 L74 40" />
      <rect x={52} y={34} width={14} height={40} rx={3} transform="rotate(45 59 54)" />
      <path d="M76 30 l8 -8 M72 26 l10 10" />
      <path d="M34 80 l8 -8" />
    </>
  ));
}

export function RobotArmIcon({ size, color = "#6d8a78" }: IconProps) {
  return frame(size, color, (
    <>
      <rect x={14} y={12} width={72} height={8} rx={2} />
      <path d="M40 20 v14 l14 14 l-6 16" />
      <circle cx={40} cy={36} r={5} />
      <circle cx={54} cy={50} r={5} />
      <circle cx={48} cy={66} r={5} />
      <path d="M42 72 l-6 10 M54 72 l6 10" />
      <path d="M30 88 h40" />
    </>
  ));
}

export function RadiationIcon({ size, color = "#6d8a78" }: IconProps) {
  const blade = (center: number) => {
    const point = (r: number, deg: number) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
    };
    const [a0, a1] = [center - 30, center + 30];
    return (
      <path
        key={center}
        d={`M${point(11, a0)} L${point(30, a0)} A30 30 0 0 1 ${point(30, a1)} L${point(11, a1)} A11 11 0 0 0 ${point(11, a0)} Z`}
      />
    );
  };
  return frame(size, color, (
    <>
      <circle cx={50} cy={50} r={36} />
      {[0, 120, 240].map(blade)}
      <circle cx={50} cy={50} r={6} />
      <path d="M30 92 h40 M40 86 h20" />
    </>
  ));
}

export function PhoneHandsetIcon({ size, color = "#1f2a86" }: IconProps) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 62 100" fill="none">
      <rect x={3} y={3} width={56} height={94} rx={10} stroke={color} strokeWidth={6} />
      <path
        d="M20 30 c-4 6 -4 14 2 26 c6 12 12 18 20 20 l6 -8 l-10 -8 l-5 4 c-4 -3 -8 -9 -10 -14 l5 -3 l-4 -12 Z"
        fill={color}
      />
    </svg>
  );
}

export function CalendarCheckIcon({ size, color = "#ffffff" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round">
      <rect x={8} y={18} width={74} height={70} rx={8} />
      <path d="M8 38 h74" />
      <path d="M28 8 v18 M62 8 v18" strokeLinecap="round" />
      <text x={45} y={76} textAnchor="middle" fontSize={34} fontWeight={900} fill={color} stroke="none">1</text>
      <circle cx={80} cy={80} r={16} fill="#1b2266" stroke={color} strokeWidth={5} />
      <path d="M72 80 l6 6 l10 -12" strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
}
