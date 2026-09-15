import assert from 'node:assert/strict';
import test from 'node:test';
import { HEIGHT, WIDTH, createStratum } from './score.ts';

test('a click always produces the same complete stratum', () => {
  assert.deepEqual(createStratum(17, 818, 211), createStratum(17, 818, 211));
  assert.notDeepEqual(createStratum(17, 818, 211), createStratum(18, 818, 211));
});

test('fragments have stable IDs, a shared topic, and bounded visible geometry', () => {
  const stratum = createStratum(11, 0, HEIGHT);
  assert.equal(stratum.topic, 3);
  assert.ok(stratum.fragments.length >= 7 && stratum.fragments.length <= 10);
  assert.equal(new Set(stratum.fragments.map((fragment) => fragment.id)).size, stratum.fragments.length);
  for (const fragment of stratum.fragments) {
    assert.equal(fragment.source, stratum.topic);
    for (const value of [fragment.x, fragment.y, fragment.width, fragment.height]) assert.ok(Number.isFinite(value));
    assert.ok(fragment.width > 0 && fragment.height > 0);
    assert.ok(fragment.x < WIDTH && fragment.x + fragment.width > 0);
    assert.ok(fragment.y < HEIGHT && fragment.y + fragment.height > 0);
  }
});

test('one hero, two click-near fragments, and a late notification cluster are retained', () => {
  const click = { x: 790, y: 480 };
  const { fragments } = createStratum(6, click.x, click.y);
  assert.ok(fragments[0].width >= 460 && fragments[0].width <= 720);
  assert.ok(fragments.slice(0, 2).every((fragment) =>
    Math.abs(fragment.x + fragment.width / 2 - click.x) <= 97 &&
    Math.abs(fragment.y + fragment.height / 2 - click.y) <= 97));
  assert.deepEqual(fragments.slice(-3).map((fragment) => fragment.kind), ['notification', 'notification', 'notification']);
});
