"use client";

import { useRef, useState, type ReactNode } from "react";
import type { EyeRatios } from "./model/gaze";
import GazeTracking from "./index";
import InterfaceSurface from "./interface-surface";
import styles from "./screen.module.css";

type Mode = "circle" | "liquid" | "spacetime";

export default function GazeTrackingCloneExperiment({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("liquid");
  const [diameter, setDiameter] = useState(100);
  const [liquidRadius, setLiquidRadius] = useState(180);
  const [liquidStrength, setLiquidStrength] = useState(50);
  const [spacetimeRadius, setSpacetimeRadius] = useState(230);
  const [spacetimeStrength, setSpacetimeStrength] = useState(60);
  const [showGrid, setShowGrid] = useState(true);
  const gazeRef = useRef<EyeRatios>({
    left: { x: 0.48, y: 0.5 },
    right: { x: 0.52, y: 0.5 },
  });

  return (
    <>
      <div data-gaze-clone>{children}</div>
      {mode !== "circle" && (
        <InterfaceSurface
          key={mode}
          gazeRef={gazeRef}
          mode={mode}
          radius={mode === "liquid" ? liquidRadius : spacetimeRadius}
          strength={mode === "liquid" ? liquidStrength : spacetimeStrength}
          showGrid={mode === "spacetime" && showGrid}
        />
      )}
      <GazeTracking variant={2} mode={mode} diameter={diameter} gazeRef={gazeRef} />
      <div className={styles.control} data-gaze-overlay>
        {open && (
          <div className={styles.panel} role="group" aria-label="시선 필터 설정">
            <fieldset className={styles.modeGroup}>
              <legend>효과</legend>
              <label><input type="radio" name="gaze-effect" value="circle" checked={mode === "circle"} onChange={() => setMode("circle")} />원</label>
              <label><input type="radio" name="gaze-effect" value="liquid" checked={mode === "liquid"} onChange={() => setMode("liquid")} />액화</label>
              <label><input type="radio" name="gaze-effect" value="spacetime" checked={mode === "spacetime"} onChange={() => setMode("spacetime")} />시공간</label>
            </fieldset>
            {mode === "circle" && (
              <>
                <label className={styles.controlLabel} htmlFor="gaze-circle-size">원 크기 <strong>{diameter}px</strong></label>
                <input id="gaze-circle-size" className={styles.slider} type="range" min="50" max="300" step="1" value={diameter} onChange={(event) => setDiameter(Number(event.target.value))} />
                <div className={styles.range}><span>50px</span><span>300px</span></div>
              </>
            )}
            {mode === "liquid" && (
              <>
                <div className={styles.adjustment}>
                  <label className={styles.controlLabel} htmlFor="gaze-liquid-radius">반지름 <strong>{liquidRadius}px</strong></label>
                  <input id="gaze-liquid-radius" className={styles.slider} type="range" min="80" max="400" step="5" value={liquidRadius} onChange={(event) => setLiquidRadius(Number(event.target.value))} />
                  <div className={styles.range}><span>80px</span><span>400px</span></div>
                </div>
                <div className={styles.adjustment}>
                  <label className={styles.controlLabel} htmlFor="gaze-liquid-strength">강도 <strong>{liquidStrength}</strong></label>
                  <input id="gaze-liquid-strength" className={styles.slider} type="range" min="0" max="100" step="1" value={liquidStrength} onChange={(event) => setLiquidStrength(Number(event.target.value))} />
                  <div className={styles.range}><span>0</span><span>100</span></div>
                </div>
              </>
            )}
            {mode === "spacetime" && (
              <>
                <div className={styles.adjustment}>
                  <label className={styles.controlLabel} htmlFor="gaze-spacetime-radius">범위 <strong>{spacetimeRadius}px</strong></label>
                  <input id="gaze-spacetime-radius" className={styles.slider} type="range" min="100" max="450" step="5" value={spacetimeRadius} onChange={(event) => setSpacetimeRadius(Number(event.target.value))} />
                  <div className={styles.range}><span>100px</span><span>450px</span></div>
                </div>
                <div className={styles.adjustment}>
                  <label className={styles.controlLabel} htmlFor="gaze-spacetime-strength">변형 <strong>{spacetimeStrength}</strong></label>
                  <input id="gaze-spacetime-strength" className={styles.slider} type="range" min="0" max="100" step="1" value={spacetimeStrength} onChange={(event) => setSpacetimeStrength(Number(event.target.value))} />
                  <div className={styles.range}><span>0</span><span>100</span></div>
                </div>
                <label className={styles.gridToggle}>
                  <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />그리드
                </label>
              </>
            )}
          </div>
        )}
        <button type="button" className={styles.controlTrigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          필터 {mode === "circle" ? `원 ${diameter}px` : mode === "liquid" ? "액화" : "시공간"}
        </button>
      </div>
    </>
  );
}
