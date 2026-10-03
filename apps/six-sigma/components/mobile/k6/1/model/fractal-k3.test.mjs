import assert from 'node:assert/strict';
import test from 'node:test';
import { k3Depths, getK3Graph, getK3ForMode } from './fractal-k3.ts';
import { createFlux, MAX_PACKETS } from '../flow/flux.ts';

for (const depth of k3Depths) {
  test(`K3 depth ${depth}: complete leaves and unambiguous top-parent weights`, () => {
    const graph = getK3Graph(depth);
    const count = 3 ** depth;
    assert.equal(graph.vertices.length, count);
    assert.equal(graph.edges.length, count * (count - 1) / 2);
    assert.equal(new Set(graph.vertices.map(p => `${p.x.toFixed(8)},${p.y.toFixed(8)}`)).size, count);
    const expectedWithin = 3 * (count / 3) * (count / 3 - 1) / 2;
    assert.equal(graph.edges.filter(edge => edge.scope === 'within').length, expectedWithin);
    const degrees = new Map(graph.vertices.map(p => [p.id, 0]));
    const pairs = new Set();
    for (const edge of graph.edges) {
      const pair = [edge.from.id, edge.to.id].sort().join('|');
      assert.ok(!pairs.has(pair)); pairs.add(pair);
      assert.notEqual(edge.from.id, edge.to.id);
      assert.equal(edge.scope === 'within', edge.from.id.split('/')[1] === edge.to.id.split('/')[1]);
      degrees.set(edge.from.id, degrees.get(edge.from.id) + 1);
      degrees.set(edge.to.id, degrees.get(edge.to.id) + 1);
    }
    for (const degree of degrees.values()) assert.equal(degree, count - 1);
    const visit = (node, remaining) => {
      if (!remaining) { assert.equal(node.children.length, 0); return; }
      assert.equal(node.children.length, 3); assert.equal(node.edges.length, 3);
      const lengths = node.edges.map(edge => Math.hypot(edge.source.x - edge.target.x, edge.source.y - edge.target.y));
      assert.ok(Math.max(...lengths) - Math.min(...lengths) < 1e-7);
      node.children.forEach(child => visit(child, remaining - 1));
    };
    visit(graph.root, depth);
    assert.equal(getK3Graph(depth), graph);
    for (const point of graph.vertices) assert.ok(point.x > 0 && point.x < 400 && point.y > 0 && point.y < 400);
  });
}

test('depth two is removed from selectable K3 modes', () => {
  assert.equal(getK3ForMode('k3-depth-2'), null);
  assert.deepEqual(k3Depths, [3, 4, 5]);
});

test('depth five weighted flow selects only enabled scopes with bounded work', () => {
  const graph = getK3Graph(5);
  const scopes = new Map(graph.edges.map(edge => [edge.id, edge.scope]));
  for (const scope of ['within', 'between']) {
    const flux = createFlux(graph.edges, 8842, true);
    const weights = { within: scope === 'within' ? 1 : 0, between: scope === 'between' ? 1 : 0 };
    let received = 0;
    for (let frame = 0; frame < 24 * 30; frame++) {
      const packets = flux.advance(frame / 24, 8, weights);
      assert.ok(packets.length <= MAX_PACKETS);
      for (const packet of packets) {
        assert.equal(scopes.get(packet.edgeId), scope);
        const sample = flux.sample(packet);
        assert.ok(Number.isFinite(sample.head.x) && Number.isFinite(sample.head.y));
        received++;
      }
    }
    assert.ok(received > 0);
  }
});
