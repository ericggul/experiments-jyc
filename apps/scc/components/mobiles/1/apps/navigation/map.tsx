import type { ReactNode } from "react";
import { createRng } from "../../model/rng";

/**
 * Stylised street-grid map drawn as inline SVG. No tiles, no images.
 * Everything lives in a rotated "grid frame"; routes are Manhattan-style
 * polylines in that frame. Shared by navigation, run and ride-hail.
 */
export type Pt = readonly [number, number];

export type MapData = {
  w: number;
  h: number;
  angle: number;
  gx: number;
  gy: number;
  seed: number;
  /** River and park shapes are placed in the grid frame. */
  waterD: string;
  parks: readonly { id: string; x: number; y: number; w: number; h: number }[];
  minorD: string;
  majorD: string;
  names: readonly { id: string; x: number; y: number; text: string }[];
  start: Pt;
  end: Pt;
};

const streetNames = ["W 23rd St", "Atlantic Ave", "Bedford Ave", "Metropolitan Ave", "Myrtle Ave", "Flushing Ave", "Court St", "Smith St", "Hudson St", "Canal St", "E 14th St", "Lexington Ave"];

export function makeMap(seed: number, w: number, h: number, options: { angle?: number; gx?: number; gy?: number; span?: number } = {}): MapData {
  const rng = createRng(seed ^ 0x51ed);
  const angle = options.angle ?? -29 + rng.range(-6, 6);
  const gx = options.gx ?? 30;
  const gy = options.gy ?? 11;
  const span = options.span ?? 1.6;
  const x0 = -w * span;
  const x1 = w * (1 + span);
  const y0 = -h * span;
  const y1 = h * (1 + span);
  const offX = rng.range(0, gx);
  const offY = rng.range(0, gy);
  let minor = "";
  let major = "";
  let i = 0;
  for (let x = x0 + offX; x < x1; x += gx, i += 1) {
    const seg = `M${x.toFixed(1)} ${y0}V${y1}`;
    if (i % 4 === 0) major += seg;
    else minor += seg;
  }
  i = 0;
  for (let y = y0 + offY; y < y1; y += gy, i += 1) {
    const seg = `M${x0} ${y.toFixed(1)}H${x1}`;
    if (i % 6 === 0) major += seg;
    else minor += seg;
  }
  // River: a wavy band that runs the full height on one side of the frame.
  const side = rng.chance(0.5) ? 1 : -1;
  const edge = side > 0 ? w * rng.range(0.88, 1.02) : w * rng.range(-0.02, 0.12);
  const far = side > 0 ? x1 : x0;
  let waterD = `M${far} ${y0}H${edge.toFixed(1)}`;
  for (let y = y0; y < y1; y += 120) {
    waterD += `Q${(edge + rng.range(-26, 26)).toFixed(1)} ${y + 60} ${(edge + rng.range(-12, 12)).toFixed(1)} ${y + 120}`;
  }
  waterD += `H${far}Z`;
  const parks = [0, 1, 2].map((k) => {
    const px = Math.round(rng.range(w * 0.1, w * 0.85) / gx) * gx + offX;
    const py = Math.round(rng.range(h * 0.05, h * 0.95) / gy) * gy + offY;
    return { id: `park-${k}`, x: px, y: py, w: gx * rng.int(1, 3), h: gy * rng.int(3, 8) };
  });
  const names = [0, 1, 2, 3].map((k) => ({
    id: `name-${k}`,
    x: rng.range(w * 0.1, w * 0.7),
    y: rng.range(h * 0.1, h * 0.9),
    text: streetNames[(rng.int(0, streetNames.length - 1) + k) % streetNames.length],
  }));
  // Start and end fall inside a box shrunk so the rotated frame stays on glass.
  const rad = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  let hx = w * 0.34;
  let hy = h * 0.34;
  const fit = Math.min(1, (w / 2 - 22) / (hx * c + hy * s), (h / 2 - 22) / (hx * s + hy * c));
  hx *= fit;
  hy *= fit;
  const snap = (v: number, g: number, o: number) => Math.round((v - o) / g) * g + o;
  const startSide = rng.chance(0.5) ? -1 : 1;
  const start: Pt = [snap(w / 2 - startSide * hx * rng.range(0.6, 1), gx, offX), snap(h / 2 + hy * rng.range(0.55, 1), gy, offY)];
  const end: Pt = [snap(w / 2 + startSide * hx * rng.range(0.6, 1), gx, offX), snap(h / 2 - hy * rng.range(0.55, 1), gy, offY)];
  return { w, h, angle, gx, gy, seed, waterD, parks, minorD: minor, majorD: major, names, start, end };
}

