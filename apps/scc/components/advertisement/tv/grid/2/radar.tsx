import { useId } from "react";
import { DEFAULT_PALETTE, type Palette } from "./palette";
import { BEATS, type Axis } from "./scenes";

// One polygon ("다각형 분석") chart in the daytime-DR register: thick web, saturated fills, big
// pill labels. Geometry is in graph pixels: the GRAPH box holds the chart and its labels and is
// the unit the wall tiles.
export const GRAPH = { width: 760, height: 620, cx: 380, cy: 310, r: 222 } as const;

const RINGS = [0.25, 0.5, 0.75, 1];
/** Labels sit at 1.17 r from the centre. */
const LABEL_REACH = 1.17;

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
  return [GRAPH.cx + Math.cos(a) * GRAPH.r * f, GRAPH.cy + Math.sin(a) * GRAPH.r * f] as const;
}

const polygon = (n: number, f: (k: number) => number) =>
  Array.from({ length: n }, (_, k) => vertex(k, n, f(k)).map((v) => v.toFixed(1)).join(",")).join(" ");

export function deficits(axes: readonly Axis[]) {
  return axes.map((axis, k) => ({ k, gap: axis.recommended - axis.mine })).filter((d) => d.gap > 0.3);
}

/** The web, both polygons and the vertex dots, drawn in over the scene's beats, as one SVG. */
export function RadarChart({ axes, t, palette = DEFAULT_PALETTE }: { axes: readonly Axis[]; t: number; palette?: Palette }) {
  return (
    <svg width={GRAPH.width} height={GRAPH.height} viewBox={`0 0 ${GRAPH.width} ${GRAPH.height}`} style={{ position: "absolute", inset: 0 }}>
      <RadarChartBody axes={axes} t={t} palette={palette} />
    </svg>
  );
}

/** The chart's SVG content without its <svg>, so a wall can draw it once per palette in a <symbol> and reuse it. */
export function RadarChartBody({ axes, t, palette = DEFAULT_PALETTE }: { axes: readonly Axis[]; t: number; palette?: Palette }) {
  const n = axes.length;
  // Gradient ids are document-wide; each chart on the wall needs its own so palettes do not bleed between graphs.
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
    <>
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
      <g transform={`translate(${GRAPH.cx} ${GRAPH.cy}) scale(${grid}) translate(${-GRAPH.cx} ${-GRAPH.cy})`} opacity={grid}>
        <polygon points={polygon(n, () => 1)} fill={`url(#${bgId})`} stroke={palette.primary} strokeWidth={5} />
        {RINGS.slice(0, -1).map((f) => (
          <polygon key={f} points={polygon(n, () => f)} fill="none" stroke={palette.web} strokeWidth={2.5} strokeDasharray={f === 0.5 ? undefined : "10 8"} />
        ))}
      </g>
      {axes.map((axis, k) => {
        const [x, y] = vertex(k, n, spokes);
        return <line key={axis.label} x1={GRAPH.cx} y1={GRAPH.cy} x2={x} y2={y} stroke={palette.web} strokeWidth={2.5} />;
      })}
      {rec > 0 ? (
        <polygon
          points={polygon(n, (k) => axes[k].recommended * rec)}
          fill={palette.recommendedFill}
          stroke={palette.recommended}
          strokeWidth={6}
          strokeDasharray="18 10"
          strokeLinejoin="round"
        />
      ) : null}
      {mine > 0 ? (
        <polygon points={polygon(n, (k) => axes[k].mine * mine)} fill={`url(#${mineId})`} stroke={palette.mine.stroke} strokeWidth={6} strokeLinejoin="round" />
      ) : null}
      {mine >= 1
        ? axes.map((axis, k) => {
            const [x, y] = vertex(k, n, axis.mine);
            const short = gaps.some((g) => g.k === k);
            const r = short ? 13 * pulse : 10;
            return <circle key={axis.label} cx={x} cy={y} r={r} fill={short ? palette.highlight : "#fff"} stroke={palette.mine.stroke} strokeWidth={5} />;
          })
        : null}
      <circle cx={GRAPH.cx} cy={GRAPH.cy} r={9 * grid} fill={palette.primary} />
    </>
  );
}

/** Axis labels as HTML pills so they use the page font; each pops in turn. */
export function RadarLabels({ axes, labels, t, fontSize = 42, fontWeight = 700, className, palette = DEFAULT_PALETTE }: { axes: readonly Axis[]; labels: readonly string[]; t: number; fontSize?: number; fontWeight?: number; className?: string; palette?: Palette }) {
  const n = axes.length;
  const [a, b] = BEATS.labels;
  const step = (b - a) / n;
  const gaps = deficits(axes);
  return (
    <>
      {axes.map((axis, k) => {
        const [x, y] = vertex(k, n, LABEL_REACH);
        const s = pop(ramp(t, a + k * step, a + k * step + 0.35));
        if (s <= 0) return null;
        const short = t >= BEATS.deficits && gaps.some((g) => g.k === k);
        return (
          <div
            key={axis.label}
            className={className}
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
              fontWeight,
              letterSpacing: "-0.04em",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            }}
          >
            {labels[k]}
          </div>
        );
      })}
    </>
  );
}
