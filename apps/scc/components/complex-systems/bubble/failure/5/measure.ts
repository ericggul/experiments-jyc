// Measurements for docs/experiments/complex-systems/bubble/5.md, in Node:
//   node measure.ts steady      – the GPU frame (passes.ts) at 1470 × 762 CSS px, 60 s
//   node measure.ts coarsening  – the CPU replica without division: ⟨A⟩ ∝ t^α
//   node measure.ts jitter      – wall motion per frame, raw lattice vs displayed labels
// Nothing imports this file; it only reads the route's own modules.

import { createGpuWorld, gpuFrame, labelPass, type GpuWorld } from "./passes.ts";
import {
  contactGraph,
  createReplica,
  DEFAULT_FOAM,
  edgeBubbles,
  SCALE,
  seedFoam,
  SITES_PER_SEED,
  stepReplica,
  type Lattice,
} from "./potts.ts";

const FPS = 60;
/** Overrides for scans: TEMPERATURE, DIFFUSION, SPLIT (CSS px²), LABEL_SECONDS. */
const environment = (name: string) => (process.env[name] === undefined ? undefined : Number(process.env[name]));
const PARAMETERS = {
  ...DEFAULT_FOAM,
  ...(environment("TEMPERATURE") === undefined ? {} : { temperature: environment("TEMPERATURE")! }),
  ...(environment("DIFFUSION") === undefined ? {} : { diffusion: environment("DIFFUSION")! }),
  ...(environment("SPLIT") === undefined ? {} : { splitArea: environment("SPLIT")! * SCALE * SCALE }),
};
const LABEL_SECONDS = environment("LABEL_SECONDS") ?? 0.3;

