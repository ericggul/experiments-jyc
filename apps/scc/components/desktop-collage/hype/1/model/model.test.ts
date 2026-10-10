import assert from 'node:assert/strict';
import test from 'node:test';
import { readingScript, scriptLength } from '../agent/reader.ts';
import { compose, followChance, WINDOW_PATH } from '../plan.ts';
import { catalogue, createDeck, drawEntry } from './catalogue.ts';
import { createChain, decay, derivedKeywords, draw, mentioned, raise } from './keywords.ts';
import { windowRect, zoomFor } from './layout.ts';
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

test('windows stay on the visible desktop at every size, keep laptop proportions and vary in size', () => {
  for (const display of displays) for (const size of [40, 70, 100]) {
    const random = createRandom(size);
    const widths: number[] = [];
    for (let index = 0; index < 40; index++) {
      const rect = windowRect(display.visible, index, size, random);
      assert.ok(inside(rect, display.visible), `${display.width} ${size} ${index}`);
      if (rect.width < display.visible.width && rect.height < display.visible.height) {
        const ratio = rect.width / rect.height;
        assert.ok(ratio > 1.28 && ratio < 1.77, `ratio ${ratio}`);
      }
      widths.push(rect.width);
    }
    // Small means meet the 380 pt floor, so the spread narrows there.
    assert.ok(Math.max(...widths) / Math.min(...widths) > 1.3, 'sizes vary');
    // The 300 pt height floor at the widest proportion gives 525 pt.
    assert.ok(Math.max(...widths) <= Math.max(525, Math.ceil(display.visible.width * size / 100 * 1.001)), 'never wider than the mean');
  }
  assert.equal(zoomFor(1280), 1);
  assert.equal(zoomFor(2000), 1);
  assert.equal(zoomFor(640), 0.5);
  assert.equal(zoomFor(300), 0.5);
  assert.equal(zoomFor(960), 0.75);
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
    const real = readingScript({ kind: 'real' }, 'active', 0.6, createRandom(seed), texts);
    assert.ok(real.every(step => step.kind === 'scroll' || step.kind === 'follow'));
    const passive = readingScript({ kind: 'clone', page: 'slack' }, 'passive', 0.6, createRandom(seed), texts);
    assert.ok(passive.every(step => step.kind === 'scroll'));
    const leave = readingScript({ kind: 'real' }, 'active', 0, createRandom(seed), texts);
    assert.ok(leave.every(step => step.kind === 'scroll'));
    assert.deepEqual(readingScript({ kind: 'real' }, 'none', 0.6, createRandom(seed), texts), []);
    assert.ok(scriptLength(real) <= 40000);
  }
  const active = readingScript({ kind: 'clone', page: 'slack' }, 'active', 0.6, createRandom(2), texts);
  assert.deepEqual(active.filter(step => step.kind !== 'scroll' && step.kind !== 'act').map(step => step.kind), ['focus', 'type', 'submit']);
  active.slice(1).forEach((step, i) => assert.ok(step.at > active[i].at));
  for (let seed = 1; seed < 30; seed++) {
    const brief = readingScript({ kind: 'clone', page: 'slack' }, 'active', 0.6, createRandom(seed), texts, true);
    assert.ok(brief.filter(step => step.kind === 'scroll').length <= 2);
    assert.ok(scriptLength(brief) <= 14000);
    assert.ok(readingScript({ kind: 'real' }, 'active', 0.6, createRandom(seed), [], true).every(step => step.kind === 'scroll' || step.kind === 'follow'));
  }
  const always = Array.from({ length: 40 }, (_, seed) => readingScript({ kind: 'real' }, 'passive', 1, createRandom(seed + 1), []));
  assert.ok(always.every(steps => steps.some(step => step.kind === 'follow')));
  assert.equal(followChance(defaults) > 0.6 && followChance(defaults) < 0.7, true);
  assert.equal(followChance({ ...defaults, spawn: 0 }), 0);
  assert.equal(followChance({ ...defaults, links: 'leave' }), 0);
});

test('settings validate and a composed run fits the display with clone pages on the window route', () => {
  assert.deepEqual(validateSettings(defaults), defaults);
  assert.throws(() => validateSettings({ ...defaults, agent: 'loud' }));
  assert.throws(() => validateSettings({ ...defaults, attention: 'everywhere' }));
  assert.throws(() => validateSettings({ ...defaults, pages: 'tiny' }));
  assert.throws(() => validateSettings({ ...defaults, dark: 101 }));
  const { arrivals: mixed } = compose({ ...defaults, count: 40, dark: 50 }, displays[0], 'x');
  const darkCount = mixed.filter(a => a.dark).length;
  assert.ok(darkCount > 8 && darkCount < 32, `dark ${darkCount}`);
  assert.ok(compose({ ...defaults, count: 20, dark: 0 }, displays[0], 'x').arrivals.every(a => !a.dark));
  assert.ok(compose({ ...defaults, count: 20, dark: 100 }, displays[0], 'x').arrivals.every(a => a.dark));
  assert.throws(() => validateSettings({ ...defaults, interval: 0 }));
  for (const display of displays) {
    const { items, arrivals } = compose({ ...defaults, count: 24, clones: 50 }, display, 'https://example.test');
    assert.equal(items.length, 24);
    items.slice(1).forEach((item, i) => assert.ok(item.at! > items[i].at!));
    items.forEach(item => assert.ok(inside(item, display.visible)));
    const clones = items.filter(item => item.url!.startsWith(`https://example.test${WINDOW_PATH}?`));
    assert.ok(clones.length > 0 && clones.length < 24);
    clones.forEach(item => { const query = new URL(item.url!).searchParams; assert.ok(query.get('page') && query.get('k')); const z = query.get('z'); if (item.width < 1280) assert.ok(z && Number(z) < 1 && Number(z) >= 0.5, `zoom ${z} for ${item.width}`); else assert.equal(z, null); });
    assert.ok(compose({ ...defaults, count: 24, pages: 'native' }, display, 'https://example.test').items.every(item => !item.url!.includes('z=')));
    assert.deepEqual(compose({ ...defaults, count: 24, clones: 50 }, display, 'https://example.test').arrivals.map(a => a.entry.id), arrivals.map(a => a.entry.id));
  }
  const silent = compose({ ...defaults, clones: 0 }, displays[0], 'x');
  assert.ok(silent.items.every(item => !item.url!.includes(WINDOW_PATH)));
});
