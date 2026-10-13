"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activeParametricSong } from "@/components/parametric-interface/model/songs";
import type { ParametricSong } from "@/components/parametric-interface/model/song";
import { bandBins, bandLevel, glide, meter, type Response } from "./model/bands";
import { layoutFor, type Bounds, type Layout } from "./model/layout";
import { shownWord, type Word } from "./model/lyrics";
import { castColumns } from "./screen/cast";
import { loadFaces } from "./screen/fonts";
import { createPainter, type Mode } from "./screen/painter";
import styles from "./screen.module.css";

const modes: readonly { id: Mode; label: string }[] = [
  { id: "stretch", label: "펼침" },
  { id: "shade", label: "농담" },
];
const responses: readonly { id: Response; label: string }[] = [
  { id: "smooth", label: "부드럽게" },
  { id: "instant", label: "즉각" },
];
const widths = [12, 16, 20, 28] as const;
type Width = (typeof widths)[number];
// Words per column, chosen on a slider.
const fewestRepeats = 4;
const mostRepeats = 20;

const maximumPixelRatio = 2;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

type Analysis = { context: AudioContext; analyser: AnalyserNode; spectrum: Float32Array<ArrayBuffer> };

function wordsOf(song: ParametricSong): Word[] {
  return song.lyrics.flatMap((line) => line.words.map((word) => ({ text: word.text.toLocaleUpperCase("en"), startMs: word.startMs })));
}

