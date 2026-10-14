import { useId } from "react";
import { DEFAULT_PALETTE, type Palette } from "./palette";
import { BEATS, type Axis } from "./scenes";

// Centred radar ("다각형 분석") chart in the daytime-DR register: thick web,
// saturated fills, big labels. Geometry is in broadcast-frame pixels.
export type Chart = { cx: number; cy: number; r: number };

/** The 1920×1080 chart. */
export const CHART: Chart = { cx: 960, cy: 568, r: 222 };

/** How much of the broadcast layout surrounds the chart. */
export type Chrome = "full" | "bare" | "chart";

/** Frame rows the chart must clear, per chrome: the title block above; the footnote and phone bar, or an edge margin, below. */
const ROOM = {
  full: { head: 200, foot: 230 },
  bare: { head: 200, foot: 40 },
  chart: { head: 60, foot: 60 },
} as const;
/** With the phone bar, the 1080 chart sits this much below the centre of its room. */
const FULL_BIAS = CHART.cy - (ROOM.full.head + (1080 - ROOM.full.head - ROOM.full.foot) / 2);
/** Axis labels sit at 1.17 r, about half a label tall beyond the web and up to this wide beside it. */
const LABEL_REACH = 1.17;
const LABEL_HALF = 60;
const LABEL_WIDE = 380;

/**
 * The chart for a frame of this height and an n-axis polygon. With the full layout it is the 1080
 * geometry, shrunk when the frame is shorter. Without the bar, and chart-only, the polygon's
 * visible extent (first vertex up, lowest vertices down, labels included) centres in the room;
 * chart-only it also grows to fill it.
 */
export function chartFor(height: number, chrome: Chrome = "full", n = 6): Chart {
  const { head, foot } = ROOM[chrome];
  const room = Math.max(0, height - head - foot);
  if (chrome === "full") {
    return {
      cx: CHART.cx,
      cy: head + room / 2 + FULL_BIAS,
      r: Math.min(CHART.r, Math.max(0, room / 2 - LABEL_HALF) / LABEL_REACH),
    };
  }
  // The polygon reaches a full radius up and only to its lowest vertex down.
  const down = Math.max(...Array.from({ length: n }, (_, k) => Math.sin((k / n) * Math.PI * 2 - Math.PI / 2)));
  const fitsHeight = Math.max(0, room - 2 * LABEL_HALF) / (LABEL_REACH * (1 + down));
  const fitsWidth = (CHART.cx - ROOM.chart.head - LABEL_WIDE) / LABEL_REACH;
  const r = chrome === "chart" ? Math.min(fitsHeight, fitsWidth) : Math.min(CHART.r, fitsHeight);
  return {
    cx: CHART.cx,
    cy: head + room / 2 + (r * LABEL_REACH * (1 - down)) / 2,
    r,
  };
}

const RINGS = [0.25, 0.5, 0.75, 1];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const pop = (p: number) => {
  const v = clamp01(p);
  return v < 0.7 ? (v / 0.7) * 1.12 : 1.12 - ((v - 0.7) / 0.3) * 0.12;
};

/** Vertex k of n at radius fraction f; first axis points straight up. */
export function vertex(chart: Chart, k: number, n: number, f: number) {
  const a = (k / n) * Math.PI * 2 - Math.PI / 2;
  return [chart.cx + Math.cos(a) * chart.r * f, chart.cy + Math.sin(a) * chart.r * f] as const;
}

const polygon = (chart: Chart, n: number, f: (k: number) => number) =>
  Array.from({ length: n }, (_, k) => vertex(chart, k, n, f(k)).map((v) => v.toFixed(1)).join(",")).join(" ");

export function deficits(axes: readonly Axis[]) {
  return axes.map((axis, k) => ({ k, gap: axis.recommended - axis.mine })).filter((d) => d.gap > 0.3);
}

