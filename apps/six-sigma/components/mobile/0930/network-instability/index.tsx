"use client";

import { useId, useState } from "react";
import styles from "./style/network-instability.module.css";
import DebtRankScene from "./debtrank";
import Controls from "./controls";

/** DebtRank (Battiston et al. 2012, Fig. 3) on one network, morphing between five placements. */
export default function NetworkInstability() {
  const id = useId();
  const [tempo, setTempo] = useState(3);

  return (
    <main className={styles.surface}>
      <DebtRankScene id={id} tempo={tempo} />
      <Controls id={id} tempo={tempo} setTempo={setTempo} />
    </main>
  );
}
