import { projectEdge } from "../model/fractal-k6";
import type { ConnectionWeights, RecursiveNode } from "../model/types";
import { edgePath, type LineStyle } from "./geometry";

/** The same K6 edge grammar at every level; compound nodes recurse in place. */
export default function RecursiveGraph({ node, weights, lineStyle, level = 0 }: { node: RecursiveNode; weights: ConnectionWeights; lineStyle: LineStyle; level?: number }) {
  return (
    <g data-k6-node={node.id}>
      {node.edges.map((edge) => {
        const { from, to } = projectEdge(edge);
        const props = {
          key: edge.id,
          strokeWidth: level === 0 ? 0.85 * weights.between : 0.65 * weights.within,
          vectorEffect: "non-scaling-stroke" as const,
        };
        return lineStyle === "straight"
          ? <line {...props} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
          : <path {...props} d={edgePath({ id: edge.id, from, to }, lineStyle)} />;
      })}
      {node.children.filter((child) => child.children.length > 0).map((child) => (
        <RecursiveGraph key={child.id} node={child} weights={weights} lineStyle={lineStyle} level={level + 1} />
      ))}
    </g>
  );
}
