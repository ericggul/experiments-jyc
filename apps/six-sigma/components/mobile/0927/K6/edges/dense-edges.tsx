"use client";

import { useEffect, useRef } from "react";
import type { K3Graph } from "../model/fractal-k3";
import type { ConnectionWeights } from "../model/types";
import { appendEdgeToPath, type LineStyle } from "./geometry";

type Batch = { path: Path2D; width: number; scope: "within" | "between"; count: number };
const EDGES_PER_PATH = 64;
const PATHS_PER_TICK = 8;

/** DPR-1 static topology, painted in bounded chunks only after edits/resizes. */
export default function DenseEdges({ graph, weights, lineStyle }: { graph: K3Graph; weights: ConnectionWeights; lineStyle: LineStyle }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const weightsRef = useRef(weights);

  useEffect(() => {
    weightsRef.current = weights;
    redrawRef.current?.();
  }, [weights]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const groups = new Map<string, Batch[]>();
    for (const edge of graph.edges) {
      const key = `${edge.layer}:${edge.scope}`;
      let group = groups.get(key);
      if (!group) { group = []; groups.set(key, group); }
      let batch = group[group.length - 1];
      if (!batch || batch.count === EDGES_PER_PATH) {
        batch = { path: new Path2D(), width: edge.layer === "inner" ? 0.65 : 0.22, scope: edge.scope, count: 0 };
        group.push(batch);
      }
      appendEdgeToPath(batch.path, edge, lineStyle);
      batch.count++;
    }
    const batches = [...groups.values()].flat();
    let timer: number | undefined;
    let position = 0;
    let scale = 1;
    let drawingWeights = weightsRef.current;

    function paintChunk() {
      timer = undefined;
      const end = Math.min(batches.length, position + PATHS_PER_TICK);
      for (; position < end; position++) {
        const batch = batches[position];
        const weight = drawingWeights[batch.scope];
        if (weight <= 0) continue;
        context!.lineWidth = batch.width * weight / scale;
        context!.stroke(batch.path);
      }
      if (position < batches.length) timer = window.setTimeout(paintChunk, 42);
    }

    function start() {
      timer = undefined;
      const size = Math.max(1, Math.min(680, Math.round(canvas.getBoundingClientRect().width)));
      canvas.width = size;
      canvas.height = size;
      scale = size / 400;
      context!.setTransform(scale, 0, 0, scale, 0, 0);
      context!.strokeStyle = "#fff";
      context!.lineCap = "round";
      drawingWeights = weightsRef.current;
      position = 0;
      paintChunk();
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(start, 42);
    }
    redrawRef.current = schedule;
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    start();
    return () => {
      redrawRef.current = null;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [graph, lineStyle]);

  return (
    <foreignObject x="0" y="0" width="400" height="400" pointerEvents="none" aria-hidden="true">
      <canvas ref={canvasRef} width="400" height="400" style={{ display: "block", width: "100%", height: "100%" }} />
    </foreignObject>
  );
}
