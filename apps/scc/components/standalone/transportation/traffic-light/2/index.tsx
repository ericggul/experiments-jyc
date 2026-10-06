"use client";

import { useMemo, useState } from "react";
import {
  arrangePoles, initialValues, layoutOf, LAYOUTS, VARIATIONS, type ArrangementState, type Parameter,
} from "./model/arrangement";
import { LAMP_FACES } from "./model/lamp-faces";
import { HEAD_COUNTS, SIGNAL_PLANS, type HeadCount } from "./model/signal-cycle";
import TrafficLightCanvas, { type SignalConfig } from "./rendering/traffic-light-canvas";
import Options, { type OptionRow } from "./screen/options";
import styles from "./screen/traffic-light.module.css";

/** Every pole runs the default plan: red 10 s, green 8 s, amber 3 s. */
const PLAN = SIGNAL_PLANS[0];
const PRESENCE = [{ id: "off", label: "없음" }, { id: "on", label: "있음" }] as const;
/** Pole spacing along the layout's path, in metres. */
const SPACING = { min: 1, max: 50 } as const;

/**
 * The opening setup, chosen 2026-10-06: a dense 15 × 15 grid of single heads
 * with back and pole heads, uniform heights over ±4.3 m, off-sync signals and
 * the three portraits. Registry parameters not named here keep their own initial values.
 */
const OPENING = {
  config: { headCount: 1, leftTurn: false, backHead: true, poleHead: true } satisfies SignalConfig,
  lampFace: "presidents",
  layout: "grid",
  spacing: 2,
  values: {
    "grid.rows": 15,
    "grid.columns": 15,
    "height.distribution": "uniform",
    "height.spread": 4.3,
    "timing.sync": "apart",
  },
} as const;

/** An option row for one registry parameter, scoped to its owner. */
function parameterRow(
  owner: string, parameter: Parameter, section: string,
  state: ArrangementState, update: (key: string, value: string | number) => void,
): OptionRow {
  const key = `${owner}.${parameter.id}`;
  return parameter.kind === "range"
    ? {
      kind: "range", id: key, section, label: parameter.label, value: Number(state.values[key]),
      min: parameter.min, max: parameter.max, step: parameter.step, unit: parameter.unit,
      onChange: (value) => update(key, value),
    }
    : {
      id: key, section, label: parameter.label, value: String(state.values[key]), choices: parameter.choices,
      onChange: (value) => update(key, value),
    };
}

export default function TrafficLightTwo() {
  const [config, setConfig] = useState<SignalConfig>(OPENING.config);
  const [arrangement, setArrangement] = useState<ArrangementState>(() => ({
    layout: OPENING.layout, spacing: OPENING.spacing, seed: 1, values: { ...initialValues(), ...OPENING.values },
  }));
  const poles = useMemo(() => arrangePoles(arrangement), [arrangement]);
  const [lampFace, setLampFace] = useState<string>(OPENING.lampFace);

  const update = (key: string, value: string | number) =>
    setArrangement((current) => ({ ...current, values: { ...current.values, [key]: value } }));

  const presenceRow = (id: string, label: string, key: "leftTurn" | "backHead" | "poleHead"): OptionRow => ({
    id,
    section: "signal",
    label,
    value: config[key] ? "on" : "off",
    choices: PRESENCE,
    onChange: (choice) => setConfig((current) => ({ ...current, [key]: choice === "on" })),
  });

  const layout = layoutOf(arrangement.layout);
  const rows: OptionRow[] = [
    // The signal on each pole.
    {
      id: "heads",
      section: "signal",
      label: "신호등",
      value: String(config.headCount),
      choices: HEAD_COUNTS.map((count) => ({ id: String(count), label: `${count}개` })),
      onChange: (id) => setConfig((current) => ({ ...current, headCount: Number(id) as HeadCount })),
    },
    presenceRow("left-turn", "좌회전", "leftTurn"),
    presenceRow("back", "뒷면 신호등", "backHead"),
    presenceRow("pole", "기둥 신호등", "poleHead"),
    {
      id: "face",
      section: "signal",
      label: "램프",
      value: lampFace,
      choices: LAMP_FACES.map(({ id, label }) => ({ id, label })),
      onChange: setLampFace,
    },
    // Where the poles stand: the layout and only its own parameters.
    {
      id: "layout",
      section: "layout",
      label: "배치",
      value: arrangement.layout,
      choices: LAYOUTS.map(({ id, label }) => ({ id, label })),
      onChange: (id) => setArrangement((current) => ({ ...current, layout: id })),
    },
    ...(layout.usesSpacing ? [{
      kind: "range" as const,
      id: "spacing",
      section: "layout",
      label: "간격",
      value: arrangement.spacing,
      min: SPACING.min,
      max: SPACING.max,
      step: 1,
      unit: "m",
      onChange: (spacing: number) => setArrangement((current) => ({ ...current, spacing })),
    }] : []),
    ...layout.parameters.map((parameter) => parameterRow(layout.id, parameter, "layout", arrangement, update)),
    // How poles differ from one another; stochastic variations can be drawn again.
    ...VARIATIONS.flatMap((variation): OptionRow[] => [
      ...variation.parameters.map((parameter) => parameterRow(variation.id, parameter, `variation-${variation.id}`, arrangement, update)),
      ...(variation.stochastic ? [{
        kind: "action" as const,
        id: `${variation.id}.reshuffle`,
        section: `variation-${variation.id}`,
        label: "",
        action: "다시 섞기",
        onAction: () => setArrangement((current) => ({ ...current, seed: current.seed + 1 })),
      }] : []),
    ]),
  ];

  return <main className={styles.field}>
    <TrafficLightCanvas plan={PLAN} config={config} poles={poles} lampFace={lampFace} />
    <Options rows={rows} />
  </main>;
}
