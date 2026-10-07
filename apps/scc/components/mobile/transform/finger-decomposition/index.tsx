"use client";

import { useEffect, useRef, useState } from "react";
import { createFingerDecomposition, type FingerDecomposition as Engine, type FingerDecompositionSettings } from "./engine";
import "./finger-decomposition.css";

const initial: FingerDecompositionSettings = { reach: 0.14 };

/** Mount beside any page: fingers drag it apart as a liquid sheet. */
export default function FingerDecomposition() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(initial);
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    const instance = createFingerDecomposition(initial);
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, []);

  const change = (next: Partial<FingerDecompositionSettings>) => {
    setSettings((value) => ({ ...value, ...next }));
    engine.current?.set(next);
  };

  return (
    <div data-finger-decomposition-ui className="finger-decomposition-control">
      {open && (
        <div className="finger-decomposition-panel" role="group" aria-label="핑거 분해 설정">
          <button type="button" onClick={() => engine.current?.reassemble()}>
            되돌리기
          </button>
          <label className="finger-decomposition-label" htmlFor="finger-decomposition-reach">
            범위
            <strong>{settings.reach.toFixed(2)}</strong>
          </label>
          <input
            id="finger-decomposition-reach"
            className="finger-decomposition-slider"
            type="range"
            min="0.05"
            max="0.6"
            step="0.01"
            value={settings.reach}
            onChange={(event) => change({ reach: Number(event.target.value) })}
          />
        </div>
      )}
      <button type="button" className="finger-decomposition-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        옵션
      </button>
    </div>
  );
}
