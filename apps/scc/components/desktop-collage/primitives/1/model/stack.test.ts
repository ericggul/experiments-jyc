import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutHeart } from './heart.ts';
import { defaults } from './settings.ts';
import { paintOrder, stackRanks } from './stack.ts';

const tiles = layoutHeart({ x: 0, y: 38, width: 1470, height: 843 }, defaults);

test('newest on top keeps each new window in front', () => {
  assert.ok(stackRanks(tiles, 'newest').every(rank => rank === 1));
  assert.deepEqual(paintOrder(tiles, 'newest', 4), [0, 1, 2, 3]);
});

test('oldest on top sends each new window behind the others', () => {
  assert.deepEqual(stackRanks(tiles, 'oldest').slice(0, 4), [1, 2, 3, 4]);
  assert.deepEqual(paintOrder(tiles, 'oldest', 4), [3, 2, 1, 0]);
});

test('upper/lower stacks paint strictly by vertical position', () => {
  for (const stack of ['upper', 'lower'] as const) {
    const centres = paintOrder(tiles, stack, tiles.length).map(i => tiles[i].y + tiles[i].height / 2);
    for (let i = 1; i < centres.length; i++) assert.ok(stack === 'upper' ? centres[i] <= centres[i - 1] : centres[i] >= centres[i - 1]);
  }
});

test('paint order always lists each shown window once', () => {
  for (const stack of ['newest', 'oldest', 'upper', 'lower'] as const) for (const shown of [0, 1, 7, 30]) {
    assert.deepEqual([...paintOrder(tiles, stack, shown)].sort((a, b) => a - b), Array.from({ length: shown }, (_, i) => i));
  }
});
