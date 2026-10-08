import assert from "node:assert/strict";
import test from "node:test";
import {
  canContract,
  canFlip,
  CAPACITY,
  contract,
  createNetwork,
  DEFAULT_PARAMETERS,
  degree,
  faces,
  flip,
  growInto,
  MAX_DEGREE,
  type Network,
  OMEGA,
  stepNetwork,
  validate,
  vanishStep,
} from "./network.ts";

function alive(net: Network) {
  const list: number[] = [];
  for (let v = 1; v < CAPACITY; v += 1) if (net.alive[v]) list.push(v);
  return list;
}

test("the lattice seed is a valid triangulated rectangle with a straight frame", () => {
  const net = createNetwork(1, 300, 1470 / 762);
  assert.deepEqual(validate(net), []);
  assert.ok(net.size > 200 && net.size < 420, `size ${net.size}`);
});

test("random flips, contractions, vanishings and insertions keep the triangulation valid", () => {
  const net = createNetwork(2, 160);
  let random = 7;
  const next = () => {
    random = (random * 1_103_515_245 + 12_345) % 2 ** 31;
    return random / 2 ** 31;
  };
  const done = { flip: 0, contract: 0, vanish: 0, grow: 0 };
  for (let round = 0; round < 3_000; round += 1) {
    const vertices = alive(net);
    const v = vertices[Math.floor(next() * vertices.length)]!;
    const neighbours = net.rot[v]!.filter((w) => w !== OMEGA);
    const w = neighbours[Math.floor(next() * neighbours.length)]!;
    const choice = next();
    if (choice < 0.35) {
      if (canFlip(net, v, w)) {
        flip(net, v, w);
        done.flip += 1;
      }
    } else if (choice < 0.55) {
      if (canContract(net, v, w)) {
        contract(net, v, w);
        done.contract += 1;
      }
    } else if (choice < 0.75) {
      if (vanishStep(net, v)) done.vanish += 1;
    } else {
      const list = faces(net);
      if (growInto(net, list[Math.floor(next() * list.length)]!)) done.grow += 1;
    }
    const problems = validate(net);
    assert.deepEqual(problems, [], `round ${round}: ${problems.slice(0, 3).join("; ")}`);
  }
  for (const count of Object.values(done)) assert.ok(count > 50, JSON.stringify(done));
});

test("ten minutes of dynamics: valid, near the target size, every kind of event, a broad degree distribution", () => {
  const net = createNetwork(3, DEFAULT_PARAMETERS.target);
  const counts = { birth: 0, merge: 0, vanish: 0, flip: 0 };
  // Without a packing, mark degree-3 vertices as squeezed now and then so the vanishing path runs.
  const small = new Uint8Array(CAPACITY);
  for (let step = 0; step < 600 * 30; step += 1) {
    if (step % 30 === 0) for (let v = 1; v < CAPACITY; v += 1) small[v] = net.alive[v] && degree(net, v) === 3 && (v + step) % 97 === 0 ? 1 : 0;
    for (const event of stepNetwork(net, 1 / 30, DEFAULT_PARAMETERS, undefined, small)) counts[event.kind] += 1;
    if (step % 300 === 0) assert.deepEqual(validate(net), []);
  }
  assert.deepEqual(validate(net), []);
  const target = DEFAULT_PARAMETERS.target;
  assert.ok(net.size > 0.6 * target && net.size < 1.3 * target, `size ${net.size} for target ${target}`);
  for (const [kind, count] of Object.entries(counts)) assert.ok(count > 10, `${kind}: ${count}`);
  const degrees = alive(net).map((v) => degree(net, v));
  const largest = Math.max(...degrees);
  assert.ok(largest >= 10 && largest <= MAX_DEGREE, `largest degree ${largest}`);
  // Interior mean degree of a triangulated disc is just under 6.
  const mean = degrees.reduce((sum, d) => sum + d, 0) / degrees.length;
  assert.ok(mean > 5 && mean < 6, `mean degree ${mean}`);
  console.log(`  10 min: size ${net.size}, events ${JSON.stringify(counts)}, degree max ${largest}, mean ${mean.toFixed(2)}`);
});

test("flux is normalised to a mean of 1 and films stay within [0, 1]", () => {
  const net = createNetwork(4, 200);
  for (let step = 0; step < 600; step += 1) stepNetwork(net, 1 / 30, DEFAULT_PARAMETERS);
  let sum = 0;
  for (const edge of net.edges.values()) {
    sum += edge.flux;
    assert.ok(edge.film >= 0 && edge.film <= 1);
  }
  assert.ok(Math.abs(sum / net.edges.size - 1) < 1e-9);
  let rank = 0;
  for (const v of alive(net)) rank += net.rank[v]!;
  assert.ok(Math.abs(rank - 1) < 1e-6, `rank sums to ${rank}`);
});
