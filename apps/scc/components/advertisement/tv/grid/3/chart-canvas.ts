import type { Palette } from "./palette";
import { GRAPH } from "./radar";
import { BEATS, type Axis } from "./scenes";

// The radar chart drawn with Canvas 2D, same geometry and beats as the SVG in ./radar.tsx,
// in two parts: the web, which depends only on the axis count and palette, so a wall draws it
// once per palette per frame into a small bitmap and stamps it into every cell; and the data
// (both polygons and the dots), drawn per cell because every graph's values differ.

const RINGS = [0.25, 0.5, 0.75, 1];
/** Labels sit at 1.17 r from the centre, as in radar.tsx. */
const LABEL_REACH = 1.17;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const pop = (p: number) => {
  const v = clamp01(p);
  return v < 0.7 ? (v / 0.7) * 1.12 : 1.12 - ((v - 0.7) / 0.3) * 0.12;
};

function vertex(k: number, n: number, f: number) {
  const a = (k / n) * Math.PI * 2 - Math.PI / 2;
  return [GRAPH.cx + Math.cos(a) * GRAPH.r * f, GRAPH.cy + Math.sin(a) * GRAPH.r * f] as const;
}

function polygon(ctx: CanvasRenderingContext2D, n: number, f: (k: number) => number) {
  ctx.beginPath();
  for (let k = 0; k < n; k += 1) {
    const [x, y] = vertex(k, n, f(k));
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** How a label pill's text is set. `font` is a CSS font shorthand without the size, e.g. `700 ` + family. */
export type LabelFont = { weight: number; size: number; family: string };

/** A pill rendered once at device resolution; `width`/`height` are its size in graph pixels including the drop. */
type Pill = { bitmap: HTMLCanvasElement; width: number; height: number };
const pills = new Map<string, Pill>();
/** Graph pixels of shadow below the pill. */
const DROP = 4;

/** Renders one pill (text set once) at `density` device pixels per graph pixel. */
function pill(label: string, colour: string, font: LabelFont, density: number): Pill {
  const cssFont = `${font.weight} ${font.size}px ${font.family}`;
  const key = `${cssFont}|${label}|${colour}|${density.toFixed(3)}`;
  const cached = pills.get(key);
  if (cached) return cached;
  const bitmap = document.createElement("canvas");
  const ctx = bitmap.getContext("2d")!;
  ctx.font = cssFont;
  ctx.letterSpacing = `${-0.04 * font.size}px`;
  const width = Math.ceil(ctx.measureText(label).width) + 44;
  const height = Math.round(font.size * 1.2) + 18;
  bitmap.width = Math.ceil(width * density) + 2;
  bitmap.height = Math.ceil((height + DROP) * density) + 2;
  ctx.setTransform(density, 0, 0, density, 1, 1);
  ctx.font = cssFont;
  ctx.letterSpacing = `${-0.04 * font.size}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // A soft drop below the pill, standing in for the HTML box-shadow.
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.beginPath();
  ctx.roundRect(0, DROP, width, height, 40);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 40);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(label, width / 2, height / 2 - 1);
  const made = { bitmap, width, height: height + DROP };
  pills.set(key, made);
  return made;
}

/** Drops every cached pill, e.g. once web fonts have loaded. */
export function forgetPills() {
  pills.clear();
}

/**
 * The axis labels as pills, matching the HTML ones in radar.tsx (8/22/10 px padding, 40 px radius,
 * -0.04 em tracking): each pops in on its beat; short axes turn the accent colour after the deficit beat.
 * Pills are cached bitmaps, so a frame costs one drawImage per label.
 */
export function drawLabels(ctx: CanvasRenderingContext2D, axes: readonly Axis[], labels: readonly string[], t: number, palette: Palette, font: LabelFont) {
  const n = axes.length;
  const [a, b] = BEATS.labels;
  const step = (b - a) / n;
  const density = ctx.getTransform().a;
  for (let k = 0; k < n; k += 1) {
    const s = pop(ramp(t, a + k * step, a + k * step + 0.35));
    if (s <= 0) continue;
    const [x, y] = vertex(k, n, LABEL_REACH);
    const short = t >= BEATS.deficits && axes[k].recommended - axes[k].mine > 0.3;
    const { bitmap, width, height } = pill(labels[k], short ? palette.accent : palette.primary, font, density);
    const w = width * s;
    const h = height * s;
    ctx.drawImage(bitmap, x - w / 2, y - ((height - DROP) / 2) * s, w, h);
  }
}

/** `#rrggbb` with an alpha, for the gradient stops the SVG sets with stop-opacity. */
function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const gradients = new WeakMap<CanvasRenderingContext2D, Map<string, { web: CanvasGradient; mine: CanvasGradient }>>();

/** The web and own-coverage gradients for a palette, in GRAPH coordinates, made once per context. */
function gradientsFor(ctx: CanvasRenderingContext2D, palette: Palette) {
  let byPalette = gradients.get(ctx);
  if (!byPalette) {
    byPalette = new Map();
    gradients.set(ctx, byPalette);
  }
  let made = byPalette.get(palette.id);
  if (!made) {
    const web = ctx.createRadialGradient(GRAPH.cx, GRAPH.cy, 0, GRAPH.cx, GRAPH.cy, GRAPH.r);
    web.addColorStop(0, palette.webFill[0]);
    web.addColorStop(1, palette.webFill[1]);
    const mine = ctx.createLinearGradient(0, 0, 0, GRAPH.height);
    mine.addColorStop(0, withAlpha(palette.mine.top, 0.85));
    mine.addColorStop(1, withAlpha(palette.mine.bottom, 0.75));
    made = { web, mine };
    byPalette.set(palette.id, made);
  }
  return made;
}

/** The web: outer polygon, rings, spokes and centre dot, in GRAPH coordinates; the caller sets the transform. */
export function drawWeb(ctx: CanvasRenderingContext2D, n: number, t: number, palette: Palette) {
  const grid = easeOut(ramp(t, ...BEATS.grid));
  const spokes = easeOut(ramp(t, ...BEATS.spokes));
  ctx.lineCap = "butt";

  // Web: fills in from the centre.
  if (grid > 0) {
    ctx.save();
    ctx.globalAlpha = grid;
    ctx.translate(GRAPH.cx, GRAPH.cy);
    ctx.scale(grid, grid);
    ctx.translate(-GRAPH.cx, -GRAPH.cy);
    polygon(ctx, n, () => 1);
    ctx.fillStyle = gradientsFor(ctx, palette).web;
    ctx.fill();
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 5;
    ctx.lineJoin = "miter";
    ctx.stroke();
    ctx.strokeStyle = palette.web;
    ctx.lineWidth = 2.5;
    for (const f of RINGS.slice(0, -1)) {
      ctx.setLineDash(f === 0.5 ? [] : [10, 8]);
      polygon(ctx, n, () => f);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Spokes grow outward.
  ctx.strokeStyle = palette.web;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let k = 0; k < n; k += 1) {
    const [x, y] = vertex(k, n, spokes);
    ctx.moveTo(GRAPH.cx, GRAPH.cy);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(GRAPH.cx, GRAPH.cy, 9 * grid, 0, Math.PI * 2);
  ctx.fillStyle = palette.primary;
  ctx.fill();
}

/** The data: recommended and own polygons and the vertex dots, in GRAPH coordinates. */
export function drawData(ctx: CanvasRenderingContext2D, axes: readonly Axis[], t: number, palette: Palette) {
  const n = axes.length;
  const rec = easeOut(ramp(t, ...BEATS.recommended));
  const mine = easeOut(ramp(t, ...BEATS.mine));
  const gaps = axes.map((axis, k) => ({ k, gap: axis.recommended - axis.mine })).filter((d) => d.gap > 0.3);
  const pulse = t >= BEATS.deficits ? 1 + 0.18 * Math.abs(Math.sin((t - BEATS.deficits) * 4)) : 1;
  ctx.lineCap = "butt";

  // Recommended coverage: dashed.
  if (rec > 0) {
    polygon(ctx, n, (k) => axes[k].recommended * rec);
    ctx.fillStyle = palette.recommendedFill;
    ctx.fill();
    ctx.strokeStyle = palette.recommended;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.setLineDash([18, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // My coverage: solid, gradient fill.
  if (mine > 0) {
    polygon(ctx, n, (k) => axes[k].mine * mine);
    ctx.fillStyle = gradientsFor(ctx, palette).mine;
    ctx.fill();
    ctx.strokeStyle = palette.mine.stroke;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  // Vertex dots once drawn; deficit dots in the highlight colour, pulsing.
  if (mine >= 1) {
    ctx.strokeStyle = palette.mine.stroke;
    ctx.lineWidth = 5;
    axes.forEach((axis, k) => {
      const [x, y] = vertex(k, n, axis.mine);
      const short = gaps.some((g) => g.k === k);
      ctx.beginPath();
      ctx.arc(x, y, short ? 13 * pulse : 10, 0, Math.PI * 2);
      ctx.fillStyle = short ? palette.highlight : "#fff";
      ctx.fill();
      ctx.stroke();
    });
  }
}