function generator(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function percentile(sorted: number[], share: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
}

/** Side counts of inner bubbles, counting a contact only if it spans at least `least` wall-site pairs. */
function sides(lattice: Lattice, least: number) {
  const { width, height, ids } = lattice;
  const pairs = new Map<string, number>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = ids[y * width + x]!;
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        if (x + dx >= width || y + dy >= height) continue;
        const other = ids[(y + dy) * width + x + dx]!;
        if (other === id) continue;
        const key = id < other ? `${id},${other}` : `${other},${id}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  const degree = new Map<number, number>();
  for (const [key, count] of pairs) {
    if (count < least) continue;
    for (const id of key.split(",").map(Number)) degree.set(id, (degree.get(id) ?? 0) + 1);
  }
  const edge = edgeBubbles(lattice);
  const counts: number[] = [];
  for (const id of contactGraph(lattice).keys()) if (!edge.has(id)) counts.push(degree.get(id) ?? 0);
  return counts;
}

const asLattice = (world: GpuWorld): Lattice => ({ width: world.width, height: world.height, ids: Int32Array.from(world.lattice) });

function steady() {
  const width = Math.round((environment("WIDTH") ?? 1470) * SCALE);
  const height = Math.round((environment("HEIGHT") ?? 762) * SCALE);
  const random = generator(11);
  const world = createGpuWorld(seedFoam(width, height, Math.round((width * height) / SITES_PER_SEED), random));
  const seconds = 60;
  let previous = new Set(world.lattice);
  let births = 0;
  let deaths = 0;
  let flips = 0;
  const counts: number[] = [];
  const started = performance.now();
  for (let frame = 1; frame <= seconds * FPS; frame += 1) {
    const before = world.lattice.slice();
    gpuFrame(world, PARAMETERS, 1 / FPS);
    const now = new Set(world.lattice);
    if (frame > 20 * FPS) {
      for (const id of now) if (!previous.has(id)) births += 1;
      for (const id of previous) if (!now.has(id)) deaths += 1;
      for (let at = 0; at < before.length; at += 1) if (before[at] !== world.lattice[at]) flips += 1;
      counts.push(now.size);
    }
    previous = now;
  }
  const lattice = asLattice(world);
  const areas = [...contactGraph(lattice).keys()].map((id) => world.sums[0][id * 4]! / (SCALE * SCALE)).sort((a, b) => a - b);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const window = seconds - 20;
  console.log(`steady (GPU frame, ${width} × ${height} sites, defaults, last ${window} s of ${seconds} s)`);
  console.log(`  bubbles: mean ${mean(counts).toFixed(0)}, range ${Math.min(...counts)}–${Math.max(...counts)}`);
  console.log(`  births ${(births / window).toFixed(1)}/s, vanishings ${(deaths / window).toFixed(1)}/s`);
  console.log(`  sides of inner bubbles (any contact): ${mean(sides(lattice, 1)).toFixed(2)}; (contacts ≥ 3 pairs): ${mean(sides(lattice, 3)).toFixed(2)}`);
  console.log(`  area (CSS px²) 10/50/90 %: ${percentile(areas, 0.1).toFixed(0)} / ${percentile(areas, 0.5).toFixed(0)} / ${percentile(areas, 0.9).toFixed(0)}, largest ${areas.at(-1)!.toFixed(0)}`);
  console.log(`  site changes per site per frame: ${(flips / (window * FPS) / (width * height)).toFixed(4)}`);
  console.log(`  total gas / lattice: ${(world.totals[0]! / (width * height)).toFixed(4)}`);
  console.log(`  Node time per frame: ${((performance.now() - started) / (seconds * FPS)).toFixed(1)} ms`);
}

function coarsening() {
  const width = 368;
  const height = 190;
  const world = createReplica(width, height, Math.round((width * height) / 120), generator(5));
  const parameters = { ...PARAMETERS, splitArea: Infinity };
  const samples: [number, number][] = [];
  for (let frame = 1; frame <= 90 * FPS; frame += 1) {
    stepReplica(world, parameters, 1 / FPS);
    if (frame % (5 * FPS) === 0) {
      const count = contactGraph(world.lattice).size;
      samples.push([frame / FPS, (width * height) / count]);
    }
  }
  console.log(`coarsening (CPU replica, ${width} × ${height} sites, no division, defaults)`);
  console.log(`  t (s) → mean area (sites): ${samples.map(([t, a]) => `${t}:${a.toFixed(0)}`).join("  ")}`);
  const late = samples.filter(([t]) => t >= 30);
  const xs = late.map(([t]) => Math.log(t));
  const ys = late.map(([, a]) => Math.log(a));
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  // Against time since an effective origin: ⟨A⟩ − A₀ ∝ (t)^α with A₀ the first sample.
  const a0 = samples[0]![1];
  const shifted = late.map(([t, a]) => [Math.log(t), Math.log(Math.max(a - a0, 1))] as const);
  const sx = shifted.reduce((s, [x]) => s + x, 0) / shifted.length;
  const sy = shifted.reduce((s, [, y]) => s + y, 0) / shifted.length;
  const shiftedSlope = shifted.reduce((s, [x, y]) => s + (x - sx) * (y - sy), 0) / shifted.reduce((s, [x]) => s + (x - sx) ** 2, 0);
  console.log(`  log-log slope of ⟨A⟩ for t ≥ 30 s: ${slope.toFixed(2)}; of ⟨A⟩ − A(5 s): ${shiftedSlope.toFixed(2)}`);
}

/**
 * Wall motion per frame: between horizontally adjacent sites whose leading
 * ids differ, the wall sits where wA − wB changes sign; its sub-site
 * position is followed from frame to frame (CSS px), on the raw lattice
 * (labels taken whole each frame) and on the displayed labels (eased).
 */
function jitter() {
  const width = 240;
  const height = 160;
  const world = createGpuWorld(seedFoam(width, height, Math.round((width * height) / SITES_PER_SEED), generator(3)));
  for (let frame = 0; frame < 10 * FPS; frame += 1) gpuFrame(world, PARAMETERS, 1 / FPS);
  const raw = new Float32Array(width * height * 4);
  const shown = new Float32Array(width * height * 4);
  const sigma = 0.95 + 0.3;
  labelPass(world, raw, 1, sigma);
  labelPass(world, shown, 1, sigma);
  const blend = 1 - Math.exp(-1 / FPS / LABEL_SECONDS);
  const weightOf = (labels: Float32Array, at: number, id: number) => (labels[at * 4] === id ? labels[at * 4 + 1]! : labels[at * 4 + 2] === id ? labels[at * 4 + 3]! : 0);
  const crossings = (labels: Float32Array) => {
    const found = new Map<string, number>();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x + 1 < width; x += 1) {
        const at = y * width + x;
        const a = labels[at * 4]!;
        const b = labels[(at + 1) * 4]!;
        if (a === b) continue;
        const left = weightOf(labels, at, a) - weightOf(labels, at, b);
        const right = weightOf(labels, at + 1, a) - weightOf(labels, at + 1, b);
        if (left <= 0 || right >= 0) continue;
        found.set(`${y},${x},${a},${b}`, left / (left - right));
      }
    }
    return found;
  };
  const moves = { raw: [] as number[], shown: [] as number[] };
  let previous = { raw: crossings(raw), shown: crossings(shown) };
  for (let frame = 0; frame < 4 * FPS; frame += 1) {
    gpuFrame(world, PARAMETERS, 1 / FPS);
    labelPass(world, raw, 1, sigma);
    labelPass(world, shown, blend, sigma);
    const next = { raw: crossings(raw), shown: crossings(shown) };
    for (const kind of ["raw", "shown"] as const) {
      for (const [key, position] of next[kind]) {
        const before = previous[kind].get(key);
        if (before !== undefined) moves[kind].push(Math.abs(position - before) / SCALE);
      }
    }
    previous = next;
  }
  console.log(`wall motion per frame (GPU frame, ${width} × ${height} sites, CSS px, persisting crossings)`);
  for (const kind of ["raw", "shown"] as const) {
    const sorted = moves[kind].sort((a, b) => a - b);
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    console.log(`  ${kind === "raw" ? "raw lattice " : "displayed   "}: mean ${mean.toFixed(3)}, median ${percentile(sorted, 0.5).toFixed(3)}, 99 % ${percentile(sorted, 0.99).toFixed(3)}, n ${sorted.length}`);
  }
}

const runs: Record<string, () => void> = { steady, coarsening, jitter };
const chosen = process.argv[2] ?? "";
if (chosen in runs) runs[chosen]!();
else console.log(`usage: node measure.ts ${Object.keys(runs).join(" | ")}`);
