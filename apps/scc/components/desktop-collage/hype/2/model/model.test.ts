import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, WINDOW_PATH } from '../plan.ts';
import { catalogue, createDeck, drawEntry, images, videos } from './catalogue.ts';
import { stockFor } from './corpus.ts';
import { createChain, draw } from './keywords.ts';
import { FULL, nudge, windowRect, zoomFor } from './layout.ts';
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

test('windows look like browser windows: around the typical width, tall, a few whole, on the desktop, covering it', () => {
  for (const display of displays) for (const size of [55, 70, 85]) {
    const random = createRandom(size);
    const v = display.visible;
    const rects = Array.from({ length: 200 }, (_, index) => windowRect(v, index, size, random));
    rects.forEach(rect => assert.ok(inside(rect, v), `${display.width} ${size}`));
    const whole = rects.filter(r => r.width === v.width && r.height === v.height);
    assert.ok(whole.length >= 1 && whole.length <= 200 * FULL * 2.2, `whole ${whole.length}`);
    const rest = rects.filter(r => !(r.width === v.width && r.height === v.height));
    rest.forEach(r => {
      assert.ok(r.width >= v.width * 0.45 - 1 && r.width <= v.width * 0.85 + 1, `width ${r.width / v.width}`);
      assert.ok(r.height >= v.height * 0.58 - 1 && r.height <= v.height * 0.93 + 1, `height ${r.height / v.height}`);
      assert.ok(r.width / r.height > 0.9 && r.width / r.height < 2.6, `shape ${r.width}×${r.height}`);
    });
    const widths = rest.map(r => r.width / v.width);
    const near = widths.filter(w => Math.abs(w - size / 100) <= 0.08).length;
    assert.ok(near >= rest.length * 0.5, `near typical ${near}/${rest.length}`);
    assert.ok(Math.max(...widths) - Math.min(...widths) >= 0.15, 'widths vary');
    const touching = rects.filter(r => r.x === v.x || r.y === v.y || r.x + r.width === v.x + v.width).length;
    assert.ok(touching >= rects.length * 0.5, `touching ${touching}`);
    // The first two dozen cover the desktop: every cell of a coarse grid lies under some window.
    const first = rects.slice(0, 24);
    for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 6; gy++) {
      const px = v.x + (gx + 0.5) * v.width / 8, py = v.y + (gy + 0.5) * v.height / 6;
      assert.ok(first.some(r => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height), `uncovered ${gx},${gy} at ${size}`);
    }
    const dragged = nudge(v, rects[1], random);
    assert.ok(inside(dragged, v));
    assert.ok(Math.abs(dragged.width - rects[1].width) <= v.width * 0.08 + 1 && Math.abs(dragged.x - rects[1].x) <= v.width * 0.12 + 1);
  }
  assert.equal(zoomFor(1280), 1);
  assert.equal(zoomFor(1024), 1);
  assert.equal(zoomFor(640), 0.75);
  assert.equal(zoomFor(900), 0.88);
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

test('settings validate and a composed run fits the display with clone pages on the window route', () => {
  assert.deepEqual(validateSettings(defaults), defaults);
  assert.throws(() => validateSettings({ ...defaults, gap: -50 }));
  assert.throws(() => validateSettings({ ...defaults, pace: 10 }));
  assert.throws(() => validateSettings({ ...defaults, pages: 'tiny' }));
  for (const display of displays) {
    const { items, arrivals } = compose({ ...defaults, count: 24, clones: 60 }, display, 'https://example.test');
    assert.equal(items.length, 24);
    items.slice(1).forEach((item, i) => assert.ok(item.at! >= items[i].at!));
    items.forEach(item => assert.ok(inside(item, display.visible)));
    const clones = items.filter(item => item.url!.startsWith(`https://example.test${WINDOW_PATH}?`));
    assert.ok(clones.length > 0 && clones.length < 24);
    clones.forEach(item => assert.equal(new URL(item.url!).searchParams.get('z'), null, 'pages are native by default'));
    const scaled = compose({ ...defaults, count: 24, clones: 60, pages: 'scaled' }, display, 'https://example.test').items.filter(item => item.url!.startsWith(`https://example.test${WINDOW_PATH}?`));
    scaled.forEach(item => {
      const query = new URL(item.url!).searchParams;
      assert.ok(query.get('page') && query.get('k'));
      const z = query.get('z');
      if (z) assert.ok(Number(z) >= 0.75 && Number(z) < 1, `zoom ${z}`);
      if (query.get('page') === 'image') assert.ok(query.get('img'));
      if (query.get('page') === 'video' || query.get('page') === 'youtube') assert.ok(query.get('v'));
    });
    assert.deepEqual(compose({ ...defaults, count: 24, clones: 60 }, display, 'https://example.test').arrivals.map(a => a.entry.id), arrivals.map(a => a.entry.id));
  }
  for (let seed = 1; seed <= 20; seed++) {
    const v = displays[0].visible;
    const whole = compose({ ...defaults, count: 40, seed }, displays[0], 'x').arrivals.filter(a => a.rect.width === v.width && a.rect.height === v.height).length;
    assert.ok(whole <= 1, `seed ${seed}: ${whole} whole-desktop windows`);
  }
  const dark = compose({ ...defaults, count: 40, dark: 50 }, displays[0], 'x').arrivals.filter(a => a.dark).length;
  assert.ok(dark > 8 && dark < 32, `dark ${dark}`);
});

test('the quote chart is reproducible and rises', () => {
  const a = stockFor('AI stocks', 4);
  assert.deepEqual(a.points, stockFor('AI stocks', 4).points);
  assert.equal(a.points.length, 120);
  assert.ok(a.points[a.points.length - 1] > a.points[0]);
  assert.equal(stockFor('AI 수혜주', 1).symbol, '000660');
});
