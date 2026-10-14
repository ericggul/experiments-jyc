"use client";

import { useEffect, useRef, useState } from "react";
import { spoqa } from "@/components/advertisement/tv/fonts";
import { DEFAULT_LATIN_FONT, type LatinFont } from "./fonts";
import styles from "./grid.module.css";
import { DEFAULT_PALETTE, type Palette } from "./palette";
import { GRAPH, RadarChart, RadarLabels } from "./radar";
import { SCENE_LENGTH, type GraphScene } from "./scenes";

export type Language = "ko" | "en";

/** How the English labels are set: face, weight and size, all adjustable from the wall. */
export type LatinStyle = { font: LatinFont; weight: number; size: number };
export const DEFAULT_LATIN: LatinStyle = { font: DEFAULT_LATIN_FONT, weight: 700, size: 34 };

/** Looping scene clock for one graph: holds at `start` while paused, runs at `rate` otherwise. */
function useGraphClock(start: number, paused: boolean, rate: number) {
  const [t, setT] = useState(start);
  const ref = useRef(start);
  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      ref.current = (ref.current + delta * rate) % SCENE_LENGTH;
      setT(ref.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, rate]);
  return t;
}

/**
 * One graph: the polygon chart with its axis labels, in a GRAPH-sized box scaled into its cell.
 * The wall's unit; nothing of the ad around it.
 */
export function Graph({ scene, language, latin = DEFAULT_LATIN, palette = DEFAULT_PALETTE, start, paused, rate, scale, left, top }: {
  scene: GraphScene;
  language: Language;
  latin?: LatinStyle;
  palette?: Palette;
  start: number;
  paused: boolean;
  rate: number;
  scale: number;
  left: number;
  top: number;
}) {
  const t = useGraphClock(start, paused, rate);
  const labels = scene.axes.map((axis) => (language === "en" ? axis.en : axis.label));
  return (
    <div
      className={`${styles.graph} ${spoqa.className}`}
      style={{ left, top, width: GRAPH.width, height: GRAPH.height, transform: `scale(${scale})` }}
      role="img"
      aria-label={scene.label}
    >
      <RadarChart axes={scene.axes} t={t} palette={palette} />
      {language === "en" ? (
        <RadarLabels axes={scene.axes} labels={labels} t={t} fontSize={latin.size} fontWeight={Math.min(latin.weight, latin.font.max)} className={latin.font.className} palette={palette} />
      ) : (
        <RadarLabels axes={scene.axes} labels={labels} t={t} palette={palette} />
      )}
    </div>
  );
}
