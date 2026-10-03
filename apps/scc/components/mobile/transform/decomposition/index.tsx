"use client";

import { useEffect, useRef, useState } from "react";
import { createDecomposition, type Decomposition as Engine, type DecompositionMode } from "./engine";
import "./decomposition.css";

const modes: { id: DecompositionMode; label: string }[] = [
  { id: "original", label: "원본" },
  { id: "decomposition", label: "분해" },
];

/** Mount beside any page to move it between itself and its categorical decomposition. */
export default function Decomposition() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DecompositionMode>("decomposition");
  const [progress, setProgress] = useState(1);
  const [lines, setLines] = useState(false);
  const [curve, setCurve] = useState(false);
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    const instance = createDecomposition();
    engine.current = instance;
    instance.setMode("decomposition");
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setLines(lines);
  }, [lines]);

  useEffect(() => {
    engine.current?.setShape(curve ? "curve" : "line");
  }, [curve]);

  const choose = (next: DecompositionMode) => {
    setMode(next);
    setProgress(next === "decomposition" ? 1 : 0);
    engine.current?.setMode(next);
  };

  const slide = (value: number) => {
    setMode("decomposition");
    setProgress(value);
    engine.current?.setProgress(value);
  };

  const state = mode === "original" ? "원본" : progress === 1 ? "분해" : `분해 ${progress.toFixed(2)}`;

  return (
    <div data-decomposition-ui className="decomposition-control">
      {open && (
        <div className="decomposition-panel" role="group" aria-label="분해 설정">
          <div className="decomposition-modes">
            {modes.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === "original" ? mode === "original" : mode === "decomposition" && progress === 1}
                onClick={() => choose(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="decomposition-label" htmlFor="decomposition-progress">
            위치
            <strong>{mode === "original" ? "0.00" : progress.toFixed(2)}</strong>
          </label>
          <input
            id="decomposition-progress"
            className="decomposition-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={mode === "original" ? 0 : progress}
            onChange={(event) => slide(Number(event.target.value))}
          />
          <div className="decomposition-range"><span>원본</span><span>분해</span></div>
          <button type="button" className="decomposition-option" aria-pressed={lines} onClick={() => setLines((value) => !value)}>
            이동 선
          </button>
          <button type="button" className="decomposition-option" aria-pressed={curve} onClick={() => setCurve((value) => !value)}>
            곡선
          </button>
        </div>
      )}
      <button type="button" className="decomposition-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {state}
      </button>
    </div>
  );
}
