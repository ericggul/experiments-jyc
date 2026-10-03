"use client";

import type { CSSProperties } from "react";
import { THRESHOLD_MODES, type ThresholdMode } from "../model/threshold";
import styles from "./xyzt-city.module.css";

const MODE_LABELS: Record<ThresholdMode, { text: string; aria: string }> = {
  below: { text: "≤ Z", aria: "Buildings at or below the height" },
  above: { text: "≥ Z", aria: "Buildings reaching the height" },
};

export function formatHeight(heightM: number) {
  return heightM < 10 ? `${heightM.toFixed(1)} m` : `${Math.round(heightM)} m`;
}

export default function HeightControl({
  control,
  thresholdM,
  mode,
  sweeping,
  canSweep,
  onControl,
  onMode,
  onToggleSweep,
}: {
  control: number;
  thresholdM: number;
  mode: ThresholdMode;
  sweeping: boolean;
  canSweep: boolean;
  onControl: (control: number) => void;
  onMode: (mode: ThresholdMode) => void;
  onToggleSweep: () => void;
}) {
  const readout = formatHeight(thresholdM);
  return <div className={styles.control}>
    <div className={styles.modes} role="group" aria-label="Threshold side">
      {THRESHOLD_MODES.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.text}
          aria-pressed={option === mode}
          aria-label={MODE_LABELS[option].aria}
          onClick={() => onMode(option)}
        >
          {MODE_LABELS[option].text}
        </button>
      ))}
    </div>
    <div className={styles.track} style={{ "--control": control } as CSSProperties}>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={control}
        aria-label="Height"
        aria-orientation="vertical"
        aria-valuetext={readout}
        onChange={(event) => onControl(Number(event.currentTarget.value))}
      />
      <output className={`${styles.text} ${styles.readout}`} aria-hidden="true">{readout}</output>
    </div>
    <button
      type="button"
      className={styles.text}
      aria-pressed={sweeping}
      disabled={!canSweep}
      onClick={onToggleSweep}
    >
      {sweeping ? "Pause" : "Play"}
    </button>
  </div>;
}
