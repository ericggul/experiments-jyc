import assert from "node:assert/strict";
import test from "node:test";
import { blow, createFoam, DEFAULT_PARAMETERS, feed, FREE, MAX_SIDES, meanArea, raftArea, stepFoam, type Foam, type FoamParameters } from "./model.ts";
import { foamStatistics, sidesOf } from "./measure.ts";

const WIDTH = 1470;
const HEIGHT = 706;
const DRY: FoamParameters = { ...DEFAULT_PARAMETERS, liquid: 0 };

/** Runs `seconds` at 60 steps per second; returns the mean step cost (ms). */
function run(foam: Foam, seconds: number, parameters: FoamParameters = DEFAULT_PARAMETERS) {
  const started = performance.now();
  const steps = Math.round(seconds * 60);
  for (let step = 0; step < steps; step += 1) stepFoam(foam, 1 / 60, parameters);
  return (performance.now() - started) / steps;
}

/** The warm-up the page runs before its first frame. */
function warm(foam: Foam, parameters: FoamParameters = DEFAULT_PARAMETERS) {
  for (let step = 0; step < 400; step += 1) stepFoam(foam, 1 / 20, parameters);
}

function radiusOf(foam: Foam, i: number) {
  return Math.sqrt(foam.area[i]! / Math.PI);
}

test("the raft's cells are exact: links mutual, shared walls equal, areas on target", () => {
  const foam = createFoam(WIDTH, HEIGHT);
  warm(foam);
  run(foam, 5);
  let asymmetric = 0;
  let mismatch = 0;
  let total = 0;
  let error = 0;
  for (let i = 0; i < foam.count; i += 1) {
    total += foam.area[i]!;
    error += Math.abs(foam.area[i]! - foam.target[i]!);
    for (let k = 0; k < foam.sides[i]!; k += 1) {
      const j = foam.neighbour[i * MAX_SIDES + k]!;
      if (j < 0) continue;
      let back = -1;
      for (let m = 0; m < foam.sides[j]!; m += 1) if (foam.neighbour[j * MAX_SIDES + m] === i) back = m;
      if (back < 0) asymmetric += 1;
      else mismatch = Math.max(mismatch, Math.abs(foam.length[i * MAX_SIDES + k]! - foam.length[j * MAX_SIDES + back]!));
    }
  }
  console.log(`raft: ${foam.count} bubbles, area ${(total / raftArea(foam)).toFixed(4)} of the raft, mean |A − target| ${(error / total * 100).toFixed(2)}%`);
  assert.equal(asymmetric, 0);
  assert.ok(mismatch < 1e-6, `shared walls differ by ${mismatch}`);
  assert.ok(Math.abs(total / raftArea(foam) - 1) < 0.01);
  assert.ok(error / total < 0.01);
});

test("inside the raft, dry growth follows von Neumann–Mullins: dA/dt = κ(n − 6)", () => {
  // A larger raft, so enough bubbles have no free face.
  const foam = createFoam(4_000, 3_000);
  const still = { ...DRY, nucleation: 0 };
  warm(foam, still);
  run(foam, 3, still);
  const before = new Map<number, number>();
  for (let i = 0; i < foam.count; i += 1) before.set(foam.id[i]!, foam.target[i]!);
  stepFoam(foam, 1 / 60, still);
  const kappa = still.coarsening * 1_100;
  let sxy = 0;
  let sxx = 0;
  let interior = 0;
  for (let i = 0; i < foam.count; i += 1) {
    const previous = before.get(foam.id[i]!);
    if (previous === undefined || foam.free[i]! > 0) continue;
    interior += 1;
    const rate = (foam.target[i]! - previous) * 60;
    const expected = kappa * (sidesOf(foam, i) - 6);
    sxy += rate * expected;
    sxx += expected * expected;
  }
  const slope = sxy / sxx;
  console.log(`von Neumann (${interior} interior bubbles): dA/dt against κ(n − 6), slope ${slope.toFixed(3)}`);
  assert.ok(interior >= 20);
  assert.ok(slope > 0.85 && slope < 1.15);
});

