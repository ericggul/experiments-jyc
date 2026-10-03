"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LOWER_MANHATTAN_URL, type CityData } from "./model/city";
import {
  SWEEP_HZ,
  advanceSweep,
  heightAtControl,
  sweepStart,
  type ThresholdMode,
} from "./model/threshold";
import CityCanvas from "./rendering/city-canvas";
import HeightControl from "./screen/height-control";
import styles from "./screen/xyzt-city.module.css";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

type Load =
  | { status: "loading" }
  | { status: "ready"; data: CityData }
  | { status: "error"; message: string };

export default function XyztCityOne() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [control, setControl] = useState(1);
  const [mode, setMode] = useState<ThresholdMode>("below");
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const sweeping = playing && !reducedMotion;
  const controlRef = useRef(1);
  const resumable = useRef(false);

  const applyControl = useCallback((next: number) => {
    controlRef.current = next;
    setControl(next);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    fetch(LOWER_MANHATTAN_URL, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json() as Promise<CityData>;
      })
      .then((data) => setLoad({ status: "ready", data }))
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        setLoad({ status: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (!sweeping) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const seconds = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const next = advanceSweep(controlRef.current, seconds, mode);
      if (next === null) {
        applyControl(mode === "below" ? 1 : 0);
        resumable.current = false;
        setPlaying(false);
      } else {
        applyControl(next);
      }
    }, 1000 / SWEEP_HZ);
    return () => window.clearInterval(timer);
  }, [sweeping, mode, applyControl]);

  const onControl = useCallback((next: number) => {
    resumable.current = false;
    setPlaying(false);
    applyControl(next);
  }, [applyControl]);

  const onMode = useCallback((next: ThresholdMode) => {
    resumable.current = false;
    setPlaying(false);
    setMode(next);
  }, []);

  const onToggleSweep = useCallback(() => {
    if (sweeping) {
      resumable.current = true;
      setPlaying(false);
      return;
    }
    if (reducedMotion) return;
    if (!resumable.current) applyControl(sweepStart(mode));
    resumable.current = false;
    setPlaying(true);
  }, [sweeping, reducedMotion, mode, applyControl]);

  if (load.status === "error") {
    return <main className={styles.field}>
      <p className={`${styles.text} ${styles.status}`}>The city data could not be loaded ({load.message}).</p>
    </main>;
  }

  const data = load.status === "ready" ? load.data : null;
  const maxHeightM = data?.maxHeightM ?? 0;
  const thresholdM = heightAtControl(control, maxHeightM);

  return <main className={styles.field}>
    {data && <CityCanvas data={data} thresholdM={thresholdM} mode={mode} />}
    {data && <HeightControl
      control={control}
      thresholdM={thresholdM}
      mode={mode}
      sweeping={sweeping}
      canSweep={!reducedMotion}
      onControl={onControl}
      onMode={onMode}
      onToggleSweep={onToggleSweep}
    />}
  </main>;
}