/** A Manhattan-style route between two grid points; `variant` changes the turns. */
export function makeRoute(map: MapData, variant: number, from: Pt = map.start, to: Pt = map.end): Pt[] {
  const rng = createRng(map.seed * 31 + variant * 977 + 5);
  const pts: Pt[] = [from];
  let [x, y] = from;
  let horizontal = rng.chance(0.5);
  const turns = 3 + (variant % 3);
  for (let k = 0; k < turns; k += 1) {
    const frac = rng.range(0.3, 0.75);
    if (horizontal) x += Math.round(((to[0] - x) * frac) / map.gx) * map.gx;
    else y += Math.round(((to[1] - y) * frac) / map.gy) * map.gy;
    const last = pts[pts.length - 1];
    if (last[0] !== x || last[1] !== y) pts.push([x, y]);
    horizontal = !horizontal;
  }
  if (x !== to[0] && y !== to[1]) pts.push(horizontal ? [to[0], y] : [x, to[1]]);
  if (pts[pts.length - 1][0] !== to[0] || pts[pts.length - 1][1] !== to[1]) pts.push(to);
  return pts;
}

export function routeLength(pts: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return total;
}

/** The part of a polyline between fractions t0 and t1 of its length. */
export function slice(pts: readonly Pt[], t0: number, t1: number): Pt[] {
  const total = routeLength(pts) || 1;
  const a = Math.max(0, Math.min(1, t0)) * total;
  const b = Math.max(0, Math.min(1, t1)) * total;
  const out: Pt[] = [];
  let run = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i - 1];
    const q = pts[i];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const s = run;
    const e = run + len;
    run = e;
    if (len === 0 || e < a || s > b) continue;
    const lerp = (d: number): Pt => [p[0] + ((q[0] - p[0]) * (d - s)) / len, p[1] + ((q[1] - p[1]) * (d - s)) / len];
    if (out.length === 0) out.push(lerp(Math.max(a, s)));
    out.push(lerp(Math.min(b, e)));
  }
  return out;
}

export function pointAt(pts: readonly Pt[], t: number): Pt {
  const piece = slice(pts, t, t);
  return piece.length ? piece[0] : pts[pts.length - 1];
}

/** Heading in degrees (0 = up) of the route at fraction t, in the grid frame. */
export function headingAt(pts: readonly Pt[], t: number): number {
  const total = routeLength(pts) || 1;
  const target = Math.max(0, Math.min(0.999, t)) * total;
  let run = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (run + len >= target && len > 0) return (Math.atan2(pts[i][0] - pts[i - 1][0], -(pts[i][1] - pts[i - 1][1])) * 180) / Math.PI;
    run += len;
  }
  return 0;
}

export const toPoints = (pts: readonly Pt[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

export const mapColors = {
  light: { bg: "#f1ede4", minor: "#fbf9f4", major: "#fffdf8", casing: "#ddd6c8", water: "#a9d3f2", park: "#c6e2b3", label: "#8a8578" },
  dark: { bg: "#1b1f25", minor: "#272c33", major: "#323841", casing: "#14171b", water: "#0e2a40", park: "#1c3425", label: "#5b6470" },
} as const;

export function MapSvg({ map, dark = false, camera, children, className }: {
  map: MapData;
  dark?: boolean;
  /** Centre the view on a grid-frame point at a given zoom and screen anchor. */
  camera?: { at: Pt; scale: number; anchor?: Pt };
  children?: ReactNode;
  className?: string;
}) {
  const c = dark ? mapColors.dark : mapColors.light;
  const cx = map.w / 2;
  const cy = map.h / 2;
  const frame = camera
    ? `translate(${camera.anchor?.[0] ?? cx} ${camera.anchor?.[1] ?? cy}) scale(${camera.scale}) rotate(${map.angle}) translate(${-camera.at[0]} ${-camera.at[1]})`
    : `rotate(${map.angle} ${cx} ${cy})`;
  return (
    <svg className={className} width={map.w} height={map.h} viewBox={`0 0 ${map.w} ${map.h}`} aria-hidden="true">
      <rect width={map.w} height={map.h} fill={c.bg} />
      <g>
        <g transform={frame}>
          <path d={map.waterD} fill={c.water} />
          {map.parks.map((p) => (
            <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} rx={3} fill={c.park} />
          ))}
          <path d={map.majorD} stroke={c.casing} strokeWidth={5.5} fill="none" />
          <path d={map.minorD} stroke={c.minor} strokeWidth={2.2} fill="none" />
          <path d={map.majorD} stroke={c.major} strokeWidth={4} fill="none" />
          {map.names.map((n) => (
            <text key={n.id} x={n.x} y={n.y} fontSize={6.5} fill={c.label} fontFamily="-apple-system, Helvetica, sans-serif">
              {n.text}
            </text>
          ))}
          {children}
        </g>
      </g>
    </svg>
  );
}

/** A route stroke with a casing, in the grid frame. */
export function RouteLine({ pts, color, width = 5, casing = "#fff", opacity = 1 }: { pts: readonly Pt[]; color: string; width?: number; casing?: string; opacity?: number }) {
  if (pts.length < 2) return null;
  const p = toPoints(pts);
  return (
    <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={p} stroke={casing} strokeWidth={width + 2.5} />
      <polyline points={p} stroke={color} strokeWidth={width} />
    </g>
  );
}

/** Counter-rotates a marker so it stays upright on screen. */
export function Upright({ map, at, scale = 1, children }: { map: MapData; at: Pt; scale?: number; children: ReactNode }) {
  return <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) rotate(${-map.angle}) scale(${scale})`}>{children}</g>;
}
