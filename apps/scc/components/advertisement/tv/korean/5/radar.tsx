import { BEATS, type Axis } from "./scenes";

// Centred radar ("다각형 분석") chart in the daytime-DR register: thick web,
// saturated fills, big labels. Geometry is in broadcast-frame pixels.
export const CHART = { cx: 960, cy: 568, r: 222 } as const;

const NAVY = "#123a8c";
const RED = "#e8262f";
const RINGS = [0.25, 0.5, 0.75, 1];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const pop = (p: number) => {
  const v = clamp01(p);
  return v < 0.7 ? (v / 0.7) * 1.12 : 1.12 - ((v - 0.7) / 0.3) * 0.12;
};

/** Vertex k of n at radius fraction f; first axis points straight up. */
export function vertex(k: number, n: number, f: number) {
  const a = (k / n) * Math.PI * 2 - Math.PI / 2;
  return [CHART.cx + Math.cos(a) * CHART.r * f, CHART.cy + Math.sin(a) * CHART.r * f] as const;
}

const polygon = (n: number, f: (k: number) => number) =>
  Array.from({ length: n }, (_, k) => vertex(k, n, f(k)).map((v) => v.toFixed(1)).join(",")).join(" ");

export function deficits(axes: readonly Axis[]) {
  return axes.map((axis, k) => ({ k, gap: axis.recommended - axis.mine })).filter((d) => d.gap > 0.3);
}

export function RadarChart({ axes, t }: { axes: readonly Axis[]; t: number }) {
  const n = axes.length;
  const grid = easeOut(ramp(t, ...BEATS.grid));
  const spokes = easeOut(ramp(t, ...BEATS.spokes));
  const rec = easeOut(ramp(t, ...BEATS.recommended));
  const mine = easeOut(ramp(t, ...BEATS.mine));
  const gaps = deficits(axes);
  const pulse = t >= BEATS.deficits ? 1 + 0.18 * Math.abs(Math.sin((t - BEATS.deficits) * 4)) : 1;

  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e3ecfa" />
        </radialGradient>
        <linearGradient id="radar-mine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a4e" stopOpacity={0.85} />
          <stop offset="1" stopColor={RED} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <g transform={`translate(${CHART.cx} ${CHART.cy}) scale(${grid}) translate(${-CHART.cx} ${-CHART.cy})`} opacity={grid}>
        <polygon points={polygon(n, () => 1)} fill="url(#radar-bg)" stroke={NAVY} strokeWidth={5} />
        {RINGS.slice(0, -1).map((f) => (
          <polygon key={f} points={polygon(n, () => f)} fill="none" stroke="#8ea6d6" strokeWidth={2.5} strokeDasharray={f === 0.5 ? undefined : "10 8"} />
        ))}
      </g>
      {axes.map((axis, k) => {
        const [x, y] = vertex(k, n, spokes);
        return <line key={axis.label} x1={CHART.cx} y1={CHART.cy} x2={x} y2={y} stroke="#8ea6d6" strokeWidth={2.5} />;
      })}
      {rec > 0 ? (
        <polygon
          points={polygon(n, (k) => axes[k].recommended * rec)}
          fill="rgba(36, 104, 230, 0.16)"
          stroke="#2468e6"
          strokeWidth={6}
          strokeDasharray="18 10"
          strokeLinejoin="round"
        />
      ) : null}
      {mine > 0 ? (
        <polygon points={polygon(n, (k) => axes[k].mine * mine)} fill="url(#radar-mine)" stroke="#b5121b" strokeWidth={6} strokeLinejoin="round" />
      ) : null}
      {mine >= 1
        ? axes.map((axis, k) => {
            const [x, y] = vertex(k, n, axis.mine);
            const short = gaps.some((g) => g.k === k);
            const r = short ? 13 * pulse : 10;
            return <circle key={axis.label} cx={x} cy={y} r={r} fill={short ? "#ffe100" : "#fff"} stroke="#b5121b" strokeWidth={5} />;
          })
        : null}
      <circle cx={CHART.cx} cy={CHART.cy} r={9 * grid} fill={NAVY} />
    </svg>
  );
}

/** Axis labels as HTML so they use the page font; each pops in turn. */
export function RadarLabels({ axes, t }: { axes: readonly Axis[]; t: number }) {
  const n = axes.length;
  const [a, b] = BEATS.labels;
  const step = (b - a) / n;
  const gaps = deficits(axes);
  return (
    <>
      {axes.map((axis, k) => {
        const [x, y] = vertex(k, n, 1.17);
        const s = pop(ramp(t, a + k * step, a + k * step + 0.35));
        if (s <= 0) return null;
        const short = t >= BEATS.deficits && gaps.some((g) => g.k === k);
        return (
          <div
            key={axis.label}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${s})`,
              padding: "8px 22px 10px",
              borderRadius: 40,
              background: short ? "#e8262f" : "#123a8c",
              color: "#fff",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            }}
          >
            {axis.label}
          </div>
        );
      })}
    </>
  );
}
