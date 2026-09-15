"use client";

import { useEffect, useRef, useState } from "react";
import { HEIGHT, WIDTH } from "../model/score";
import { atlasUrl, portraitUrl } from "../rendering/material";
import { CollagePress } from "../rendering/press";
import styles from "./collage.module.css";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(value);
    };
    const timeout = window.setTimeout(() => finish(null), 5000);
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MaximalistCollage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pressRef = useRef<CollagePress | null>(null);
  const reducedRef = useRef(false);
  const pausedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let disposed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedRef.current = motion.matches;
      pressRef.current?.setPaused(motion.matches || pausedRef.current || document.hidden);
    };
    updateMotion();
    const visibility = () => pressRef.current?.setPaused(document.hidden || reducedRef.current || pausedRef.current);
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", visibility);
    void Promise.all([loadImage(atlasUrl), loadImage(portraitUrl)]).then(([atlas, portrait]) => {
      if (disposed || !canvasRef.current) return;
      try {
        pressRef.current = new CollagePress(canvasRef.current, { atlas, portrait });
        updateMotion();
        if (!atlas || !portrait) setError("Some local images could not load. Text layers remain available.");
        setReady(true);
      } catch { setError("Canvas 2D is unavailable in this browser."); }
    });
    return () => {
      disposed = true;
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", visibility);
      pressRef.current?.dispose();
      pressRef.current = null;
    };
  }, []);

  function add(x: number, y: number) {
    if (!pressRef.current) return;
    pressRef.current.add(x, y);
    setCount((current) => current + 1);
  }
  function togglePause(force?: boolean) {
    const next = force ?? !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    pressRef.current?.setPaused(next || reducedRef.current || document.hidden);
  }
  async function savePrint() {
    try {
      const blob = await pressRef.current?.png();
      if (blob) download(blob, `goldfishes-collage-${count}.png`);
    } catch { setError("The print could not be saved. Please try again."); }
  }

  return (
    <main className={styles.stage}>
      <h1 className={styles.srOnly}>Goldfishes — Maximalist collage</h1>
      <canvas ref={canvasRef} className={styles.print} width={WIDTH} height={HEIGHT}
        role="img" aria-label="An accumulating flat collage of video thumbnails, social posts, search results, notifications, generated answers and technology images." />
      <button type="button" className={styles.surface} disabled={!ready}
        aria-label="Print another interface layer. Click anywhere, or press Enter or Space. Escape pauses motion."
        onClick={(event) => {
          if (event.detail === 0) { add(WIDTH / 2, HEIGHT / 2); return; }
          const box = event.currentTarget.getBoundingClientRect();
          const scale = Math.max(box.width / WIDTH, box.height / HEIGHT);
          add((event.clientX - box.left + (WIDTH * scale - box.width) / 2) / scale,
            (event.clientY - box.top + (HEIGHT * scale - box.height) / 2) / scale);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); togglePause(true); }
        }} />
      <div className={styles.controls}>
        <span className={styles.instruction}>{ready ? "Click to overprint" : "Loading print…"}</span>
        <button type="button" onClick={() => togglePause()} disabled={!ready} aria-pressed={paused}>{paused ? "Resume cuts" : "Pause cuts"}</button>
        <button type="button" onClick={savePrint} disabled={!ready}>Save image</button>
        <button type="button" aria-expanded={help} aria-controls="collage-notes" onClick={() => setHelp(!help)}>About</button>
      </div>
      <p className={styles.srOnly} role="status">{count} layers printed.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {help && <aside id="collage-notes" className={styles.notes}>
        <h2>Maximalist collage</h2>
        <p>Click / Enter adds one layer. Its fragments share three short cuts, then settle into the print. Escape pauses the cuts. Reduced motion keeps each layer still.</p>
        <p>Locally authored interface samples and fictional feed text. The technology image atlas comes from the Goldfishes archive. The portrait is Jensen Huang, photographed by The White House (public domain), cropped here.</p>
        <a href="https://commons.wikimedia.org/wiki/File:Jen-Hsun_Huang_2025.jpg" target="_blank" rel="noreferrer">Photograph source ↗</a>
        <p>The print lasts until this page closes. Save image preserves the full 1600 × 1000 composition, including the edges cropped by this viewport.</p>
        <button type="button" disabled={!ready} onClick={() => {
          const score = pressRef.current?.score();
          if (score) download(score, `goldfishes-collage-${count}-clicks.json`);
        }}>Save click record</button>
      </aside>}
    </main>
  );
}