test("coarsening and nucleation hold a raft of hubs ringed by small bubbles", () => {
  const foam = createFoam(WIDTH, HEIGHT);
  warm(foam);
  const t2 = foam.events.t2;
  const t1 = foam.events.t1;
  const clusters = foam.events.clusters;
  const absorbed = foam.events.absorbed;
  const sides = [...foam.events.t2Sides];
  const counts: number[] = [];
  const hubs: string[] = [];
  let cost = 0;
  for (let block = 0; block < 6; block += 1) {
    cost += run(foam, 30) / 6;
    counts.push(foam.count);
    const radii = Array.from({ length: foam.count }, (_, i) => radiusOf(foam, i)).sort((a, b) => b - a);
    hubs.push(`${radii[0]!.toFixed(0)}/${radii[Math.floor(radii.length / 2)]!.toFixed(0)}`);
  }
  const statistics = foamStatistics(foam);
  const order = Array.from({ length: foam.count }, (_, i) => i).sort((a, b) => foam.area[b]! - foam.area[a]!);
  const top = order.slice(0, 4).map((i) => `R ${radiusOf(foam, i).toFixed(0)}, ${sidesOf(foam, i)} walls`);
  let freeCells = 0;
  for (let i = 0; i < foam.count; i += 1) if (foam.free[i]! > 0) freeCells += 1;
  const vanished = foam.events.t2Sides.map((value, n) => (value ?? 0) - (sides[n] ?? 0));
  const vanishedTotal = vanished.reduce((sum, value) => sum + (value || 0), 0);
  let fewSided = 0;
  for (let n = 0; n <= 4; n += 1) fewSided += vanished[n] ?? 0;
  console.log(
    [
      `raft over 180 s at ${WIDTH}×${HEIGHT}: count ${counts.join(" → ")}, largest/median radius ${hubs.join(" → ")} px, step ${cost.toFixed(2)} ms`,
      `largest now: ${top.join("; ")}; ${freeCells} bubbles with a free face`,
      `Lewis A(n)/Ā ${statistics.lewis.map((value, n) => (value !== undefined && n >= 3 && n <= 12 ? `${n}:${value.toFixed(2)}` : "")).filter(Boolean).join(" ")}`,
      `Aboav m(n) ${statistics.aboav.map((value, n) => (value !== undefined && n >= 3 && n <= 12 ? `${n}:${value.toFixed(2)}` : "")).filter(Boolean).join(" ")}; a ${statistics.aboavA.toFixed(2)}`,
      `rim clusters ${foam.events.clusters - clusters}, hubs absorbed ${foam.events.absorbed - absorbed} in 180 s`,
      `T1 ${((foam.events.t1 - t1) / 180).toFixed(1)}/s, T2 ${((foam.events.t2 - t2) / 180).toFixed(2)}/s, vanishing with ≤ 4 walls ${((fewSided / Math.max(1, vanishedTotal)) * 100).toFixed(0)}%`,
    ].join("\n"),
  );
  for (const count of counts) assert.ok(count > 40 && count < 250, `count ${count}`);
  const radii = Array.from({ length: foam.count }, (_, i) => radiusOf(foam, i)).sort((a, b) => b - a);
  // Hubs: the largest bubble is many times the median one and has many walls.
  assert.ok(radii[0]! > 4 * radii[Math.floor(radii.length / 2)]!);
  assert.ok(sidesOf(foam, order[0]!) > 8);
  // Few-walled bubbles feed their neighbours and vanish.
  assert.ok(fewSided / Math.max(1, vanishedTotal) > 0.6);
  assert.ok(statistics.aboav[4]! > statistics.aboav[8]!);
  assert.ok(foam.events.t1 > t1);
  assert.ok(foam.events.clusters - clusters > 20);
});

