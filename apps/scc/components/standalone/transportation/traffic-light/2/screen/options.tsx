"use client";

import { useState } from "react";
import styles from "./traffic-light.module.css";

type RowBase = {
  id: string;
  /** Rows sharing a section sit together; sections are set apart by space. */
  section?: string;
};

/** A parameter with mutually exclusive choices. */
export type ChoiceRow = RowBase & {
  kind?: "choice";
  label: string;
  value: string;
  choices: readonly { id: string; label: string }[];
  onChange: (id: string) => void;
};

/** A continuous parameter set with a slider; its value is shown beside it in `unit`. */
export type RangeRow = RowBase & {
  kind: "range";
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

/** A one-off action, such as drawing a stochastic arrangement again. */
export type ActionRow = RowBase & {
  kind: "action";
  label: string;
  action: string;
  onAction: () => void;
};

/** One parameter per row. Add a row to expose another parameter. */
export type OptionRow = ChoiceRow | RangeRow | ActionRow;

export default function Options({ rows }: { rows: readonly OptionRow[] }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.controls}>
    {open && <div id="traffic-light-options" className={styles.options}>
      {rows.map((row, index) => <div
        key={row.id}
        className={styles.row}
        data-section-start={index > 0 && row.section !== rows[index - 1].section ? "" : undefined}
        role="group"
        aria-labelledby={`traffic-light-${row.id}`}
      >
        <span id={`traffic-light-${row.id}`} className={styles.label}>{row.label}</span>
        {row.kind === "action"
          ? <button type="button" className={styles.control} onClick={row.onAction}>{row.action}</button>
          : row.kind === "range"
          ? <label className={styles.range}>
            <input
              type="range"
              min={row.min}
              max={row.max}
              step={row.step}
              value={row.value}
              aria-labelledby={`traffic-light-${row.id}`}
              aria-valuetext={`${row.value}${row.unit}`}
              onChange={(event) => row.onChange(Number(event.currentTarget.value))}
            />
            <output className={styles.value}>{row.value}{row.unit}</output>
          </label>
          : row.choices.map((choice) => <button
            key={choice.id}
            type="button"
            className={styles.control}
            aria-pressed={row.value === choice.id}
            onClick={() => row.onChange(choice.id)}
          >{choice.label}</button>)}
      </div>)}
    </div>}
    <button
      type="button"
      className={styles.control}
      aria-expanded={open}
      aria-controls="traffic-light-options"
      onClick={() => setOpen((value) => !value)}
    >{open ? "닫기" : "옵션"}</button>
  </div>;
}
