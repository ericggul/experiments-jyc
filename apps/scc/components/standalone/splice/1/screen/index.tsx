"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "../audio";
import { initialState, type DeckId } from "../model/types";
import { Deck, Slider, type Operate } from "./deck";
import styles from "./splice.module.css";

const CUE_KEYS: Partial<Record<string, readonly [DeckId, number]>> = {
  Digit1: ["a", 0], Digit2: ["a", 1], Digit3: ["a", 2], Digit4: ["a", 3],
  Digit7: ["b", 0], Digit8: ["b", 1], Digit9: ["b", 2], Digit0: ["b", 3],
};

function recordingExtension(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

export default function SpliceOne() {
  const engineRef = useRef<AudioEngine | null>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const recordingBusy = useRef(false);
  const mounted = useRef(false);
  const [state, setState] = useState(initialState);
  const [take, setTake] = useState<{ url: string; filename: string } | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    const engine = new AudioEngine(setState);
    engineRef.current = engine;
    return () => { mounted.current = false; engineRef.current = null; engine.dispose(); };
  }, []);

  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);

  const operate = useCallback<Operate>((action) => { if (engineRef.current) action(engineRef.current); }, []);
  const getPosition = useCallback((id: DeckId) => engineRef.current?.getPosition(id) ?? 0, []);
  const seek = useCallback((id: DeckId, seconds: number) => engineRef.current?.seek(id, seconds), []);

  const finishRecording = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || recordingBusy.current) return;
    recordingBusy.current = true;
    try {
      const blob = await engine.stopRecording();
      if (mounted.current && blob && blob.size) {
        const date = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
        setTake({ url: URL.createObjectURL(blob), filename: `splice-${date}.${recordingExtension(blob.type)}` });
        setRecordError(null);
      }
    } catch (error) {
      if (mounted.current) setRecordError(error instanceof Error ? error.message : "Could not finish the recording.");
    } finally { recordingBusy.current = false; }
  }, []);

  useEffect(() => {
    if (!state.recording) return;
    const began = performance.now();
    const timer = window.setInterval(() => {
      const seconds = Math.floor((performance.now() - began) / 1000);
      setRecordSeconds(seconds);
      if (seconds >= 600) void finishRecording();
    }, 250);
    return () => clearInterval(timer);
  }, [state.recording, finishRecording]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const engine = engineRef.current;
      if (!engine || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.code === "Escape") { engine.pauseAll(); return; }
      const target = event.target;
      if (helpRef.current?.open || (target instanceof HTMLElement &&
        (target.isContentEditable || /^(SELECT|TEXTAREA)$/.test(target.tagName) ||
        (target instanceof HTMLInputElement && target.type !== "range")))) return;
      if (event.code === "Space" && target instanceof HTMLElement && /^(BUTTON|A)$/.test(target.tagName)) return;
      const cue = CUE_KEYS[event.code];
      if (cue) { event.preventDefault(); void engine.hotCue(cue[0], cue[1], event.shiftKey); return; }
      if (event.code === "KeyQ" || event.code === "KeyP") {
        event.preventDefault(); void engine.togglePlay(event.code === "KeyQ" ? "a" : "b");
      } else if (event.code === "Space") {
        event.preventDefault();
        const decks = engine.getState().decks;
        if (decks.a.playing || decks.b.playing) engine.pauseAll(); else void engine.playBoth();
      } else if (event.code === "BracketLeft" || event.code === "BracketRight" || event.code === "Backslash") {
        event.preventDefault(); engine.setCrossfade(event.code === "Backslash" ? 0 :
          engine.getState().crossfade + (event.code === "BracketLeft" ? -0.1 : 0.1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loaded = state.decks.a.duration > 0 || state.decks.b.duration > 0;
  const playing = state.decks.a.playing || state.decks.b.playing;
  const loading = state.decks.a.loading || state.decks.b.loading;
  const crossfadeText = Math.abs(state.crossfade) < 0.015 ? "A + B" : state.crossfade < 0 ? `A ${Math.round(-state.crossfade * 100)}%` : `B ${Math.round(state.crossfade * 100)}%`;

  return (
    <main className={styles.instrument}>
      <header className={styles.header}>
        <div className={styles.identity}><Link target="_blank" rel="noopener noreferrer" href="/splice" className={styles.wordmark}>splice</Link><span>Audio instrument</span></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.textButton} disabled={loading} onClick={() => operate((engine) => { void engine.loadPracticePair(); })}>
            {loading ? "Loading…" : "Load practice pair"}
          </button>
          <button type="button" className={styles.textButton} onClick={() => helpRef.current?.showModal()}>How to play</button>
        </div>
      </header>

      <div className={styles.decks}>
        <Deck deck={state.decks.a} operate={operate} getPosition={getPosition} seek={seek} />
        <Deck deck={state.decks.b} operate={operate} getPosition={getPosition} seek={seek} />
      </div>

      <section className={styles.mixer} aria-label="Mixer">
        <div className={styles.mixTransport}>
          <button type="button" className={styles.button} disabled={!loaded} onClick={() => operate((engine) => {
            if (playing) engine.pauseAll(); else void engine.playBoth();
          })}>{playing ? "Pause both" : "Play both"}<kbd>Space</kbd></button>
          <button type="button" className={styles.stopButton} onClick={() => operate((engine) => engine.pauseAll())}>Stop sound<kbd>Esc</kbd></button>
        </div>
        <div className={styles.crossfader}>
          <div className={styles.groupLabel}><span>Crossfader</span><output>{crossfadeText}</output></div>
          <div className={styles.faderRow}>
            <button type="button" data-side="a" onClick={() => operate((engine) => engine.setCrossfade(-1))} aria-label="Cut to deck A">A</button>
            <input type="range" min="-1" max="1" step="0.01" value={state.crossfade} aria-label="Crossfader, left A, center both, right B"
              aria-valuetext={crossfadeText} onChange={(event) => operate((engine) => engine.setCrossfade(Number(event.currentTarget.value)))} />
            <button type="button" data-side="b" onClick={() => operate((engine) => engine.setCrossfade(1))} aria-label="Cut to deck B">B</button>
          </div>
          <div className={styles.faderHint}><span>Cut to A</span><button type="button" onClick={() => operate((engine) => engine.setCrossfade(0))}>Center</button><span>Cut to B</span></div>
        </div>
        <div className={styles.master}><Slider label="Master" valueText={`${Math.round(state.master * 100)}%`} value={state.master} min={0} max={1}
          onChange={(value) => operate((engine) => engine.setMaster(value))} /></div>
      </section>

      <div className={styles.takeRow}>
        <p className={styles.prompt}>{!loaded ? "Load the practice pair to begin, or drop your own audio onto a deck." : "Save your take before leaving. This session stays in this tab."}</p>
        <div className={styles.recordControls}>
          {take && <a className={styles.textButton} href={take.url} download={take.filename}>Save take ↓</a>}
          <button type="button" className={styles.recordButton} data-recording={state.recording}
            disabled={!state.recordingSupported || !loaded}
            title={state.recordingSupported ? "Record the mixed output, up to 10 minutes" : "Recording is not available in this browser"}
            onClick={() => {
              if (state.recording) { void finishRecording(); return; }
              setRecordSeconds(0); setRecordError(null);
              operate((engine) => { void engine.startRecording(); });
            }}><span aria-hidden="true" />{state.recording ? `Finish take ${Math.floor(recordSeconds / 60)}:${String(recordSeconds % 60).padStart(2, "0")}` : "Record mix"}</button>
        </div>
      </div>
      {(state.error || recordError) && <p className={styles.error} role="alert">{recordError || state.error}</p>}

      <dialog ref={helpRef} className={styles.help} aria-labelledby="splice-help-title">
        <div className={styles.helpHeader}><h2 id="splice-help-title">Play with a fragment.</h2><button type="button" className={styles.textButton} onClick={() => helpRef.current?.close()} autoFocus>Close</button></div>
        <ol>
          <li><strong>Start with two sounds.</strong> Load the practice pair, then Play both. A is a drum phrase; B is a chord phrase. Both are original, four-bar loops at 120 BPM. The crossfader’s center lets you hear both.</li>
          <li><strong>Find a return point.</strong> Seek on the waveform. Press an empty hot cue to store that point. Press it again to jump there and play. Shift + press replaces a cue.</li>
          <li><strong>Make a fragment insist.</strong> Set In, move forward, then set Out. Turn the loop on. Halve it a few times, change speed, or reverse it. In and Out use positions in the original sound.</li>
          <li><strong>Compose the encounter.</strong> Move the crossfader for a gradual handover; press A or B for a cut. Filter one sound to make space for the other. Leave a gap, bring a fragment back, or interrupt before the phrase resolves.</li>
          <li><strong>Keep a take.</strong> Record mix captures the output, including your cuts and silence. Finish take, then Save take. Files and recordings stay in this tab until you save them; reloading clears the session.</li>
        </ol>
        <dl className={styles.shortcuts}>
          <div><dt>Q / P</dt><dd>Play or pause A / B</dd></div>
          <div><dt>1–4 / 7–0</dt><dd>Hot cues on A / B; hold Shift to set</dd></div>
          <div><dt>Space / Esc</dt><dd>Play or pause both / stop sound</dd></div>
          <div><dt>[ / ] / \</dt><dd>Move the crossfader / center it</dd></div>
        </dl>
        <p>Shortcuts pause while you type in a field. Space respects a focused button. Every action also has a visible control.</p>
        <p>Speed changes pitch. Source BPM is entered manually for imported sounds; Match tempo changes speed but does not align beats. Cues play through the main output; there is no separate headphone channel. Load mono/stereo audio up to 40 MB and six minutes per deck (128 MiB decoded limit). Takes finish automatically at about ten minutes.</p>
      </dialog>
    </main>
  );
}
