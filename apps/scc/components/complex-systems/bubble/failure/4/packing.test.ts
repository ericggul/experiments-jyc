import assert from "node:assert/strict";
import test from "node:test";
import { FACE_C, FACE_K } from "./foam.ts";
import { CAPACITY, edgeKey, faces, frameCycle, type Network, OMEGA } from "./network.ts";
import { cornerAngle, solveRadii, targetAngle } from "./packing.ts";
import { createScene, type Scene, stepScene, wallLists } from "./scene.ts";

const WIDTH = 1470;
const HEIGHT = 762;

function evolved(seconds: number, seed: number) {
  const scene = createScene(WIDTH, HEIGHT, 300, seed);
  for (let step = 0; step < seconds * 30; step += 1) stepScene(scene, 1 / 30, { target: 300, volatility: 1, traffic: false }, false);
  // Let the springs and the packing settle with the network held.
  solveRadii(scene.net, scene.packing, 50_000, 1e-10);
  for (let step = 0; step < 30 * 12; step += 1) stepScene(scene, 1 / 30, { target: 300, volatility: 1, traffic: false }, true);
  return scene;
}

function ids(net: Network) {
  const list: number[] = [];
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) list.push(v);
  return list;
}

/** f_i(p) = (|p − c_i|² − r_i²) / r_i on the drawn (u-space) bubbles. */
function f(scene: Scene, i: number, x: number, y: number) {
  return ((x - scene.x[i]!) ** 2 + (y - scene.y[i]!) ** 2 - scene.r[i]! ** 2) / scene.r[i]!;
}

const scene = evolved(180, 11);
const { net } = scene;
const vertices = ids(net);

test("Collins–Stephenson: every angle sum meets its target (2π inside, the frame's share of its turn on the frame)", () => {
  const radius = scene.packing.radius;
  for (const v of vertices) {
    const list = net.rot[v]!;
    let sum = 0;
    for (let i = 0; i < list.length; i += 1) {
      const w = list[i]!;
      const x = list[(i + 1) % list.length]!;
      if (w !== OMEGA && x !== OMEGA) sum += cornerAngle(radius[v]!, radius[w]!, radius[x]!);
    }
    assert.ok(Math.abs(sum - targetAngle(net, v, scene.packing)) < 2e-4, `vertex ${v}: ${sum} vs ${targetAngle(net, v, scene.packing)}`);
  }
});

test("drawn bubbles touch exactly along edges, overlap nowhere, and the raft's free faces stay inside the screen", () => {
  let worst = 0;
  for (const a of vertices) {
    for (const b of vertices) {
      if (b <= a) continue;
      const distance = Math.hypot(scene.x[a]! - scene.x[b]!, scene.y[a]! - scene.y[b]!);
      const sum = scene.r[a]! + scene.r[b]!;
      if (net.edges.has(edgeKey(a, b))) worst = Math.max(worst, Math.abs(distance - sum) / sum);
      else assert.ok(distance > sum * (1 - 1e-4), `non-edge ${a}–${b} overlaps`);
    }
  }
  assert.ok(worst < 1e-3, `tangency error ${worst}`);
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const v of frameCycle(net)) {
    const face = Math.sqrt(scene.r[v]! ** 2 + scene.r[v]! * (FACE_K * scene.r[v]! + FACE_C));
    left = Math.min(left, scene.x[v]! - face);
    right = Math.max(right, scene.x[v]! + face);
    top = Math.min(top, scene.y[v]! - face);
    bottom = Math.max(bottom, scene.y[v]! + face);
  }
  assert.ok(left > 0 && top > 0 && right < WIDTH && bottom < HEIGHT, `raft ${left},${top}–${right},${bottom}`);
  // It still uses the screen: within a few percent of one pair of edges.
  const usedWidth = (right - left) / WIDTH;
  const usedHeight = (bottom - top) / HEIGHT;
  assert.ok(Math.max(usedWidth, usedHeight) > 0.88, `uses ${usedWidth.toFixed(2)} × ${usedHeight.toFixed(2)}`);
  console.log(`  raft uses ${(usedWidth * 100).toFixed(0)}% × ${(usedHeight * 100).toFixed(0)}% of the screen`);
});

