import type { RecursiveNode, RecursiveEdge } from "./types";

const CHILD_SCALE = 5 / 22;
const angleFor = (index: number) => -Math.PI / 2 + index * Math.PI / 3;

/** F(0) is a leaf. F(d) is K6 whose six nodes are F(d-1) objects. */
export function createRecursiveK6(
  depth: number,
  x = 200,
  y = 200,
  radius = 176,
  id = "k6",
): RecursiveNode {
  if (!Number.isInteger(depth) || depth < 0 || depth > 3) {
    throw new RangeError("K6 depth must be an integer from 0 to 3.");
  }
  if (depth === 0) return { id, x, y, radius: 0, children: [], edges: [] };
  const childRadius = depth > 1 ? radius * CHILD_SCALE : 0;
  const orbit = radius - childRadius;
  const children = Array.from({ length: 6 }, (_, index) => {
    const angle = angleFor(index);
    return createRecursiveK6(
      depth - 1,
      x + orbit * Math.cos(angle),
      y + orbit * Math.sin(angle),
      childRadius,
      `${id}/${index}`,
    );
  });
  const edges = children.flatMap((source, index) =>
    children.slice(index + 1).map((target) => ({
      id: `${source.id}--${target.id}`,
      source,
      target,
    })),
  );
  return { id, x, y, radius, children, edges };
}

/** Intersect the parent-centre axis with the entire child hexagon's boundary. */
function boundaryPoint(node: RecursiveNode, toward: RecursiveNode) {
  if (node.children.length === 0) return { x: node.x, y: node.y };
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const apothem = node.radius * Math.cos(Math.PI / 6);
  let distance = Number.POSITIVE_INFINITY;
  for (let side = 0; side < 6; side++) {
    const normal = angleFor(side) + Math.PI / 6;
    const projection = ux * Math.cos(normal) + uy * Math.sin(normal);
    if (projection > 1e-10) distance = Math.min(distance, apothem / projection);
  }
  // A small clearance makes the upper edge meet the compound object without
  // visually assigning it to a child dot where the axis meets a hexagon corner.
  distance += 2;
  return { x: node.x + ux * distance, y: node.y + uy * distance };
}

function linePath(edge: RecursiveEdge) {
  const from = boundaryPoint(edge.source, edge.target);
  const to = boundaryPoint(edge.target, edge.source);
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

/** A parent receives as a whole miniature, never as a fabricated centre dot. */
function receiptPath(node: RecursiveNode): string {
  return [
    ...node.edges.map(linePath),
    ...node.children.filter((child) => child.children.length > 0).map(receiptPath),
  ].join(" ");
}

export function projectEdge(edge: RecursiveEdge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    from: {
      id: edge.source.id,
      ...boundaryPoint(edge.source, edge.target),
      receiptPath: edge.source.children.length ? receiptPath(edge.source) : undefined,
    },
    to: {
      id: edge.target.id,
      ...boundaryPoint(edge.target, edge.source),
      receiptPath: edge.target.children.length ? receiptPath(edge.target) : undefined,
    },
  };
}

export function collectLeaves(node: RecursiveNode): RecursiveNode[] {
  return node.children.length ? node.children.flatMap(collectLeaves) : [node];
}

export function collectEdges(node: RecursiveNode): RecursiveEdge[] {
  return [...node.edges, ...node.children.flatMap(collectEdges)];
}

export const fractalRoot = createRecursiveK6(2);
export const fractalVertices = collectLeaves(fractalRoot);
// This projection serves drawing/transport only. The authoritative topology
// stays hierarchical: root edges refer to compound nodes, not leaf endpoints.
export const fractalEdges = collectEdges(fractalRoot).map((edge) => ({
  ...projectEdge(edge),
  scope: edge.source.children.length ? "between" as const : "within" as const,
}));

/** Opt 2: lexicographic K6[K6], i.e. K36 in the same recursive placement. */
export const completeFractalEdges = fractalVertices.flatMap((source, index) =>
  fractalVertices.slice(index + 1).map((target) => ({
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
