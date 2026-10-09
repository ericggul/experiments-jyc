import { easeOutCubic, ramp } from "../../../stage/timeline";
import { OzempicWordmark } from "./logo";

// White product card and the closing end card on the brand's soft-grey sweep.
const SWEEP = "radial-gradient(ellipse at 50% 45%, #fbfaf8 0%, #f0eeea 55%, #dad7d2 100%)";

function Pen({ x }: { x: number }) {
  return (
    <svg width={660} height={70} viewBox="0 0 660 70" style={{ transform: `translateX(${x}px)` }}>
      <defs>
        <linearGradient id="oz-pen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb6ec" />
          <stop offset="0.5" stopColor="#2f78d2" />
          <stop offset="1" stopColor="#1d4f9a" />
        </linearGradient>
      </defs>
      <rect x={10} y={14} width={620} height={42} rx={21} fill="url(#oz-pen)" />
      <rect x={330} y={18} width={150} height={34} rx={4} fill="#eef3f8" />
      <rect x={345} y={26} width={80} height={18} rx={2} fill="#d71f26" opacity={0.8} />
      <rect x={600} y={20} width={56} height={30} rx={8} fill="#1b3f78" />
    </svg>
  );
}

export function ProductCard({ t, letters, sub, pen, fine }: { t: number; letters: readonly [number, number]; sub: number; pen: readonly [number, number]; fine: number }) {
  const reveal = ramp(t, letters[0], letters[1]);
  const subIn = easeOutCubic(ramp(t, sub, sub + 0.4));
  const penIn = easeOutCubic(ramp(t, pen[0], pen[1]));
  return (
    <div style={{ position: "absolute", inset: 0, background: SWEEP, textAlign: "center" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 260 }}>
        <OzempicWordmark size={200} reveal={reveal} onceWeekly={subIn > 0} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 476,
          fontSize: 84,
          fontWeight: 500,
          letterSpacing: "-0.035em",
          color: "#2c2c2c",
          opacity: subIn,
        }}
      >
        semaglutide injection <span style={{ fontSize: 30, letterSpacing: 0 }}>0.5 mg/1 mg</span>
      </div>
      <div style={{ position: "absolute", left: 630, top: 630, opacity: penIn }}>
        <Pen x={(1 - penIn) * 500} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 860,
          fontSize: 23,
          lineHeight: 1.4,
          color: "#3c3c3c",
          opacity: ramp(t, fine, fine + 0.3),
        }}
      >
        Ozempic® is an injectable prescription medicine that may improve blood sugar in adults
        <br />
        with type 2 diabetes when used with diet and exercise. It is not for weight loss.
      </div>
    </div>
  );
}

export function EndCard({ t }: { t: number }) {
  const logo = easeOutCubic(ramp(t, 0, 0.5));
  const copy = ramp(t, 0.5, 0.9);
  const url = ramp(t, 1.0, 1.4);
  return (
    <div style={{ position: "absolute", inset: 0, background: SWEEP, textAlign: "center", color: "#2a2a2a" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, opacity: logo, transform: `scale(${0.94 + logo * 0.06})` }}>
        <OzempicWordmark size={190} onceWeekly />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, fontSize: 44, fontWeight: 600, lineHeight: 1.35, opacity: copy }}>
        Pay as little as $25 per prescription
        <div style={{ fontSize: 34, fontWeight: 500 }}>for up to 24 months, if eligible.</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, fontSize: 48, fontWeight: 600, lineHeight: 1.35, opacity: url }}>
        Ozempic.com
        <br />
        1-855-OZEMPIC
      </div>
    </div>
  );
}
