import { edges } from "../model/k6";
import { completeFractalEdges, fractalRoot } from "../model/fractal-k6";
import type { K3Graph } from "../model/fractal-k3";
import type { ConnectionWeights, GraphMode } from "../model/types";
import DenseEdges from "./dense-edges";
import RecursiveGraph from "./recursive-graph";
import { edgePath, type LineStyle } from "./geometry";

type Props = {
  mode: GraphMode;
  k3: K3Graph | null;
  weights: ConnectionWeights;
  lineStyle: LineStyle;
};

export default function Edges({ mode, k3, weights, lineStyle }: Props) {
  if (mode === "fractal") {
    return <RecursiveGraph node={fractalRoot} weights={weights} lineStyle={lineStyle} />;
  }
  if (k3 && k3.depth >= 4) {
    return <DenseEdges graph={k3} weights={weights} lineStyle={lineStyle} />;
  }

  const graphEdges = k3 ? k3.edges : mode === "fractal-complete" ? completeFractalEdges : edges;
  const complete = mode === "fractal-complete" || k3 !== null;
  return graphEdges.map((edge) => {
    const width = complete ? ("layer" in edge && edge.layer === "inner" ? 0.65 : 0.22) : 1;
    const weight = "scope" in edge && edge.scope === "within" ? weights.within : weights.between;
    const props = { key: edge.id, strokeWidth: width * weight, vectorEffect: "non-scaling-stroke" as const };
    return lineStyle === "straight"
      ? <line {...props} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} />
      : <path {...props} d={edgePath(edge, lineStyle)} />;
  });
}
