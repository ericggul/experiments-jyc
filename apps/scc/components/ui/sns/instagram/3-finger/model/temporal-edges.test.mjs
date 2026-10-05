import assert from "node:assert/strict";
import test from "node:test";
import { connectStoryActivation } from "./temporal-edges.ts";

test("a new cell receives directed edges from every cell made in the previous two seconds", () => {
  const id = (source) => `edge-${source}`;
  const first = connectStoryActivation([], 1, 0, id);
  assert.equal(first.edges.length, 0);
  const second = connectStoryActivation(first.history, 2, 700, id);
  assert.deepEqual(second.edges.map(({ source, target }) => [source, target]), [[1, 2]]);
  const third = connectStoryActivation(second.history, 3, 2000, id);
  assert.deepEqual(third.edges.map(({ source, target }) => [source, target]), [[1, 3], [2, 3]]);
  const late = connectStoryActivation(third.history, 4, 2701, id);
  assert.deepEqual(late.edges.map(({ source, target }) => [source, target]), [[3, 4]]);
  assert.equal(connectStoryActivation([], 5, 2800, id).edges.length, 0);
});
