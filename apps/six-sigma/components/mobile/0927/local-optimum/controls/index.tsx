import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import styles from "../local-optimum.module.css";
import type { Plane } from "../model/dynamics";

const planeOptions: { value: Plane; label: string }[] = [
  { value: "1d", label: "1D · ray" },
  { value: "2d", label: "2D · disc" },
];

type Props = {
  id: string;
  plane: Plane;
  setPlane: Dispatch<SetStateAction<Plane>>;
  coupling: number;
  setCoupling: Dispatch<SetStateAction<number>>;
  tempo: number;
  setTempo: Dispatch<SetStateAction<number>>;
};

export default function Controls({ id, plane, setPlane, coupling, setCoupling, tempo, setTempo }: Props) {
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
        <div id={`${id}-settings`} className={styles.panel} role="group" aria-label="System settings">
          <fieldset className={styles.modeGroup}>
            <legend>Plane</legend>
            {planeOptions.map(({ value, label }) => (
              <label key={value}>
                <input type="radio" name={`${id}-plane`} value={value} checked={plane === value} onChange={() => setPlane(value)} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className={styles.adjustment}>
            <label className={styles.controlLabel} htmlFor={`${id}-coupling`}>Coupling <strong>{coupling.toFixed(2)}</strong></label>
            <input
              id={`${id}-coupling`} className={styles.slider} type="range"
              min="0" max="0.5" step="0.01" value={coupling}
              aria-valuetext={`Each node takes ${Math.round(coupling * 100)} percent of its next state from the other five`}
              onChange={(event) => setCoupling(Number(event.target.value))}
            />
            <div className={styles.range}><span>Isolated</span><span>Entangled</span></div>
          </div>
          <div className={styles.adjustment}>
            <label className={styles.controlLabel} htmlFor={`${id}-tempo`}>Tempo <strong>{tempo}/s</strong></label>
            <input
              id={`${id}-tempo`} className={styles.slider} type="range"
              min="2" max="16" step="1" value={tempo}
              aria-valuetext={`${tempo} iterations per second`}
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
