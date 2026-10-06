"use client";

import { useState } from "react";
import styles from "./traffic-light.module.css";

/** One parameter: a label and its mutually exclusive choices. Add a row to expose another parameter. */
export type OptionRow = {
  id: string;
  label: string;
  value: string;
  choices: readonly { id: string; label: string }[];
  onChange: (id: string) => void;
};

export default function Options({ rows }: { rows: readonly OptionRow[] }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.controls}>
    {open && <div id="traffic-light-options" className={styles.options}>
      {rows.map((row) => <div key={row.id} className={styles.row} role="group" aria-labelledby={`traffic-light-${row.id}`}>
        <span id={`traffic-light-${row.id}`} className={styles.label}>{row.label}</span>
        {row.choices.map((choice) => <button
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
