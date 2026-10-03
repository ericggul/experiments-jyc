import assert from 'node:assert/strict';
import test from 'node:test';
import { createFlux, MAX_PACKETS, INITIAL_REST } from './flux.ts';

const edge = { id: '0-1', from: { id: 0, x: 0, y: 0 }, to: { id: 1, x: 352, y: 0 } };

function run(rate, fps, seconds = 120) {
  const flux = createFlux([edge], 84219);
  const emissions = new Map();
  let peak = 0;
  for (let frame = 0; frame <= seconds * fps; frame++) {
    const packets = flux.advance(frame / fps, rate);
    peak = Math.max(peak, packets.length);
    for (const packet of packets) emissions.set(packet.id, packet);
  }
  return { emissions: [...emissions.values()], peak };
}

test('rate controls accepted traffic, including multiple packets on the same edge', () => {
  const slow = run(0.5, 24);
  const fast = run(8, 24);
  assert.ok(fast.peak > 1);
  assert.ok(fast.emissions.length > slow.emissions.length * 12);
  assert.ok(Math.abs(fast.emissions.length / ((120 - INITIAL_REST) * 8) - 1) < 0.12);
  assert.ok(fast.peak <= MAX_PACKETS);
});

test('the seeded stochastic event sequence is independent of 24/60 Hz sampling', () => {
  const coarse = run(2.5, 24).emissions;
  const fine = run(2.5, 60).emissions;
  assert.equal(coarse.length, fine.length);
  for (let index = 0; index < coarse.length; index++) {
    assert.equal(coarse[index].from.id, fine[index].from.id);
    assert.equal(coarse[index].to.id, fine[index].to.id);
    assert.ok(Math.abs(coarse[index].start - fine[index].start) < 1e-8);
  }
});

test('changing rate immediately changes active-packet speed without resetting its position', () => {
  const flux = createFlux([edge], 84219);
  const dt = 1 / 24;
  let packet;
  let now = 0;
  for (; now < 30; now += dt) {
    packet = flux.advance(now, 0.5).find((candidate) => {
      const head = flux.sample(candidate).head;
      const distance = Math.hypot(head.x - candidate.from.x, head.y - candidate.from.y);
      return distance > 10 && distance < 100;
    });
    if (packet) break;
  }
  assert.ok(packet);
  const before = flux.sample(packet).head;
  flux.advance(now + dt, 0.5);
  const slow = flux.sample(packet).head;
  flux.advance(now + dt, 8);
  assert.deepEqual(flux.sample(packet).head, slow);
  flux.advance(now + 2 * dt, 8);
  const fast = flux.sample(packet).head;
  const slowStep = Math.hypot(slow.x - before.x, slow.y - before.y);
  const fastStep = Math.hypot(fast.x - slow.x, fast.y - slow.y);
  assert.ok(Math.abs(fastStep / slowStep - 4) < 1e-8);
});

test('long scheduling gaps remain bounded and all rendered positions stay on an edge', () => {
  const flux = createFlux([edge], 1234);
  for (let frame = 0; frame < 5000; frame++) {
    for (const packet of flux.advance(frame / 24, 8)) {
      const { head, tail } = flux.sample(packet);
      for (const point of [head, tail]) {
        assert.equal(point.y, 0);
        assert.ok(point.x >= 0 && point.x <= 352);
      }
    }
  }
  assert.ok(flux.advance(1e8, 8).length <= MAX_PACKETS);
});

const scopedEdges = [
  { id: 'within', from: { id: 'within-a', x: 0, y: 0 }, to: { id: 'within-b', x: 4, y: 0 }, scope: 'within' },
  { id: 'between', from: { id: 'between-a', x: 0, y: 4 }, to: { id: 'between-b', x: 4, y: 4 }, scope: 'between' },
];

function emittedIds(flux, rate, weights, seconds = 30, fps = 24) {
  const emitted = new Map();
  for (let frame = 0; frame <= seconds * fps; frame += 1) {
    for (const packet of flux.advance(frame / fps, rate, weights)) emitted.set(packet.id, packet.edgeId);
  }
  return [...emitted.values()];
}

test('zero scoped weights exclude only their own edge group', () => {
  const onlyBetween = emittedIds(createFlux(scopedEdges, 551, true), 8, { within: 0, between: 1 });
  const onlyWithin = emittedIds(createFlux(scopedEdges, 551, true), 8, { within: 1, between: 0 });
  assert.ok(onlyBetween.length > 0);
  assert.ok(onlyWithin.length > 0);
  assert.ok(onlyBetween.every((edgeId) => edgeId === 'between'));
  assert.ok(onlyWithin.every((edgeId) => edgeId === 'within'));
});

test('weight changes select new groups without resetting active packet positions', () => {
  const flux = createFlux(scopedEdges, 901, false);
  const beforeSwitch = new Set();
  let active;
  let now = 0;
  for (; now < 20; now += 1 / 24) {
    const packets = flux.advance(now, 8, { within: 1, between: 0 });
    for (const packet of packets) beforeSwitch.add(packet.id);
    active = packets.find((packet) => packet.edgeId === 'within' && flux.sample(packet).head.x > 0.4 && flux.sample(packet).head.x < 3.6);
    if (active) break;
  }
  assert.ok(active);
  const before = flux.sample(active).head;
  const afterSwitch = flux.advance(now + 1 / 24, 8, { within: 0, between: 1 });
  assert.ok(afterSwitch.some((packet) => packet.id === active.id));
  assert.notDeepEqual(flux.sample(active).head, before);

  const newPackets = new Map();
  for (let frame = 1; frame <= 120; frame += 1) {
    for (const packet of flux.advance(now + (frame + 1) / 24, 8, { within: 0, between: 1 })) {
      if (!beforeSwitch.has(packet.id)) newPackets.set(packet.id, packet.edgeId);
    }
  }
  assert.ok(newPackets.size > 0);
  assert.ok([...newPackets.values()].every((edgeId) => edgeId === 'between'));
});

test('zeroing both groups stops new emissions while existing packets finish', () => {
  const flux = createFlux(scopedEdges, 88, true);
  const knownIds = new Set();
  for (let frame = 0; frame <= 48; frame += 1) {
    for (const packet of flux.advance(frame / 24, 8, { within: 1, between: 1 })) knownIds.add(packet.id);
  }
  assert.ok(knownIds.size > 0);
  const survivingIds = new Set();
  for (let frame = 49; frame <= 240; frame += 1) {
    for (const packet of flux.advance(frame / 24, 8, { within: 0, between: 0 })) {
      assert.ok(knownIds.has(packet.id));
      survivingIds.add(packet.id);
    }
  }
  assert.ok(survivingIds.size > 0);
  assert.equal(flux.advance(11, 8, { within: 0, between: 0 }).length, 0);
});

test('equal edge counts follow the requested within-to-between weight ratio', () => {
  const flux = createFlux(scopedEdges, 4102, true);
  const observed = emittedIds(flux, 8, { within: 1, between: 3 }, 600);
  const within = observed.filter((edgeId) => edgeId === 'within').length;
  assert.ok(observed.length > 4_000);
  assert.ok(Math.abs(within / observed.length - 0.25) < 0.025);
});
