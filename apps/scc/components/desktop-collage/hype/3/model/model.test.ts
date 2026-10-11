import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, WINDOW_PATH } from '../plan.ts';
import { catalogue, createDeck, drawEntry, images, siteOf, sites, videos } from './catalogue.ts';
import { stockFor } from './corpus.ts';
import { createChain, draw } from './keywords.ts';
import { PHONE, phoneOf, windowRect } from './layout.ts';
import { createRandom } from './random.ts';
import { burst } from './rhythm.ts';
import { defaults, hop, validateSettings } from './settings.ts';

const displays = [
  { width: 1470, height: 956, visible: { x: 0, y: 38, width: 1470, height: 843 }, scale: 2, measuredAt: 0 },
  { width: 1280, height: 800, visible: { x: 0, y: 25, width: 1280, height: 700 }, scale: 1, measuredAt: 0 },
  { width: 3840, height: 2160, visible: { x: 0, y: 48, width: 3840, height: 2040 }, scale: 1, measuredAt: 0 },
];
const inside = (r: { x: number; y: number; width: number; height: number }, f: { x: number; y: number; width: number; height: number }) => r.x >= f.x && r.y >= f.y && r.x + r.width <= f.x + f.width && r.y + r.height <= f.y + f.height;
const gaps = (times: number[]) => times.slice(1).map((t, i) => t - times[i]);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

test('the burst opens every window at once, or in order around the mean gap', () => {
  const once = burst(24, 0, createRandom(3));
  assert.equal(once.length, 24);
  assert.ok(once.every(t => t === once[0]) && once[0] < 500);
  const a = burst(16, 350, createRandom(3));
  assert.deepEqual(a, burst(16, 350, createRandom(3)));
  gaps(a).forEach(gap => assert.ok(gap >= 100 && gap <= 700, `gap ${gap}`));
  const wide = gaps(burst(400, 350, createRandom(7)));
  assert.ok(Math.abs(mean(wide) - 350 * 1.1) < 40, `mean ${mean(wide)}`);
  assert.equal(hop(220, 0), 73);
  assert.equal(hop(220, 1), 484);
  const hops = Array.from({ length: 2000 }, (_, i) => hop(220, (i + 0.5) / 2000)).sort((a, b) => a - b);
  const median = hops[1000];
  assert.ok(median > 150 && median < 230, `median ${median}`);
  assert.ok(hops.filter(h => h < 100).length > hops.length * 0.1 && hops.filter(h => h > 350).length > hops.length * 0.1, 'short and long dwells both occur');
});

test('the chain draws the root and its FOMO topics', () => {
  const chain = createChain('AI');
  const random = createRandom(5);
  const drawn = new Set(Array.from({ length: 300 }, () => draw(chain, random)));
  assert.ok(drawn.has('AI') && drawn.has('AI jobs') && drawn.has('AI stocks'));
});

test('every window is the same phone, a share of the desktop tall, scattered over it', () => {
  for (const display of displays) for (const height of [30, 70, 100]) {
    const v = display.visible;
    const phone = phoneOf(v, height);
    assert.ok(Math.abs(phone.height - v.height * height / 100) <= 1);
    assert.ok(Math.abs(phone.height / phone.width - PHONE) < 0.02, `phone ${phone.height / phone.width}`);
    const random = createRandom(height);
    const rects = Array.from({ length: 40 }, (_, index) => windowRect(v, index, height, random));
    rects.forEach(rect => { assert.ok(inside(rect, v), `${display.width} ${height}`); assert.deepEqual({ width: rect.width, height: rect.height }, phone); });
    const xs = new Set(rects.map(r => r.x)), ys = new Set(rects.map(r => r.y));
    assert.ok(xs.size > 30 && (height === 100 || ys.size > 30), 'scattered');
    assert.ok(Math.min(...rects.map(r => r.x)) < v.x + v.width * 0.1 && Math.max(...rects.map(r => r.x + r.width)) > v.x + v.width * 0.9, 'spread across');
  }
  assert.deepEqual(phoneOf({ x: 0, y: 38, width: 1470, height: 843 }, 80), { width: 329, height: 674 });
});

