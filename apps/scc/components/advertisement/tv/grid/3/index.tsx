"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { spoqa } from "@/components/advertisement/tv/fonts";
import { drawData, drawLabels, drawWeb, forgetPills, type LabelFont } from "./chart-canvas";
import { LATIN_FONTS } from "./fonts";
import styles from "./grid.module.css";
import { DEFAULT_GRAPH_OPTIONS, GraphOptionsPanel, languageFor, noise, paletteFor, type GraphOptions, type Language, type LatinStyle } from "./options";
import type { Palette } from "./palette";
import { GRAPH } from "./radar";
import { HELD_AT, SCENE_LENGTH, SCENES, type Axis } from "./scenes";
import honey from "./honeycomb.module.css";

// The whole field is one honeycomb of pointy-top hexagons. Some cells carry the full graph,
// whose outer polygon is exactly its cell; the rest are drawn as thin outlines, so the lattice
// the graphs sit in shows through.
//
// The wall keeps one clock outside React and paints everything on one canvas each frame:
// every cell's web, data polygons and label pills, at that cell's own phase of the scene. React
// is not involved per frame at all. Paused, every cell holds at the same fully drawn moment;
// playing, each cell starts from its own offset so the wall never moves in unison.
const SCENE = SCENES[0];
const ROW_OPTIONS = [4, 6, 8, 10, 12, 16] as const;
type Rows = (typeof ROW_OPTIONS)[number];
const SQRT3 = Math.sqrt(3);

// Which cells carry a graph: every cell, or axial lattices where no two graphs touch, so labels
// spill into empty neighbours. 1/3 is the densest such lattice.
const DENSITIES = [
  { id: 1, label: "1/1", filled: () => true },
  { id: 3, label: "1/3", filled: (q: number, r: number) => mod(q - r, 3) === 0 },
  { id: 4, label: "1/4", filled: (q: number, r: number) => mod(q, 2) === 0 && mod(r, 2) === 0 },
  { id: 7, label: "1/7", filled: (q: number, r: number) => mod(q + 2 * r, 7) === 0 },
] as const;
type Density = (typeof DENSITIES)[number]["id"];
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Pointy-top hexagon outline of circumradius R about (cx, cy); the first vertex points up like the chart's first axis. */
function hexagonPoints(cx: number, cy: number, R: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
    return `${(cx + Math.cos(a) * R).toFixed(1)},${(cy + Math.sin(a) * R).toFixed(1)}`;
  }).join(" ");
}

type Stamp = { x: number; y: number; palette: Palette; axes: readonly Axis[]; labels: readonly string[]; language: Language; /** This cell's offset into the scene, seconds. */ phase: number };
const KOREAN_LABEL: LabelFont = { weight: 700, size: 42, family: spoqa.style.fontFamily };

