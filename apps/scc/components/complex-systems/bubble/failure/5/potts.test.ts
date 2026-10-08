import assert from "node:assert/strict";
import test from "node:test";
import { createGpuWorld, gpuFrame, labelPass } from "./passes.ts";
import {
  chordOffset,
  classOrder,
  contactGraph,
  COPY_OFFSETS,
  countAreas,
  createBubbles,
  COVERAGE,
  createReplica,
  DEFAULT_FOAM,
  deltaH,
  edgeBubbles,
  energy,
  gasLoss,
  MAX_IDS,
  MEDIUM,
  parentOf,
  partnerOf,
  random3,
  rotationFor,
  seedFoam,
  SITES_PER_SEED,
  SLOTS,
  stepReplica,
  WALL_OFFSETS,
  wallPairs,
  type Lattice,
} from "./potts.ts";

function generator(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

test("the local energy change equals the change of the whole Hamiltonian, edges included", () => {
  const random = generator(1);
  const width = 11;
  const height = 9;
  const lattice: Lattice = { width, height, ids: new Int32Array(width * height) };
  for (let at = 0; at < lattice.ids.length; at += 1) lattice.ids[at] = 1 + Math.floor(random() * 5);
  const bubbles = createBubbles();
  for (let id = 1; id <= 5; id += 1) bubbles.target[id] = 4 + random() * 30;
  const stiffness = 7;
  for (let trial = 0; trial < 400; trial += 1) {
    countAreas(lattice, bubbles);
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const next = 1 + Math.floor(random() * 5);
    if (next === lattice.ids[y * width + x]) continue;
    const predicted = deltaH(lattice, bubbles, x, y, next, stiffness);
    const before = energy(lattice, bubbles, stiffness);
    lattice.ids[y * width + x] = next;
    const after = energy(lattice, bubbles, stiffness);
    assert.ok(Math.abs(after - before - predicted) < 1e-9, `trial ${trial}: ${after - before} vs ${predicted}`);
  }
});

test("sites of one sublattice class never reach each other, so a pass is exact", () => {
  for (const [dx, dy] of [...WALL_OFFSETS, ...COPY_OFFSETS]) {
    assert.ok(Math.abs(dx) < 3 && Math.abs(dy) < 3, `offset ${dx},${dy} reaches past a class`);
  }
  assert.equal(WALL_OFFSETS.length, 20);
  for (let sweep = 0; sweep < 50; sweep += 1) {
    assert.deepEqual([...classOrder(sweep)].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  }
});

test("random values are in [0, 1) and spread evenly", () => {
  let sum = 0;
  for (let index = 0; index < 20_000; index += 1) {
    const value = random3(index % 97, Math.floor(index / 97), 12_345);
    assert.ok(value >= 0 && value < 1);
    sum += value;
  }
  assert.ok(Math.abs(sum / 20_000 - 0.5) < 0.01);
});

test("slot pairing is a bijection that never pairs a slot with itself", () => {
  for (const frame of [0, 1, 17, 999]) {
    const offset = rotationFor(frame);
    assert.ok(offset >= 1 && offset < SLOTS);
    const seen = new Set<number>();
    for (let id = 1; id < MAX_IDS; id += 1) {
      const partner = partnerOf(id, offset);
      assert.ok(partner >= 1 && partner < MAX_IDS && partner !== id);
      assert.equal(parentOf(partner, offset), id);
      seen.add(partner);
    }
    assert.equal(seen.size, SLOTS);
  }
});

test("a division chord cuts off the child's share of a disc", () => {
  for (const share of [0.15, 0.25, 0.4, 0.5]) {
    const h = chordOffset(share);
    let inside = 0;
    let beyond = 0;
    const steps = 800;
    for (let i = 0; i < steps; i += 1) {
      for (let j = 0; j < steps; j += 1) {
        const x = -1 + (2 * (i + 0.5)) / steps;
        const y = -1 + (2 * (j + 0.5)) / steps;
        if (x * x + y * y > 1) continue;
        inside += 1;
        if (x > h) beyond += 1;
      }
    }
    assert.ok(Math.abs(beyond / inside - share) < 0.005, `share ${share}: ${beyond / inside}`);
  }
});

test("gas crossing a wall leaves one bubble exactly as it enters the other", () => {
  const random = generator(9);
  const world = createReplica(60, 40, 14, random);
  for (let frame = 0; frame < 30; frame += 1) stepReplica(world, DEFAULT_FOAM, 1 / 60);
  const pairs = wallPairs(world.lattice, world.bubbles);
  const loss = gasLoss(world.lattice, world.bubbles, pairs, DEFAULT_FOAM.stiffness, 0.5);
  let net = 0;
  let moved = 0;
  for (let id = 1; id < MAX_IDS; id += 1) {
    net += loss[id]!;
    moved += Math.abs(loss[id]!);
  }
  assert.ok(moved > 0);
  assert.ok(Math.abs(net) < 1e-9 * moved);
});

test("the replica raft has six sides on average inside and keeps its gas at its share of the screen", () => {
  const world = createReplica(160, 110, Math.round((160 * 110) / SITES_PER_SEED), generator(4));
  for (let frame = 0; frame < 360; frame += 1) stepReplica(world, DEFAULT_FOAM, 1 / 60);
  const graph = contactGraph(world.lattice);
  const edge = edgeBubbles(world.lattice);
  const counts = [...graph].filter(([id]) => !edge.has(id)).map(([, neighbours]) => neighbours.size);
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  assert.ok(Math.abs(mean - 6) < 0.4, `mean sides ${mean}`);
  assert.ok(Math.abs(world.totalGas / (COVERAGE * 160 * 110) - 1) < 0.01, `gas ${world.totalGas}`);
});

test("the GPU frame never leaves a site with a dead id, blows a tapped bubble once, and keeps its count", () => {
  const width = 120;
  const height = 80;
  const foam = seedFoam(width, height, Math.round((width * height) / SITES_PER_SEED), generator(2));
  const world = createGpuWorld(foam);
  const initial = new Set(world.lattice).size - 1;
  const radius = 7;
  for (let frame = 1; frame <= 420; frame += 1) {
    const request = frame >= 100 && frame < 110 ? ([60.4, 40.6, radius, 1] as const) : ([0, 0, 0, 0] as const);
    gpuFrame(world, DEFAULT_FOAM, 1 / 60, request);
    for (const id of new Set(world.lattice)) if (id !== MEDIUM) assert.ok(world.state[0][id * 4 + 1]! > 0, `frame ${frame}: id ${id} has no state`);
    if (frame === 111) {
      const blown: number[] = [];
      for (let id = 1; id < MAX_IDS; id += 1) if (world.state[1][id * 4] === 1) blown.push(id);
      assert.equal(blown.length, 1, "one bubble carries the tap's serial");
      const sites = world.lattice.filter((id) => id === blown[0]).length;
      assert.ok(Math.abs(sites - Math.PI * radius * radius) < 0.25 * Math.PI * radius * radius, `blown bubble holds ${sites} sites`);
    }
  }
  const final = new Set(world.lattice).size - 1;
  assert.ok(final > 0.5 * initial && final < 1.6 * initial, `${initial} → ${final} bubbles`);
  assert.ok(Math.abs(world.totals[0]! / (COVERAGE * width * height) - 1) < 0.02, `gas ${world.totals[0]}`);
});

test("displayed labels ease toward the lattice and hold weights in [0, 1]", () => {
  const world = createGpuWorld(seedFoam(40, 30, 6, generator(8)));
  const labels = new Float32Array(40 * 30 * 4);
  labelPass(world, labels, 1, 1.2);
  let own = 0;
  for (let at = 0; at < 40 * 30; at += 1) {
    if (labels[at * 4] === world.lattice[at]! + 1) own += 1;
    assert.ok(labels[at * 4 + 1]! >= 0.2 && labels[at * 4 + 1]! <= 1 + 1e-6);
    assert.ok(labels[at * 4 + 3]! <= labels[at * 4 + 1]!);
  }
  assert.ok(own > 0.95 * 40 * 30, "taken whole, the leading label is almost always the site's own id");
  // A site changes owner: its weight moves only by the blend per frame.
  const at = 15 * 40 + 20;
  const before = labels[at * 4 + 1]!;
  const original = world.lattice[at]!;
  for (let y = 12; y <= 18; y += 1) for (let x = 17; x <= 23; x += 1) world.lattice[y * 40 + x] = original === 1 ? 2 : 1;
  labelPass(world, labels, 0.1, 1.2);
  const kept = labels[at * 4] === original + 1 ? labels[at * 4 + 1]! : labels[at * 4 + 3]!;
  assert.ok(Math.abs(kept - before * 0.9) < 0.02, `weight ${kept} from ${before}`);
});
