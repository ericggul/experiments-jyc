import type { RecursiveNode } from "./types";

/** Each triangle vertex is replaced by the same triangle, at one-third scale. */
export function createRecursiveK3(
  depth: number,
  x = 200,
  y = 244, // Centre the triangle's bounding box in the existing 400-square field.
  radius = 176,
  id = "k3",
): RecursiveNode {
  if (!Number.isInteger(depth) || depth < 0 || depth > 5) {
    throw new RangeError("K3 depth must be an integer from 0 to 5.");
  }
  if (depth === 0) return { id, x, y, radius: 0, children: [], edges: [] };
  const childRadius = depth > 1 ? radius / 3 : 0;
  const orbit = radius - childRadius;
  const children = Array.from({ length: 3 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
    return createRecursiveK3(depth - 1, x + orbit * Math.cos(angle), y + orbit * Math.sin(angle), childRadius, `${id}/${index}`);
  });
  const edges = children.flatMap((source, index) =>
    children.slice(index + 1).map((target) => ({ id: `${source.id}--${target.id}`, source, target })),
  );
  return { id, x, y, radius, children, edges };
}

function leaves(node: RecursiveNode): RecursiveNode[] {
  return node.children.length ? node.children.flatMap(leaves) : [node];
}

export const k3Depths = [3, 4, 5] as const;
export type K3Depth = typeof k3Depths[number];

function completeK3(depth: K3Depth) {
  const root = createRecursiveK3(depth);
  const vertices = leaves(root);
  const edges = vertices.flatMap((source, index) =>
    vertices.slice(index + 1).map((target) => ({
      id: `complete:${source.id}--${target.id}`,
      source,
      target,
      from: source,
      to: target,
      scope: source.id.split("/")[1] === target.id.split("/")[1]
        ? "within" as const
        : "between" as const,
      layer: source.id.slice(0, source.id.lastIndexOf("/")) === target.id.slice(0, target.id.lastIndexOf("/"))
        ? "inner" as const
        : "outer" as const,
    })),
  );
  return { depth, root, vertices, edges };
}

export type K3Graph = ReturnType<typeof completeK3>;
const cache = new Map<K3Depth, K3Graph>();

export function getK3Graph(depth: K3Depth) {
  let graph = cache.get(depth);
  if (!graph) {
    graph = completeK3(depth);
    cache.set(depth, graph);
  }
  return graph;
}

export function getK3ForMode(mode: string) {
  const depth = k3Depths.find((value) => mode === `k3-depth-${value}`);
  return depth ? getK3Graph(depth) : null;
}