// Each hexagon's values: the scene's own, or drawn per cell from its slot, following the ad's
// own logic. The recommended polygon is always near-full and even. My coverage is mostly a
// little under it, sometimes a little over, and a few items are badly short: those are the
// deficits the dots and red pills call out. One to three deficits per graph, two most often.
const DATA = [
  { id: "fixed", label: "고정" },
  { id: "random", label: "무작위" },
] as const;
type Data = (typeof DATA)[number]["id"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Standard normal from two slot draws (Box–Muller). */
const gaussian = (slot: number, salt: number) => Math.sqrt(-2 * Math.log(1 - noise(slot, salt))) * Math.cos(2 * Math.PI * noise(slot, salt + 50));

function axesFor(slot: number, data: Data): readonly Axis[] {
  if (data === "fixed") return SCENE.axes;
  // How many items are short: 1 (30%), 2 (45%) or 3 (25%); which ones, by ranking a draw per axis.
  const u = noise(slot, 9);
  const deficits = u < 0.3 ? 1 : u < 0.75 ? 2 : 3;
  const ranked = SCENE.axes.map((_, k) => k).sort((a, b) => noise(slot, 30 + a) - noise(slot, 30 + b)).slice(0, deficits);
  return SCENE.axes.map((axis, k) => {
    const recommended = clamp(0.85 + gaussian(slot, 10 + k) * 0.05, 0.7, 0.95);
    const short = ranked.includes(k);
    const mine = short
      ? clamp(recommended - (0.4 + noise(slot, 20 + k) * 0.25), 0.1, 0.5) // a clear gap, 0.4–0.65 below
      : clamp(recommended - 0.05 + gaussian(slot, 20 + k) * 0.1, recommended - 0.25, 1); // near it, a little over or under
    return { ...axis, mine, recommended };
  });
}

/** Sizes a canvas's bitmap to its CSS box at the device pixel ratio and returns its context. */
function prepare(element: HTMLCanvasElement, dpr: number) {
  element.width = Math.round(element.clientWidth * dpr);
  element.height = Math.round(element.clientHeight * dpr);
  return element.getContext("2d");
}

/**
 * One looping scene clock for the whole wall, painting every chart on the canvas each frame.
 * Holds at `start` while paused (one paint), runs at `rate` otherwise. Returns the labels' time.
 */
function useWallPainter(element: HTMLCanvasElement | null, stamps: readonly Stamp[], scale: number, start: number, paused: boolean, rate: number, latin: LatinStyle, labelled: boolean) {
  const timeRef = useRef(start);

  useEffect(() => {
    if (!element || scale <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = prepare(element, dpr);
    if (!ctx) return;
    const latinLabel: LabelFont = { weight: Math.min(latin.weight, latin.font.max), size: latin.size, family: latin.font.family };

    const n = SCENE.axes.length;
    const paint = (t: number, inUnison: boolean) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      for (const stamp of stamps) {
        const local = inUnison ? t : (t + stamp.phase) % SCENE_LENGTH;
        ctx.setTransform(scale * dpr, 0, 0, scale * dpr, Math.round(stamp.x * dpr), Math.round(stamp.y * dpr));
        drawWeb(ctx, n, local, stamp.palette);
        drawData(ctx, stamp.axes, local, stamp.palette);
        if (labelled) drawLabels(ctx, stamp.axes, stamp.labels, local, stamp.palette, stamp.language === "en" ? latinLabel : KOREAN_LABEL);
      }
    };

    if (paused) {
      timeRef.current = start;
      paint(start, true);
      // Web fonts arrive after first paint; repaint once they are in so the pills are set in them.
      let live = true;
      document.fonts.ready.then(() => {
        if (!live) return;
        forgetPills();
        paint(timeRef.current, true);
      });
      return () => {
        live = false;
      };
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      timeRef.current = (timeRef.current + delta * rate) % SCENE_LENGTH;
      paint(timeRef.current, false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [element, stamps, scale, start, paused, rate, latin, labelled]);
}

/** The empty cells as hairline outlines: one static SVG, memoised so the animation never touches it. */
const Lattice = memo(function Lattice({ cells, R, width, height }: { cells: readonly { key: string; cx: number; cy: number; filled: boolean }[]; R: number; width: number; height: number }) {
  return (
    <svg className={honey.lattice} width={width} height={height} aria-hidden="true">
      {cells.filter((cell) => !cell.filled).map((cell) => (
        <polygon key={cell.key} points={hexagonPoints(cell.cx, cell.cy, R)} className={honey.cell} />
      ))}
    </svg>
  );
});

export default function TvGridThree() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(8);
  const [density, setDensity] = useState<Density>(3);
  const [labelled, setLabelled] = useState(true);
  const [data, setData] = useState<Data>("random");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<GraphOptions>(DEFAULT_GRAPH_OPTIONS);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Cell circumradius from how many hexagon rows span the height; the lattice overruns every edge by a cell.
  const R = size.height / (1.5 * rows + 0.5);
  const scale = R / GRAPH.r;
  const { cells, graphs } = useMemo(() => {
    const cellWidth = SQRT3 * R;
    const columns = Math.ceil(size.width / cellWidth) + 2;
    const filled = DENSITIES.find((d) => d.id === density)!.filled;
    const cells = Array.from({ length: (rows + 2) * columns }, (_, index) => {
      const row = Math.floor(index / columns) - 1;
      const col = (index % columns) - 1;
      const cx = col * cellWidth + (mod(row, 2) === 1 ? cellWidth / 2 : 0);
      const cy = row * 1.5 * R + R;
      // Axial coordinates of the odd-row-shifted lattice, for the fill pattern.
      const q = col - Math.floor(row / 2);
      return { key: `${col},${row}`, slot: index, cx, cy, filled: filled(q, row) };
    });
    const graphs = cells
      .filter((cell) => cell.filled)
      .map((cell) => ({
        ...cell,
        palette: paletteFor(cell.slot, options.colour),
        language: languageFor(cell.slot, options.language),
        axes: axesFor(cell.slot, data),
        left: cell.cx - GRAPH.cx * scale,
        top: cell.cy - GRAPH.cy * scale,
      }));
    return { cells, graphs };
  }, [R, scale, size.width, rows, density, data, options.colour, options.language]);
  const stamps = useMemo<Stamp[]>(
    () =>
      graphs.map((graph) => ({
        x: graph.left,
        y: graph.top,
        palette: graph.palette,
        axes: graph.axes,
        language: graph.language,
        labels: graph.axes.map((axis) => (graph.language === "en" ? axis.en : axis.label)),
        phase: noise(graph.slot, 7) * SCENE_LENGTH,
      })),
    [graphs],
  );
  useWallPainter(canvas, stamps, scale, HELD_AT, options.paused, options.speed, options.latin, labelled);

  return (
    <main ref={field} className={styles.field}>
      {size.width > 0 && <Lattice cells={cells} R={R} width={size.width} height={size.height} />}
      <canvas ref={setCanvas} className={honey.charts} role="img" aria-label={`${SCENE.label} 벌집`} />
      {/* Each face used on the canvas must be in the DOM once, or the browser never loads it. */}
      <span className={honey.fontPrime} aria-hidden="true">
        <span className={spoqa.className}>가</span>
        {LATIN_FONTS.map((font) => (
          <span key={font.id} className={font.className}>a</span>
        ))}
      </span>
      <div className={styles.control}>
        {open && (
          <div id="tv-grid-three-layout" className={styles.panel} role="group" aria-label="벌집 벽 옵션">
            <GraphOptionsPanel options={options} onChange={setOptions} />
            <p className={styles.heading}>벌집</p>
            <div className={styles.layouts} role="group" aria-label="세로 칸 수">
              {ROW_OPTIONS.map((option) => (
                <button key={option} type="button" aria-pressed={rows === option} onClick={() => setRows(option)}>
                  {option}줄
                </button>
              ))}
            </div>
            <div className={styles.layouts} role="group" aria-label="그래프 밀도">
              {DENSITIES.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={density === id} onClick={() => setDensity(id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className={styles.heading}>데이터</p>
            <div className={styles.layouts} role="group" aria-label="그래프 값">
              {DATA.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={data === id} onClick={() => setData(id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className={styles.heading}>라벨</p>
            <div className={styles.layouts} role="group" aria-label="축 라벨">
              <button type="button" aria-pressed={labelled} onClick={() => setLabelled(true)}>있음</button>
              <button type="button" aria-pressed={!labelled} onClick={() => setLabelled(false)}>없음</button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="벌집 벽 옵션"
          aria-expanded={open}
          aria-controls="tv-grid-three-layout"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <polygon points="10,2 17,6 17,14 10,18 3,14 3,6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
