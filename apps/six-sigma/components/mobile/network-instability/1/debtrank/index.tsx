"use client";

import { useEffect, useRef, useState } from "react";
import DebtRankGraph, { type DebtRankHandle } from "./graph";
import Strip, { type TraceHandle } from "./strip";
import { useStress } from "./use-stress";
import { impacts, institutions } from "./network";
import { layoutIds, layoutNames, type Layout } from "./layout";

const SHUFFLE_SECONDS = 5;

/** DebtRank's network (after Battiston et al. 2012, Fig. 3) under overlapping shocks. */
export default function DebtRankScene({ id, tempo }: { id: string; tempo: number }) {
  const [layout, setLayout] = useState<Layout>("a");
  const [shuffling, setShuffling] = useState(false);
  const graphRef = useRef<DebtRankHandle>(null);
  const traceRef = useRef<TraceHandle>(null);
  const shock = useStress(layout, tempo, graphRef, traceRef);

  useEffect(() => {
    if (!shuffling) return;
    const timer = window.setInterval(() => {
      setLayout((current) => {
        const others = layoutIds.filter((candidate) => candidate !== current);
        return others[Math.floor(Math.random() * others.length)];
      });
    }, SHUFFLE_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [shuffling]);

  const description = `${institutions.length} financial institutions and ${impacts.length} exposure links, after DebtRank (Battiston et al. 2012, Fig. 3); a synthetic network with the figure's core–periphery form. An arrow from A to B means B loses when A is in distress. Shocks overlap: single institutions are hit at random, and every few seconds a common shock hits all of them. Each ring fills with its institution's distress; a full, heavy ring has defaulted and passes on an extra loss. Placement ${layout}: ${layoutNames[layout]}. Tap an institution to add a shock.`;

  return (
    <>
      <DebtRankGraph ref={graphRef} onShock={shock} titleId={`${id}-title`} descriptionId={`${id}-description`} description={description} />
      <Strip ref={traceRef} layout={layout} setLayout={setLayout} shuffling={shuffling} setShuffling={setShuffling} />
    </>
  );
}