export default function MobileUiCollageVolumeOne({ song = activeParametricSong }: { song?: ParametricSong }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [width, setWidth] = useState<Width>(16);
  const [repeats, setRepeats] = useState(8);
  const [mode, setMode] = useState<Mode>("stretch");
  const [response, setResponse] = useState<Response>("smooth");
  const [started, setStarted] = useState(false);
  const liveRef = useRef({ mode, response });
  const redrawRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const settingsRef = useRef({ width, repeats });
  const applyRef = useRef<(() => void) | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const analysisRef = useRef<Analysis | null>(null);
  const startedRef = useRef(started);
  const words = useMemo(() => wordsOf(song), [song]);

  useEffect(() => {
    settingsRef.current = { width, repeats };
    applyRef.current?.();
  }, [width, repeats]);

  useEffect(() => {
    liveRef.current = { mode, response };
    redrawRef.current?.();
  }, [mode, response]);

  useEffect(() => {
    startedRef.current = started;
    wakeRef.current?.();
  }, [started]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const safe = safeRef.current;
    const audio = audioRef.current;
    if (!canvas || !safe || !audio) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const painter = createPainter(context);
    // One random cast of faces per visit, one face per column; each face is subset to the whole lyric.
    const seed = Math.floor(Math.random() * 2 ** 32);
    const lyricText = [...new Set(words.map((word) => word.text).join(""))].join("");
    let bounds: Bounds = { left: 0, top: 0, right: 1, bottom: 1 };
    let ratio = 1;
    let layout: Layout | null = null;
    let fonts: string[] = [];
    // Word on screen (front layer) and word prepared behind it (back layer); −1 when none.
    let front = -1;
    let back = -1;
    let preparing: number | null = null;
    let levels = new Float32Array(0);
    let velocity = new Float32Array(0);
    let raw = new Float32Array(0);
    let bins: Int32Array = new Int32Array(0);
    let binsFor = "";
    let frame: number | null = null;
    let last = 0;
    let ready = false;
    let request = 0;
    let disposed = false;

    // Rasterises the word after the one on screen into the back layer, outside the frame that shows a change.
    const prepareNext = () => {
      if (preparing !== null) window.clearTimeout(preparing);
      preparing = window.setTimeout(() => {
        preparing = null;
        if (disposed || !layout || front < 0) return;
        const next = Math.min(words.length - 1, front + 1);
        if (next === front || next === back) return;
        painter.render("back", words[next]!.text, fonts, settingsRef.current.repeats);
        back = next;
      }, 0);
    };

    // The moment a new word is sung, every column changes to it at once, each in its own face. The next word is
    // already rasterised, so the change is a layer swap; only a jump (seek, relayout, `force`) rasterises in place.
    const writeWords = (force: boolean) => {
      if (!layout || !ready) return;
      const index = shownWord(words, audio.currentTime * 1_000);
      if (!force && index === front) return;
      if (!force && index === back) {
        painter.swap();
        [front, back] = [back, front];
      } else {
        painter.render("front", words[index]!.text, fonts, settingsRef.current.repeats);
        front = index;
        if (force) back = -1;
      }
      prepareNext();
    };

    const measure = (seconds: number) => {
      const analysis = analysisRef.current;
      if (!startedRef.current) {
        // Before the song (and after it ends) the columns stand at full height, every one showing the first (or last) word.
        raw.fill(1);
        return liveRef.current.response === "smooth" ? glide(levels, velocity, raw, seconds) : meter(levels, raw, seconds);
      }
      if (!analysis || audio.paused) return false;
      const key = `${levels.length}|${analysis.analyser.frequencyBinCount}|${analysis.context.sampleRate}`;
      if (key !== binsFor) {
        bins = bandBins(levels.length, analysis.analyser.frequencyBinCount, analysis.context.sampleRate);
        binsFor = key;
      }
      analysis.analyser.getFloatFrequencyData(analysis.spectrum);
      for (let column = 0; column < levels.length; column += 1) {
        raw[column] = bandLevel(analysis.spectrum, bins[column * 2]!, bins[column * 2 + 1]!, column, levels.length);
      }
      if (liveRef.current.response === "smooth") glide(levels, velocity, raw, seconds);
      else meter(levels, raw, seconds);
      return true;
    };

    const tick = (now: number) => {
      frame = null;
      const seconds = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      writeWords(false);
      const running = measure(seconds);
      painter.draw(levels, liveRef.current.mode);
      // The loop runs while the song plays (and while the poster rises); paused, the columns hold still.
      if (running && ready) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };

    const wake = () => {
      if (ready && frame === null) frame = window.requestAnimationFrame(tick);
    };
    wakeRef.current = wake;
    redrawRef.current = () => {
      if (!ready) return;
      painter.draw(levels, liveRef.current.mode);
      wake();
    };

    // Relayouts the columns, then (once their faces are ready) rewrites every column. Levels persist by index.
    const apply = () => {
      const { width } = settingsRef.current;
      const next = layoutFor(bounds, width);
      const faces = castColumns(seed, next.count);
      const current = (request += 1);
      void loadFaces(faces, lyricText).then((loaded) => {
        if (disposed || current !== request) return;
        layout = next;
        fonts = loaded;
        const kept = levels;
        levels = new Float32Array(next.count);
        levels.set(kept.subarray(0, Math.min(kept.length, next.count)));
        raw = new Float32Array(next.count);
        velocity = new Float32Array(next.count);
        painter.configure(next, ratio);
        ready = true;
        writeWords(true);
        painter.draw(levels, liveRef.current.mode);
        wake();
      });
    };
    applyRef.current = apply;

    const resize = () => {
      const area = canvas.getBoundingClientRect();
      const inset = safe.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      canvas.width = Math.max(1, Math.round(area.width * ratio));
      canvas.height = Math.max(1, Math.round(area.height * ratio));
      bounds = {
        left: inset.left - area.left,
        top: inset.top - area.top,
        right: inset.right - area.left,
        bottom: inset.bottom - area.top,
      };
      apply();
    };

    const onPlay = () => wake();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    observer.observe(safe);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("seeked", onPlay);
    resize();

    return () => {
      disposed = true;
      applyRef.current = null;
      wakeRef.current = null;
      redrawRef.current = null;
      if (preparing !== null) window.clearTimeout(preparing);
      observer.disconnect();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("seeked", onPlay);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [words]);

  useEffect(
    () => () => {
      void analysisRef.current?.context.close();
      analysisRef.current = null;
    },
    [],
  );

  // The only start action: builds the analyser inside the gesture (browsers start audio only from one).
  const start = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session && session.type !== "playback") {
      try {
        session.type = "playback";
      } catch {}
    }
    if (!analysisRef.current) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.55;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(context.destination);
      analysisRef.current = { context, analyser, spectrum: new Float32Array(analyser.frequencyBinCount) };
    }
    void analysisRef.current.context.resume();
    audio.currentTime = 0;
    try {
      await audio.play();
      setStarted(true);
    } catch {
      setStarted(false);
    }
  };

  // After the start, a tap pauses or resumes; paused, the columns hold their last levels.
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !started) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  return (
    <main className={styles.field}>
      <audio ref={audioRef} src={song.audioSrc} preload="auto" aria-hidden="true" onEnded={() => setStarted(false)} />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={`A spectrum visualiser for ${song.artist}, “${song.title}”: every column shows the word being sung, repeated and turned on its side, each in its own typeface, all changing at once with the next word and each stretched up from the bottom by the loudness of its frequency band`}
        role="img"
        onClick={toggle}
      />
      <div ref={safeRef} className={styles.safe} aria-hidden="true" />
      {!started && (
        <div className={styles.overlay}>
          <button type="button" className={styles.play} aria-label={`Play ${song.title}`} onClick={() => void start()}>
            <span aria-hidden="true" className={styles.playIcon} />
          </button>
        </div>
      )}
      <div className={styles.control}>
        {open && (
          <div className={styles.panel}>
            <div className={styles.row} role="group" aria-label="Mode">
              {modes.map((item) => (
                <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Response">
              {responses.map((item) => (
                <button key={item.id} type="button" aria-pressed={response === item.id} onClick={() => setResponse(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.row} role="group" aria-label="Column width">
              {widths.map((value) => (
                <button key={value} type="button" aria-pressed={width === value} onClick={() => setWidth(value)}>
                  {value}
                </button>
              ))}
            </div>
            <label className={styles.slider}>
              <input
                type="range"
                min={fewestRepeats}
                max={mostRepeats}
                step={1}
                value={repeats}
                aria-label="Words per column"
                onChange={(event) => setRepeats(Number(event.target.value))}
              />
              <output>×{repeats}</output>
            </label>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-label="옵션" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <svg width="18" height="4" viewBox="0 0 18 4" aria-hidden="true">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
            <circle cx="9" cy="2" r="2" fill="currentColor" />
            <circle cx="16" cy="2" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </main>
  );
}