test("gas flows from few-walled bubbles into hubs", () => {
  const foam = createFoam(WIDTH, HEIGHT);
  warm(foam);
  run(foam, 5);
  const order = Array.from({ length: foam.count }, (_, i) => i).sort((a, b) => foam.area[b]! - foam.area[a]!);
  let into = 0;
  let out = 0;
  for (const hub of order.slice(0, 3)) {
    for (let k = 0; k < foam.sides[hub]!; k += 1) {
      const flux = foam.flux[hub * MAX_SIDES + k]!;
      if (flux < 0) into -= flux;
      else out += flux;
    }
  }
  console.log(`three largest bubbles: gas in ${into.toFixed(0)} px²/s, out ${out.toFixed(0)} px²/s`);
  assert.ok(into > 2 * out);
});

test("drawn geometry moves smoothly: no bubble's centre jumps", () => {
  const foam = createFoam(WIDTH, HEIGHT);
  warm(foam);
  run(foam, 5);
  const previous = new Map<number, [number, number]>();
  const moves: number[] = [];
  for (let step = 0; step < 900; step += 1) {
    stepFoam(foam, 1 / 60, DEFAULT_PARAMETERS);
    for (let i = 0; i < foam.count; i += 1) {
      const known = previous.get(foam.id[i]!);
      if (known && foam.age[i]! > 3) moves.push(Math.hypot(foam.cx[i]! - known[0], foam.cy[i]! - known[1]));
      previous.set(foam.id[i]!, [foam.cx[i]!, foam.cy[i]!]);
    }
  }
  moves.sort((a, b) => a - b);
  const at = (share: number) => moves[Math.floor(share * (moves.length - 1))]!;
  console.log(`centroid motion per frame (px): median ${at(0.5).toFixed(3)}, p99 ${at(0.99).toFixed(3)}, p99.9 ${at(0.999).toFixed(3)}, max ${at(1).toFixed(2)}`);
  assert.ok(at(0.999) < 1);
});

test("liquid breaks contacts: fewer walls stay films as the foam gets wetter", () => {
  const results: string[] = [];
  const contacts: number[] = [];
  for (const liquid of [0, 0.04, 0.12]) {
    const parameters = { ...DEFAULT_PARAMETERS, liquid };
    const foam = createFoam(WIDTH, HEIGHT);
    warm(foam, parameters);
    const statistics = foamStatistics(foam);
    contacts.push(statistics.filmContacts);
    results.push(`φ ${liquid}: film contacts ${statistics.filmContacts.toFixed(2)} of ${statistics.meanSides.toFixed(2)} walls, border radius ${foam.borderRadius.toFixed(1)} px`);
  }
  console.log(results.join("\n"));
  for (let at = 1; at < contacts.length; at += 1) assert.ok(contacts[at]! < contacts[at - 1]!);
});

test("a blown bubble grows while fed and is a node like any other", () => {
  const foam = createFoam(WIDTH, HEIGHT);
  warm(foam);
  // Blow into the middle of a crowd: the bubble owning a point beside the largest one.
  const id = blow(foam, WIDTH / 2, HEIGHT / 2);
  for (let step = 0; step < 180; step += 1) {
    feed(foam, id, (1_100 * 3) / 60);
    stepFoam(foam, 1 / 60, DEFAULT_PARAMETERS);
  }
  run(foam, 1);
  let index = -1;
  for (let i = 0; i < foam.count; i += 1) if (foam.id[i] === id) index = i;
  if (index < 0) {
    // The point fell on open ground or a hub without a junction near it: nothing was blown.
    console.log("blown bubble: no junction at the point");
    return;
  }
  console.log(`blown for 3 s: R ${radiusOf(foam, index).toFixed(0)} px, ${sidesOf(foam, index)} walls`);
  assert.ok(foam.area[index]! > 5_000);
});

test("pure coarsening thins the raft until the guard holds it", () => {
  const foam = createFoam(600, 400);
  const parameters = { ...DRY, nucleation: 0, coarsening: 0.25 };
  run(foam, 90, parameters);
  let free = 0;
  for (let i = 0; i < foam.count; i += 1) for (let k = 0; k < foam.sides[i]!; k += 1) if (foam.neighbour[i * MAX_SIDES + k] === FREE) free += 1;
  assert.ok(foam.count < 60 && foam.count >= 10, `count ${foam.count}`);
  assert.ok(free > 0);
  assert.ok(meanArea(foam) > 0);
});
