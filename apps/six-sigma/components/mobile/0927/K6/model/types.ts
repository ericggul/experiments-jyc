export type Vertex = { id: number | string; x: number; y: number; receiptPath?: string };
export type Edge = { id: string; from: Vertex; to: Vertex; scope?: "within" | "between" };
export type ConnectionWeights = { within: number; between: number };
export type GraphMode = "k6" | "fractal" | "fractal-complete" | "k3-depth-3" | "k3-depth-4" | "k3-depth-5";

export type RecursiveNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  children: RecursiveNode[];
  edges: RecursiveEdge[];
};

export type RecursiveEdge = {
  id: string;
  source: RecursiveNode;
  target: RecursiveNode;
};
