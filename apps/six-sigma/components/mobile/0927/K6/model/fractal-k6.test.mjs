import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecursiveK6, collectEdges, collectLeaves, projectEdge, fractalRoot, fractalVertices, fractalEdges, completeFractalEdges } from './fractal-k6.ts';
import { createFlux } from '../flow/flux.ts';

function checkK6(node) {
  if (!node.children.length) return;
  assert.equal(node.children.length, 6);
  assert.equal(node.edges.length, 15);
  const degree = new Map(node.children.map(child => [child.id, 0]));
  for (const edge of node.edges) {
    assert.ok(node.children.includes(edge.source));
    assert.ok(node.children.includes(edge.target));
    assert.notEqual(edge.source.id, edge.target.id);
    degree.set(edge.source.id, degree.get(edge.source.id) + 1);
    degree.set(edge.target.id, degree.get(edge.target.id) + 1);
  }
  for (const value of degree.values()) assert.equal(value, 5);
  node.children.forEach(checkK6);
}

test('the same K6 constructor recurses through parent objects, retaining 36 leaves at depth two', () => {
  checkK6(fractalRoot);
  assert.equal(fractalVertices.length, 36);
  assert.equal(collectEdges(fractalRoot).length, 105);
  const leaves = new Set(fractalVertices.map(node => node.id));
  for (const edge of fractalRoot.edges) {
    assert.equal(leaves.has(edge.source.id), false);
    assert.equal(leaves.has(edge.target.id), false);
  }
  const next = createRecursiveK6(3);
  checkK6(next);
  assert.equal(collectLeaves(next).length, 216);
  assert.equal(collectEdges(next).length, 645);
});

test('parent edge projections preserve macro axes and target the whole child boundary', () => {
  for (const edge of fractalRoot.edges) {
    const { from, to } = projectEdge(edge);
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    for (const [point, node] of [[from, edge.source], [to, edge.target]]) {
      assert.equal(point.id, node.id);
      assert.ok(Math.abs((point.x - node.x) * dy - (point.y - node.y) * dx) < 1e-7);
      const radius = Math.hypot(point.x - node.x, point.y - node.y);
      assert.ok(radius >= node.radius * Math.cos(Math.PI / 6) + 2 - 1e-8);
      assert.ok(radius <= node.radius + 2 + 1e-8);
      assert.equal(point.receiptPath.match(/M /g).length, 15);
      assert.ok(!node.children.some(child => Math.hypot(child.x - point.x, child.y - point.y) < 1));
    }
  }
});

test('opt 2 has precisely 630 unique leaf connections and degree 35 at every leaf', () => {
  assert.equal(completeFractalEdges.length, 630);
  assert.equal(completeFractalEdges.filter(edge => edge.layer === 'inner').length, 90);
  assert.equal(completeFractalEdges.filter(edge => edge.layer === 'outer').length, 540);
  const seen = new Set();
  const degrees = new Map(fractalVertices.map(node => [node.id, 0]));
  for (const edge of completeFractalEdges) {
    const pair = [edge.from.id, edge.to.id].sort().join('--');
    assert.ok(!seen.has(pair)); seen.add(pair);
    assert.notEqual(edge.from.id, edge.to.id);
    degrees.set(edge.from.id, degrees.get(edge.from.id) + 1);
    degrees.set(edge.to.id, degrees.get(edge.to.id) + 1);
  }
  for (const degree of degrees.values()) assert.equal(degree, 35);
});

test('compound flow arrivals identify an entire K6 while leaf arrivals remain points', () => {
  const flux = createFlux(fractalEdges, 14321, true);
  let compoundArrivals = 0, leafArrivals = 0;
  for (let i = 0; i < 24 * 60; i++) {
    for (const packet of flux.advance(i / 24, 8)) {
      const frame = flux.sample(packet);
      if (!frame.receiving) continue;
      if (frame.to.receiptPath) compoundArrivals++;
      else leafArrivals++;
    }
  }
  assert.ok(compoundArrivals > 0);
  assert.ok(leafArrivals > 0);
});