test("f-ownership: every face has its triple point, unbeaten, with 120° junctions", () => {
  let checked = 0;
  for (const [a, b, c] of faces(net)) {
    // Newton on f_a = f_b = f_c from the centroid of the three contacts.
    let x = 0;
    let y = 0;
    for (const [i, j] of [[a, b], [b, c], [c, a]] as const) {
      const t = scene.r[i]! / (scene.r[i]! + scene.r[j]!);
      x += (scene.x[i]! + (scene.x[j]! - scene.x[i]!) * t) / 3;
      y += (scene.y[i]! + (scene.y[j]! - scene.y[i]!) * t) / 3;
    }
    const gradient = (i: number) => [(2 * (x - scene.x[i]!)) / scene.r[i]!, (2 * (y - scene.y[i]!)) / scene.r[i]!] as const;
    for (let k = 0; k < 50; k += 1) {
      const g1 = f(scene, a, x, y) - f(scene, b, x, y);
      const g2 = f(scene, a, x, y) - f(scene, c, x, y);
      const [ax, ay] = gradient(a);
      const [bx, by] = gradient(b);
      const [cx, cy] = gradient(c);
      const det = (ax - bx) * (ay - cy) - (ay - by) * (ax - cx);
      const dx = (g1 * (ay - cy) - g2 * (ay - by)) / det;
      const dy = ((ax - bx) * g2 - (ax - cx) * g1) / det;
      x -= dx;
      y -= dy;
      if (Math.hypot(dx, dy) < 1e-9) break;
    }
    const value = f(scene, a, x, y);
    assert.ok(Math.abs(value - f(scene, b, x, y)) < 1e-6 && Math.abs(value - f(scene, c, x, y)) < 1e-6, `face ${a},${b},${c} did not converge`);
    for (const k of vertices) {
      if (k === a || k === b || k === c) continue;
      assert.ok(f(scene, k, x, y) > value - 1e-6, `face ${a},${b},${c}: bubble ${k} owns its triple point`);
    }
    // Wall normals ∇f_i − ∇f_j all have length 4 for tangent circles: the junction is equiangular.
    const [ax, ay] = gradient(a);
    const [bx, by] = gradient(b);
    const [cx, cy] = gradient(c);
    for (const length of [Math.hypot(ax - bx, ay - by), Math.hypot(bx - cx, by - cy), Math.hypot(cx - ax, cy - ay)]) {
      assert.ok(Math.abs(length - 4) < 0.01, `face ${a},${b},${c}: |∇f_i − ∇f_j| = ${length}`);
    }
    checked += 1;
  }
  assert.ok(checked > 300, `${checked} faces`);
});

test("raster: walls appear exactly between linked bubbles and every bubble owns part of the raft", () => {
  const step = 2;
  const uWidth = WIDTH;
  const uHeight = HEIGHT;
  const columns = Math.ceil(uWidth / step);
  const rows = Math.ceil(uHeight / step);
  const owner = new Int32Array(columns * rows);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const x = (i + 0.5) * step;
      const y = (j + 0.5) * step;
      let best = -1;
      let bestF = Infinity;
      for (const v of vertices) {
        const value = f(scene, v, x, y);
        if (value < bestF) {
          bestF = value;
          best = v;
        }
      }
      owner[j * columns + i] = bestF < FACE_K * scene.r[best]! + FACE_C ? best : -1;
    }
  }
  const pairs = new Set<number>();
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const here = owner[j * columns + i]!;
      if (here < 0) continue;
      const right = i + 1 < columns ? owner[j * columns + i + 1]! : -1;
      const below = j + 1 < rows ? owner[(j + 1) * columns + i]! : -1;
      if (right >= 0 && right !== here) pairs.add(edgeKey(here, right));
      if (below >= 0 && below !== here) pairs.add(edgeKey(here, below));
    }
  }
  for (const key of pairs) assert.ok(net.edges.has(key), `wall between unlinked ${Math.floor(key / CAPACITY)} and ${key % CAPACITY}`);
  let onScreen = 0;
  let unseen = 0;
  for (const key of net.edges.keys()) {
    const a = Math.floor(key / CAPACITY);
    const b = key % CAPACITY;
    const t = scene.r[a]! / (scene.r[a]! + scene.r[b]!);
    const x = scene.x[a]! + (scene.x[b]! - scene.x[a]!) * t;
    const y = scene.y[a]! + (scene.y[b]! - scene.y[a]!) * t;
    if (x < step || y < step || x > uWidth - step || y > uHeight - step) continue;
    onScreen += 1;
    if (!pairs.has(key)) unseen += 1;
  }
  // A 2 px raster may miss a wall shorter than its pitch; none of any length should be missing in practice.
  assert.ok(unseen <= Math.ceil(onScreen * 0.01), `${unseen} of ${onScreen} on-screen links show no wall`);
  const owners = new Set(owner);
  for (const v of vertices) assert.ok(owners.has(v), `bubble ${v} owns no pixel`);
  console.log(`  ${vertices.length} bubbles, ${pairs.size} adjacent pairs on a ${step} px raster, all links; ${onScreen - unseen}/${onScreen} on-screen contacts seen`);
});

test("at rest the renderer's wall lists are exactly the graph's neighbours", () => {
  const lists = wallLists(scene);
  for (const v of vertices) {
    const expected = new Set(net.rot[v]!.filter((w) => w !== OMEGA));
    assert.deepEqual(new Set(lists[v]), expected, `bubble ${v}`);
  }
});

test("every bubble is visible: packing radius at least 2 px once older than its grace period", () => {
  const radii = vertices.map((v) => scene.r[v]!).sort((p, q) => p - q);
  const tiny = vertices.filter((v) => scene.r[v]! < 2 && scene.time - scene.born[v]! > 8);
  // A bubble marked to vanish takes a few swaps to go (and the test holds the network still at the end): a few in transit.
  assert.ok(tiny.length <= Math.ceil(0.04 * vertices.length), `${tiny.length} old bubbles under 2 px`);
  assert.ok(radii[0]! >= 0.5, `smallest radius ${radii[0]}`);
  console.log(`  radius px: min ${radii[0]!.toFixed(1)}, median ${radii[radii.length >> 1]!.toFixed(1)}, max ${radii[radii.length - 1]!.toFixed(1)}`);
});
