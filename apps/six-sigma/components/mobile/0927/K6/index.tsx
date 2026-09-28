"use client";

import { useId, useState } from "react";
import styles from "./k6.module.css";
import { vertices } from "./model/k6";
import { fractalVertices } from "./model/fractal-k6";
import Flow from "./flow";
import { getK3ForMode } from "./model/fractal-k3";
import Edges from "./edges";
import Controls from "./controls";
import type { GraphMode, ConnectionWeights } from "./model/types";
import type { LineStyle } from "./edges/geometry";

export default function K6({ animate = true }: { animate?: boolean }) {
  const [mode, setMode] = useState<GraphMode>("k6");
  const [motion, setMotion] = useState<"static" | "flow">(animate ? "flow" : "static");
  const [rate, setRate] = useState(2.5);
  const [lineStyle, setLineStyle] = useState<LineStyle>("straight");
  const [weights, setWeights] = useState<ConnectionWeights>({ within: 1, between: 1 });
  const id = useId();
  const fractal = mode !== "k6";
  const flowing = motion === "flow";
  const k3 = getK3ForMode(mode);
  const graphVertices = k3 ? k3.vertices : fractal ? fractalVertices : vertices;
  const title = k3 ? `Fractal K3 · depth ${k3.depth} · opt 2` : fractal ? `Fractal K6 · opt ${mode === "fractal" ? 1 : 2}` : "K6";

  return (
    <main className={styles.surface}>
      <svg
        className={styles.graph}
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-description`}>
          {k3
            ? `A recursively nested triangular K3 at depth ${k3.depth}, with ${k3.vertices.length} leaf nodes and all ${k3.edges.length} leaf-to-leaf edges under option 2.`
            : mode === "fractal-complete"
            ? "K6 within K6 with all-to-all leaf connections: thirty-six leaf nodes, ninety internal edges, and five hundred forty edges between groups, for six hundred thirty total."
            : fractal
            ? "A recursive K6: each of its six parent nodes is itself a complete K6. Thirty-six leaf nodes, ninety internal edges, and fifteen parent-level edges connecting whole child graphs."
            : "Complete graph with six vertices on a regular hexagon and fifteen white edges on black."}
          {" Edge crossings are not additional vertices."}
          {flowing && (lineStyle === "cubic-directional"
            ? " Signals occur independently at random times and travel from each edge's first node to its second node."
            : " Signals occur independently at random times and travel in either direction along the edges.")}
        </desc>
        <g className={styles.edges} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={flowing ? 0.5 : 1}>
          <Edges mode={mode} k3={k3} weights={weights} lineStyle={lineStyle} />
        </g>
        {flowing && <Flow key={`${mode}:${lineStyle}`} mode={mode} rate={rate} weights={weights} lineStyle={lineStyle} />}
        <g fill="currentColor">
          {graphVertices.map(({ id, x, y }) => (
            <circle key={id} cx={x} cy={y} r={fractal ? 1.8 : 2.5} />
          ))}
        </g>
      </svg>
      <Controls id={id} mode={mode} setMode={setMode} motion={motion} setMotion={setMotion} lineStyle={lineStyle} setLineStyle={setLineStyle} weights={weights} setWeights={setWeights} rate={rate} setRate={setRate} />
    </main>
  );
}
