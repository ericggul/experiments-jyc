import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import styles from "../k6.module.css";
import { k3Depths } from "../model/fractal-k3";
import type { GraphMode, ConnectionWeights } from "../model/types";
import type { LineStyle } from "../edges/geometry";

type Motion = "static" | "flow";
const edgeOptions: { value: LineStyle; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "cubic", label: "Cubic Bezier" },
  { value: "cubic-directional", label: "Cubic Bezier directional" },
];
const graphOptions: { value: GraphMode; label: string }[] = [
  { value: "k6", label: "K6" },
  { value: "fractal", label: "Fractal K6 · opt 1" },
  { value: "fractal-complete", label: "Fractal K6 · opt 2" },
  ...k3Depths.map((depth) => ({
    value: `k3-depth-${depth}` as GraphMode,
    label: `Fractal K3 · depth ${depth} · opt 2`,
  })),
];

type Props = {
  id: string;
  mode: GraphMode;
  setMode: Dispatch<SetStateAction<GraphMode>>;
  motion: Motion;
  setMotion: Dispatch<SetStateAction<Motion>>;
  lineStyle: LineStyle;
  setLineStyle: Dispatch<SetStateAction<LineStyle>>;
  weights: ConnectionWeights;
  setWeights: Dispatch<SetStateAction<ConnectionWeights>>;
  rate: number;
  setRate: Dispatch<SetStateAction<number>>;
};

export default function Controls({ id, mode, setMode, motion, setMotion, lineStyle, setLineStyle, weights, setWeights, rate, setRate }: Props) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const fractal = mode !== "k6";
  const flowing = motion === "flow";

  return (
    <div
      className={styles.control}
      onKeyDown={(event) => {
        if (event.key === "Escape" && editing) {
          setEditing(false);
          editRef.current?.focus();
        }
      }}
    >
      {editing && (
        <div id={`${id}-settings`} className={styles.panel} role="group" aria-label="Graph settings">
          <fieldset className={`${styles.modeGroup} ${styles.graphModes}`}>
            <legend>Graph</legend>
            {graphOptions.map(({ value, label }) => (
              <label key={value}>
                <input type="radio" name={`${id}-graph`} value={value} checked={mode === value} onChange={() => setMode(value)} />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset className={`${styles.modeGroup} ${styles.lineModes}`}>
            <legend>Edge</legend>
            {edgeOptions.map(({ value, label }) => (
              <label key={value}>
                <input type="radio" name={`${id}-line`} value={value} checked={lineStyle === value} onChange={() => setLineStyle(value)} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className={styles.adjustment}>
            <label className={styles.controlLabel} htmlFor={`${id}-within`}>Within-node weight <strong>{weights.within.toFixed(1)}</strong></label>
            <input
              id={`${id}-within`} className={styles.slider} type="range"
              min="0" max="3" step="0.1" value={weights.within} disabled={!fractal}
              onChange={(event) => setWeights((current) => ({ ...current, within: Number(event.target.value) }))}
            />
          </div>
          <div className={styles.adjustment}>
            <label className={styles.controlLabel} htmlFor={`${id}-between`}>Inter-node weight <strong>{weights.between.toFixed(1)}</strong></label>
            <input
              id={`${id}-between`} className={styles.slider} type="range"
              min="0" max="3" step="0.1" value={weights.between}
              onChange={(event) => setWeights((current) => ({ ...current, between: Number(event.target.value) }))}
            />
          </div>
          <fieldset className={styles.modeGroup}>
            <legend>Motion</legend>
            <label>
              <input type="radio" name={`${id}-motion`} value="static" checked={!flowing} onChange={() => setMotion("static")} />
              Static
            </label>
            <label>
              <input type="radio" name={`${id}-motion`} value="flow" checked={flowing} onChange={() => setMotion("flow")} />
              Flow
            </label>
          </fieldset>
          {flowing && (
            <div className={styles.adjustment}>
              <label className={styles.controlLabel} htmlFor={`${id}-rate`}>Flow rate <strong>{rate.toFixed(1)}/s</strong></label>
              <input
                id={`${id}-rate`} className={styles.slider} type="range"
                min="0.5" max="8" step="0.5" value={rate}
                aria-valuetext={`${rate} expected signals per second; higher values also increase travel speed`}
                onChange={(event) => setRate(Number(event.target.value))}
              />
              <div className={styles.range}><span>Sparse</span><span>Rapid</span></div>
            </div>
          )}
        </div>
      )}
      <button
        ref={editRef} type="button" className={styles.controlTrigger}
        aria-expanded={editing} aria-controls={editing ? `${id}-settings` : undefined}
        onClick={() => setEditing((open) => !open)}
      >
        edit
      </button>
    </div>
  );
}