export function RadarChart({ axes, t, chart = CHART, height = 1080, palette = DEFAULT_PALETTE }: { axes: readonly Axis[]; t: number; chart?: Chart; height?: number; palette?: Palette }) {
  const n = axes.length;
  // Gradient ids are document-wide; each chart on a wall needs its own so palettes do not bleed between cells.
  const id = useId();
  const bgId = `radar-bg${id}`;
  const mineId = `radar-mine${id}`;
  const grid = easeOut(ramp(t, ...BEATS.grid));
  const spokes = easeOut(ramp(t, ...BEATS.spokes));
  const rec = easeOut(ramp(t, ...BEATS.recommended));
  const mine = easeOut(ramp(t, ...BEATS.mine));
  const gaps = deficits(axes);
  const pulse = t >= BEATS.deficits ? 1 + 0.18 * Math.abs(Math.sin((t - BEATS.deficits) * 4)) : 1;

  return (
    <svg width={1920} height={height} viewBox={`0 0 1920 ${height}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id={bgId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.webFill[0]} />
          <stop offset="1" stopColor={palette.webFill[1]} />
        </radialGradient>
        <linearGradient id={mineId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.mine.top} stopOpacity={0.85} />
          <stop offset="1" stopColor={palette.mine.bottom} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <g transform={`translate(${chart.cx} ${chart.cy}) scale(${grid}) translate(${-chart.cx} ${-chart.cy})`} opacity={grid}>
        <polygon points={polygon(chart, n, () => 1)} fill={`url(#${bgId})`} stroke={palette.primary} strokeWidth={5} />
        {RINGS.slice(0, -1).map((f) => (
          <polygon key={f} points={polygon(chart, n, () => f)} fill="none" stroke={palette.web} strokeWidth={2.5} strokeDasharray={f === 0.5 ? undefined : "10 8"} />
        ))}
      </g>
      {axes.map((axis, k) => {
        const [x, y] = vertex(chart, k, n, spokes);
        return <line key={axis.label} x1={chart.cx} y1={chart.cy} x2={x} y2={y} stroke={palette.web} strokeWidth={2.5} />;
      })}
      {rec > 0 ? (
        <polygon
          points={polygon(chart, n, (k) => axes[k].recommended * rec)}
          fill={palette.recommendedFill}
          stroke={palette.recommended}
          strokeWidth={6}
          strokeDasharray="18 10"
          strokeLinejoin="round"
        />
      ) : null}
      {mine > 0 ? (
        <polygon points={polygon(chart, n, (k) => axes[k].mine * mine)} fill={`url(#${mineId})`} stroke={palette.mine.stroke} strokeWidth={6} strokeLinejoin="round" />
      ) : null}
      {mine >= 1
        ? axes.map((axis, k) => {
            const [x, y] = vertex(chart, k, n, axis.mine);
            const short = gaps.some((g) => g.k === k);
            const r = short ? 13 * pulse : 10;
            return <circle key={axis.label} cx={x} cy={y} r={r} fill={short ? palette.highlight : "#fff"} stroke={palette.mine.stroke} strokeWidth={5} />;
          })
        : null}
      <circle cx={chart.cx} cy={chart.cy} r={9 * grid} fill={palette.primary} />
    </svg>
  );
}

/** Axis labels as HTML so they use the page font; each pops in turn. */
export function RadarLabels({ axes, labels, t, chart = CHART, fontSize = 42, palette = DEFAULT_PALETTE }: { axes: readonly Axis[]; labels?: readonly string[]; t: number; chart?: Chart; fontSize?: number; palette?: Palette }) {
  const n = axes.length;
  const [a, b] = BEATS.labels;
  const step = (b - a) / n;
  const gaps = deficits(axes);
  return (
    <>
      {axes.map((axis, k) => {
        const [x, y] = vertex(chart, k, n, LABEL_REACH);
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
              background: short ? palette.accent : palette.primary,
              color: "#fff",
              fontSize,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            }}
          >
            {labels?.[k] ?? axis.label}
          </div>
        );
      })}
    </>
  );
}
