import assert from 'node:assert/strict';
import test from 'node:test';
import { readingScript, scriptLength } from '../agent/reader.ts';
import { compose, WINDOW_PATH } from '../plan.ts';
import { catalogue, createDeck, drawEntry } from './catalogue.ts';
import { createChain, decay, derivedKeywords, draw, mentioned, raise } from './keywords.ts';
import { windowRect } from './layout.ts';
import { createRandom } from './random.ts';
import { schedule } from './rhythm.ts';
import { defaults, validateSettings } from './settings.ts';

const displays = [
  { width: 1470, height: 956, visible: { x: 0, y: 38, width: 1470, height: 843 }, scale: 2, measuredAt: 0 },
  { width: 1280, height: 800, visible: { x: 0, y: 25, width: 1280, height: 700 }, scale: 1, measuredAt: 0 },
  { width: 3840, height: 2160, visible: { x: 0, y: 48, width: 3840, height: 2040 }, scale: 1, measuredAt: 0 },
];
const inside = (r: { x: number; y: number; width: number; height: number }, f: { x: number; y: number; width: number; height: number }) => r.x >= f.x && r.y >= f.y && r.x + r.width <= f.x + f.width && r.y + r.height <= f.y + f.height;
const gaps = (times: number[]) => times.slice(1).map((t, i) => t - times[i]);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const cv = (values: number[]) => { const m = mean(values); return Math.sqrt(mean(values.map(v => (v - m) ** 2))) / m; };

test('arrivals are reproducible, increasing and never closer than the minimum gap', () => {
  const a = schedule(40, 7, 40, createRandom(3));
  const b = schedule(40, 7, 40, createRandom(3));
  assert.deepEqual(a, b);
  assert.equal(a.length, 40);
  gaps(a).forEach(gap => assert.ok(gap >= 350, `gap ${gap}`));
});

test('the mean gap stays near the interval at any burst; burst makes gaps more uneven', () => {
  const plain = gaps(schedule(1500, 7, 0, createRandom(11)));
  const bursty = gaps(schedule(1500, 7, 100, createRandom(11)));
  assert.ok(Math.abs(mean(plain) / 1000 - 7) < 1.4, `mean ${mean(plain)}`);
  assert.ok(Math.abs(mean(bursty) / 1000 - 7) < 2.1, `mean ${mean(bursty)}`);
  assert.ok(cv(bursty) > cv(plain) * 1.15, `cv ${cv(bursty)} vs ${cv(plain)}`);
});

test('the chain draws the root and its derivatives, and raised weights relax toward their base', () => {
  const chain = createChain('AI');
  const random = createRandom(5);
  const drawn = new Set(Array.from({ length: 400 }, () => draw(chain, random)));
  assert.ok(drawn.has('AI'));
  assert.ok([...drawn].every(k => k === 'AI' || derivedKeywords(chain).includes(k)));
  assert.ok(drawn.size > 10);
  raise(chain, 'AGI', 1);
  const raised = chain.weights.get('AGI')!;
  assert.ok(raised > chain.base.get('AGI')!);
  decay(chain, 40);
  const relaxed = chain.weights.get('AGI')!;
  assert.ok(relaxed < raised && relaxed > chain.base.get('AGI')!);
  decay(chain, 1000);
  assert.ok(Math.abs(chain.weights.get('AGI')! - chain.base.get('AGI')!) < 1e-6);
  raise(chain, 'not a keyword', 1);
  assert.equal(chain.weights.has('not a keyword'), false);
  assert.deepEqual(mentioned(chain, 'Sam Altman says AGI is near - The Verge'), ['Sam Altman', 'AGI']);
});

test('windows stay on the visible desktop at every size on several displays', () => {
  for (const display of displays) for (const size of [40, 70, 100]) {
    const random = createRandom(size);
    for (let index = 0; index < 40; index++) assert.ok(inside(windowRect(display.visible, index, size, random), display.visible), `${display.width} ${size} ${index}`);
  }
});

test('the deck prefers the asked kind and keyword, and never repeats a page until it runs out', () => {
  assert.ok(catalogue.every(entry => entry.kind === 'real' ? /^https:\/\//.test(entry.url ?? '') : !!entry.page));
  assert.equal(new Set(catalogue.map(entry => entry.id)).size, catalogue.length);
  const deck = createDeck();
  const random = createRandom(9);
  const seen = new Set<string>();
  const agiClones = catalogue.filter(entry => entry.keyword === 'AGI' && entry.kind === 'clone').length;
  for (let i = 0; i < agiClones; i++) {
    const entry = drawEntry(deck, 'AGI', 100, random);
    assert.equal(entry.kind, 'clone');
    assert.equal(entry.keyword, 'AGI');
    assert.ok(!seen.has(entry.id));
    seen.add(entry.id);
  }
  const next = drawEntry(deck, 'AGI', 100, random);
  assert.ok(next.kind === 'real' || next.keyword === 'AI');
});

test('the reader never writes on a real page, and writes only when active on a clone', () => {
  const texts = ['hello'];
  for (let seed = 1; seed < 60; seed++) {
    const real = readingScript({ kind: 'real' }, 'active', true, createRandom(seed), texts);
    assert.ok(real.every(step => step.kind === 'scroll' || step.kind === 'follow'));
    const passive = readingScript({ kind: 'clone', page: 'slack' }, 'passive', true, createRandom(seed), texts);
    assert.ok(passive.every(step => step.kind === 'scroll'));
    const leave = readingScript({ kind: 'real' }, 'active', false, createRandom(seed), texts);
    assert.ok(leave.every(step => step.kind === 'scroll'));
    assert.deepEqual(readingScript({ kind: 'real' }, 'none', true, createRandom(seed), texts), []);
    assert.ok(scriptLength(real) <= 40000);
  }
  const active = readingScript({ kind: 'clone', page: 'slack' }, 'active', true, createRandom(2), texts);
  assert.deepEqual(active.filter(step => step.kind !== 'scroll' && step.kind !== 'act').map(step => step.kind), ['focus', 'type', 'submit']);
  active.slice(1).forEach((step, i) => assert.ok(step.at > active[i].at));
});

test('settings validate and a composed run fits the display with clone pages on the window route', () => {
  assert.deepEqual(validateSettings(defaults), defaults);
  assert.throws(() => validateSettings({ ...defaults, agent: 'loud' }));
  assert.throws(() => validateSettings({ ...defaults, interval: 0 }));
  for (const display of displays) {
    const { items, arrivals } = compose({ ...defaults, count: 24, clones: 50 }, display, 'https://example.test');
    assert.equal(items.length, 24);
    items.slice(1).forEach((item, i) => assert.ok(item.at! > items[i].at!));
    items.forEach(item => assert.ok(inside(item, display.visible)));
    const clones = items.filter(item => item.url!.startsWith(`https://example.test${WINDOW_PATH}?`));
    assert.ok(clones.length > 0 && clones.length < 24);
    clones.forEach(item => { const query = new URL(item.url!).searchParams; assert.ok(query.get('page') && query.get('k')); });
    assert.deepEqual(compose({ ...defaults, count: 24, clones: 50 }, display, 'https://example.test').arrivals.map(a => a.entry.id), arrivals.map(a => a.entry.id));
  }
  const silent = compose({ ...defaults, clones: 0 }, displays[0], 'x');
  assert.ok(silent.items.every(item => !item.url!.includes(WINDOW_PATH)));
});
