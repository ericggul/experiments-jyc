import assert from 'node:assert/strict';
import test from 'node:test';
import { createSociety, effective, effectiveCross, step, type Partner, type Society } from './society.ts';
import { relax } from './layout.ts';

const nodes = new Map(Array.from({ length: 20 }, (_, i) => [100 + i, 1]));
const near: Partner = { window: 1, nodes, strength: 1 };
const far: Partner = { ...near, strength: 0 };
const run = (s: Society, seconds: number, partners: Partner[], turnover = 0.002, width = 500, height = 400) => {
  for (let t = 0; t < seconds * 30; t++) { step(s, 1 / 30, partners, turnover, width, height); relax(s, width, height, partners, () => ({ x: 1, y: 0 }), 1 / 30); }
};

test('replays exactly from the same seed', () => {
  const once = () => { const s = createSociety(30, 7, 500, 400); run(s, 40, [near]); return JSON.stringify([[...s.ties.entries()], [...s.cross.keys()], [...s.people.keys()]]); };
  assert.equal(once(), once());
});

test('the network grows sparse clustered structure and turnover replaces people', () => {
  const s = createSociety(40, 3, 500, 400);
  run(s, 240, [], 0.004);
  assert.ok(s.nextId > 40, 'someone left and a newcomer arrived');
  const strong = [...s.ties.values()].filter((tie) => effective(s, tie) > 0.2).length;
  const degree = (2 * strong) / s.people.size;
  assert.ok(degree > 2 && degree < 9, `mean degree ${degree}`);
  for (const tie of s.ties.values()) assert.ok(s.people.has(tie.a) && s.people.has(tie.b));
});

test('nothing visible changes in one step: tie strengths and presence move by small increments', () => {
  const s = createSociety(40, 5, 500, 400);
  run(s, 60, [near], 0.01);
  const last = new Map<number, number>();
  for (const [key, tie] of s.ties) last.set(key, effective(s, tie));
  for (let t = 0; t < 600; t++) {
    step(s, 1 / 60, [near], 0.01, 500, 400);
    for (const [key, previous] of last) {
      const tie = s.ties.get(key);
      assert.ok(Math.abs((tie ? effective(s, tie) : 0) - previous) < 0.03, 'a tie jumped');
    }
    last.clear();
    for (const [key, tie] of s.ties) last.set(key, effective(s, tie));
  }
});

test('ties across windows grow when near, fade when far, and fade with the other person', () => {
  const s = createSociety(30, 11, 500, 400);
  run(s, 90, [near]);
  const across = () => [...s.cross.values()].reduce((sum, tie) => sum + effectiveCross(s, tie, [near]), 0);
  assert.ok(across() > 1, 'near windows connect');
  run(s, 60, [far]);
  assert.equal(s.cross.size, 0, 'far windows disconnect');
  run(s, 60, [near]);
  const gone: Partner = { ...near, nodes: new Map() };
  run(s, 30, [gone]);
  assert.equal(s.cross.size, 0, 'ties to departed people fade away');
});

test('people with ties elsewhere move toward that window and everyone stays on the page', () => {
  const s = createSociety(30, 5, 600, 400);
  run(s, 90, [near], 0.002, 600, 400);
  const reaching = new Set([...s.cross.values()].filter((tie) => effectiveCross(s, tie, [near]) > 0.3).map((tie) => tie.mine));
  const mean = (list: { x: number }[]) => list.reduce((sum, q) => sum + q.x, 0) / list.length;
  const people = [...s.people.values()];
  assert.ok(reaching.size && mean(people.filter((p) => reaching.has(p.id))) > mean(people.filter((p) => !reaching.has(p.id))) + 50);
  for (const person of people) assert.ok(person.x >= 0 && person.x <= 600 && person.y >= 0 && person.y <= 400 && Number.isFinite(person.x));
});

test('with the network still, the layout settles instead of jittering', () => {
  const s = createSociety(48, 21, 560, 380);
  run(s, 120, [], 0, 560, 380);
  for (let i = 0; i < 900; i++) relax(s, 560, 380, [], () => undefined, 1 / 60);
  const before = [...s.people.values()].map((q) => [q.x, q.y]);
  for (let i = 0; i < 60; i++) relax(s, 560, 380, [], () => undefined, 1 / 60);
  const moved = [...s.people.values()].map((q, i) => Math.hypot(q.x - before[i][0], q.y - before[i][1]));
  assert.ok(moved.reduce((a, b) => a + b, 0) / moved.length < 4);
});