test('the deck is well formed: unique ids, real https pages, clones with pages, images and videos that exist', () => {
  assert.equal(new Set(catalogue.map(entry => entry.id)).size, catalogue.length);
  for (const entry of catalogue) {
    if (entry.kind === 'real') assert.ok(/^https:\/\//.test(entry.url ?? ''), entry.id);
    else {
      assert.ok(entry.page, entry.id);
      if (entry.page === 'image') assert.ok(entry.image !== undefined && entry.image >= 0 && entry.image < images.length, entry.id);
      if (entry.page === 'video' || entry.page === 'youtube') assert.ok(videos.some(video => video.id === entry.video), entry.id);
    }
  }
  const deck = createDeck();
  const random = createRandom(9);
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const entry = drawEntry(deck, 'AI jobs', 100, random);
    assert.equal(entry.kind, 'clone');
    assert.ok(!seen.has(entry.id), entry.id);
    seen.add(entry.id);
  }
  for (let i = 0; i < 30; i++) assert.equal(drawEntry(createDeck(), 'AI stocks', 0, createRandom(i + 1)).kind, 'real');
});

test('settings validate and a composed run fills the grid with clone pages on the window route', () => {
  assert.deepEqual(validateSettings(defaults), defaults);
  assert.throws(() => validateSettings({ ...defaults, gap: -50 }));
  assert.throws(() => validateSettings({ ...defaults, pace: 10 }));
  assert.throws(() => validateSettings({ ...defaults, height: 20 }));
  for (const display of displays) {
    const { items, arrivals } = compose({ ...defaults, count: 24, clones: 60 }, display, 'https://example.test');
    assert.equal(items.length, 24);
    items.slice(1).forEach((item, i) => assert.ok(item.at! >= items[i].at!));
    items.forEach(item => assert.ok(inside(item, display.visible)));
    const clones = items.filter(item => item.url!.startsWith(`https://example.test${WINDOW_PATH}?`));
    assert.ok(clones.length > 0 && clones.length < 24);
    clones.forEach(item => {
      const query = new URL(item.url!).searchParams;
      assert.ok(query.get('page') && query.get('k'));
      assert.equal(query.get('z'), null);
      if (query.get('page') === 'image') assert.ok(query.get('img'));
      if (query.get('page') === 'video' || query.get('page') === 'youtube') assert.ok(query.get('v'));
    });
    assert.deepEqual(compose({ ...defaults, count: 24, clones: 60 }, display, 'https://example.test').arrivals.map(a => a.entry.id), arrivals.map(a => a.entry.id));
  }
  const dark = compose({ ...defaults, count: 40, dark: 50 }, displays[0], 'x').arrivals.filter(a => a.dark).length;
  assert.ok(dark > 8 && dark < 32, `dark ${dark}`);
});

test('sites cover the deck and a chosen site is the only one drawn', () => {
  assert.equal(sites.reduce((sum, site) => sum + site.count, 0), catalogue.length);
  assert.ok(sites.some(site => site.id === 'naver.com' && site.name === 'Naver' && site.count >= 10));
  assert.ok(sites.some(site => site.id === 'clone:slack'));
  const naver = new Set(['naver.com']);
  const deck = createDeck();
  for (let i = 0; i < 30; i++) assert.equal(siteOf(drawEntry(deck, 'AI jobs', 60, createRandom(i + 1), naver)), 'naver.com');
  // Naver has no clones: at 100 % clones the real Naver pages are still drawn rather than another site.
  assert.equal(siteOf(drawEntry(createDeck(), 'AI jobs', 100, createRandom(3), naver)), 'naver.com');
  const two = new Set(['naver.com', 'clone:slack']);
  const twoDeck = createDeck(), twoRandom = createRandom(11);
  const seen = new Set(Array.from({ length: 40 }, () => siteOf(drawEntry(twoDeck, 'AI jobs', 60, twoRandom, two))));
  assert.deepEqual([...seen].sort(), ['clone:slack', 'naver.com']);
  assert.throws(() => validateSettings({ ...defaults, sites: ['nowhere'] }));
  assert.deepEqual(validateSettings({ ...defaults, sites: ['naver.com'] }).sites, ['naver.com']);
  const run = compose({ ...defaults, sites: ['naver.com'] }, displays[0], 'x').arrivals;
  assert.ok(run.every(a => siteOf(a.entry) === 'naver.com'));
});

test('the quote chart is reproducible and rises', () => {
  const a = stockFor('AI stocks', 4);
  assert.deepEqual(a.points, stockFor('AI stocks', 4).points);
  assert.equal(a.points.length, 120);
  assert.ok(a.points[a.points.length - 1] > a.points[0]);
  assert.equal(stockFor('AI 수혜주', 1).symbol, '000660');
});
