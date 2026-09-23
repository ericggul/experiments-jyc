import assert from 'node:assert/strict';
import test from 'node:test';
import { feedStep } from './feed-step.ts';

test('the feed advances into an appended group without wrapping', () => {
  const first = ['a', 'b', 'c'];
  assert.deepEqual(feedStep(first, 'c', 1, true), { nextId: null, requestMore: true });
  assert.deepEqual(feedStep([...first, 'd', 'e'], 'c', 1, true), { nextId: 'd', requestMore: false });
  assert.deepEqual(feedStep(first, 'a', -1, true), { nextId: null, requestMore: false });
  assert.deepEqual(feedStep(first, 'c', 1, false), { nextId: null, requestMore: false });
});
