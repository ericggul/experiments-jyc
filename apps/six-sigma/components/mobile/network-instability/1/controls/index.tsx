import { useRef, useState } from "react";
import styles from "../style/network-instability.module.css";

export default function Controls({ id, tempo, setTempo }: { id: string; tempo: number; setTempo: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);

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
        <div id={`${id}-settings`} className={styles.panel} role="group" aria-label="Network settings">
          <div className={styles.adjustment}>
            <label className={styles.controlLabel} htmlFor={`${id}-tempo`}>Tempo <strong>{tempo} rounds/s</strong></label>
            <input
              id={`${id}-tempo`} className={styles.slider} type="range"
              min="1" max="8" step="0.5" value={tempo}
              aria-valuetext={`${tempo} propagation rounds per second`}
              onChange={(event) => setTempo(Number(event.target.value))}
            />
            <div className={styles.range}><span>Slow</span><span>Fast</span></div>
          </div>
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
