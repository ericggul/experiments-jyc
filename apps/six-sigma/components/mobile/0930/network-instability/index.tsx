"use client";

import { useId, useMemo, useRef, useState } from "react";
import styles from "./style/network-instability.module.css";
import { panels, type PanelId } from "./model/configurations";
import { spectralRadius } from "./model/spectral";
import Network, { type NetworkHandle } from "./view/network";
import LambdaAxis from "./view/lambda-axis";
import { usePropagation } from "./view/use-propagation";
import Controls from "./controls";

/** λmax / ω for each panel; the link pattern fixes it, ω only scales it. */
const ratios = panels.map((panel) => ({ id: panel.id, ratio: spectralRadius(panel.links) }));

export default function NetworkInstability() {
  const id = useId();
  const [panelId, setPanelId] = useState<PanelId>("a");
  const [omega, setOmega] = useState(1);
  const [tempo, setTempo] = useState(3);
  const panel = panels.find((item) => item.id === panelId)!;
  const marks = useMemo(() => ratios.map(({ id, ratio }) => ({ id, lambda: ratio * omega })), [omega]);
  const networkRef = useRef<NetworkHandle>(null);
  const shockBank = usePropagation(panel, omega, tempo, networkRef);
  const lambda = marks.find((mark) => mark.id === panelId)!.lambda;

  const description = `Configuration ${panelId} of Bardoscia et al. 2017, Fig. 3: eight banks and ${panel.links.length} weighted links, λmax ${lambda.toFixed(4)}. ${lambda < 1 ? "Below 1, a shock fades as it travels the loops." : "Above 1, a shock returns stronger around the loops until banks default."} Each ring fills with its bank's distress. Tap a bank to shock it.`;

  return (
    <main className={styles.surface}>
      <Network ref={networkRef} panel={panel} onShock={shockBank} titleId={`${id}-title`} descriptionId={`${id}-description`} description={description} />
      <LambdaAxis marks={marks} current={panelId} select={setPanelId} />
      <Controls id={id} omega={omega} setOmega={setOmega} tempo={tempo} setTempo={setTempo} />
    </main>
  );
}
