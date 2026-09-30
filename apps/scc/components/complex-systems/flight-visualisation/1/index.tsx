"use client";

import { useEffect, useRef } from "react";
import { readOptions } from "./config";
import { startFlightVisualisation } from "./screen";
import styles from "./flight-visualisation.module.css";

export default function FlightVisualisationOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startFlightVisualisation(canvas, readOptions(window.location.search));
  }, []);

  return (
    <main className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="Aircraft around the receiver on a map. Drag or use the arrow keys to pan, scroll, pinch or press minus and equals to zoom, tap an aircraft to follow it, tap twice to zoom in, and press Escape to release the selection."
      />
    </main>
  );
}
