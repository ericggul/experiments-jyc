"use client";

import { useEffect, useState } from "react";
import { HEAD_COUNTS, SIGNAL_PLANS, signalAt, type HeadCount, type SignalPlanId } from "./model/signal-cycle";
import TrafficLightCanvas, { type SignalConfig } from "./rendering/traffic-light-canvas";
import Options, { type OptionRow } from "./screen/options";
import styles from "./screen/traffic-light.module.css";

const planOf = (id: SignalPlanId) => SIGNAL_PLANS.find((plan) => plan.id === id) ?? SIGNAL_PLANS[0];
const PRESENCE = [{ id: "off", label: "없음" }, { id: "on", label: "있음" }] as const;

export default function TrafficLightOne() {
  const [planId, setPlanId] = useState<SignalPlanId>(SIGNAL_PLANS[0].id);
  const [config, setConfig] = useState<SignalConfig>({ headCount: 1, leftTurn: false, backHead: false, poleHead: false });
  const [lit, setLit] = useState(() => {
    const { phases, opposingOffset } = SIGNAL_PLANS[0];
    return { front: signalAt(phases, 0).lit, back: signalAt(phases, opposingOffset).lit };
  });

  // A newly chosen plan starts this approach at the onset of red; the opposing approach keeps its offset.
  useEffect(() => {
    const { phases, opposingOffset } = planOf(planId);
    const start = performance.now();
    let timer = 0;
    const schedule = () => {
      const elapsed = (performance.now() - start) / 1000;
      const front = signalAt(phases, elapsed);
      const back = signalAt(phases, elapsed + opposingOffset);
      setLit({ front: front.lit, back: back.lit });
      timer = window.setTimeout(schedule, Math.min(front.remaining, back.remaining) * 1000 + 5);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [planId]);

  const presenceRow = (id: string, label: string, key: "leftTurn" | "backHead" | "poleHead"): OptionRow => ({
    id,
    label,
    value: config[key] ? "on" : "off",
    choices: PRESENCE,
    onChange: (choice) => setConfig((current) => ({ ...current, [key]: choice === "on" })),
  });

  return <main className={styles.field}>
    <TrafficLightCanvas front={lit.front} back={lit.back} config={config} />
    <Options rows={[
      {
        id: "heads",
        label: "신호등",
        value: String(config.headCount),
        choices: HEAD_COUNTS.map((count) => ({ id: String(count), label: `${count}개` })),
        onChange: (id) => setConfig((current) => ({ ...current, headCount: Number(id) as HeadCount })),
      },
      presenceRow("left-turn", "좌회전", "leftTurn"),
      presenceRow("back", "뒷면 신호등", "backHead"),
      presenceRow("pole", "기둥 신호등", "poleHead"),
      {
        id: "plan",
        label: "신호 주기",
        value: planId,
        choices: SIGNAL_PLANS.map(({ id, label }) => ({ id, label })),
        onChange: (id) => setPlanId(id as SignalPlanId),
      },
    ]} />
  </main>;
}
