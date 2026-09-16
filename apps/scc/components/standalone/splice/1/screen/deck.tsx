"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { AudioEngine } from "../audio";
import { CUE_SLOTS, type DeckId, type DeckState } from "../model/types";
import { formatTime, Waveform } from "./waveform";
import styles from "./splice.module.css";

export type Operate = (action: (engine: AudioEngine) => void) => void;

export function Slider({ label, valueText, value, min, max, step = 0.01, onChange, disabled = false }: {
  label: string; valueText: string; value: number; min: number; max: number;
  step?: number; onChange: (value: number) => void; disabled?: boolean;
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}><span>{label}</span><output>{valueText}</output></span>
      <input type="range" min={min} max={max} step={step} value={value}
        disabled={disabled} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  );
}

export const Deck = memo(function Deck({ deck, operate, getPosition, seek }: {
  deck: DeckState; operate: Operate;
  getPosition: (id: DeckId) => number;
  seek: (id: DeckId, seconds: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bpmInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const id = deck.id;
  const label = id.toUpperCase();
  const loaded = deck.duration > 0;
  const effectiveBpm = deck.bpm === null ? null : deck.bpm * deck.rate;
  const filterText = Math.abs(deck.filter) < 0.015 ? "Open" : deck.filter < 0 ? "Low-pass" : "High-pass";
  const cueKeys = id === "a" ? ["1", "2", "3", "4"] : ["7", "8", "9", "0"];

  useEffect(() => {
    if (bpmInputRef.current) bpmInputRef.current.value = String(deck.bpm ?? "");
  }, [deck.bpm, deck.peaks]);

  function load(file?: File) {
    if (file) operate((engine) => { void engine.loadFile(id, file); });
  }

  return (
    <section className={styles.deck} data-deck={id} data-dragging={dragging} aria-label={`Deck ${label}`}
      onDragEnter={(event) => { event.preventDefault(); if (event.dataTransfer.types.includes("Files")) { dragDepth.current++; setDragging(true); } }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={(event) => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
      onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); load(event.dataTransfer.files[0]); }}>
      <header className={styles.deckHeader}>
        <span className={styles.deckLetter} aria-hidden="true">{label}</span>
        <div className={styles.source}>
          <h2 title={deck.name}>{deck.loading ? "Loading sound…" : deck.name}</h2>
          <span>{loaded ? "Click or drag the waveform to seek" : "Your files stay on this computer"}</span>
        </div>
        <button type="button" className={styles.textButton} disabled={deck.loading}
          onClick={() => inputRef.current?.click()} aria-label={`Load audio into deck ${label}`}>Load ↗</button>
        <input ref={inputRef} className={styles.hiddenInput} type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac,.aiff,.aif"
          aria-label={`Audio file for deck ${label}`} onChange={(event) => { load(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
      </header>

      <Waveform deck={deck} getPosition={getPosition} seek={seek} />

      <div className={styles.transport}>
        <button type="button" className={styles.playButton} data-playing={deck.playing} disabled={!loaded}
          aria-label={`${deck.playing ? "Pause" : "Play"} deck ${label}`} aria-pressed={deck.playing}
          onClick={() => operate((engine) => { void engine.togglePlay(id); })}>
          <span aria-hidden="true">{deck.playing ? "Ⅱ" : "▶"}</span>{deck.playing ? "Pause" : "Play"}<kbd>{id === "a" ? "Q" : "P"}</kbd>
        </button>
        <button type="button" className={styles.button} disabled={!loaded}
          onClick={() => seek(id, 0)} title="Return to the start without changing play/pause">↤ Start</button>
        <button type="button" className={styles.button} disabled={!loaded} aria-pressed={deck.reverse}
          onClick={() => operate((engine) => engine.setReverse(id, !deck.reverse))}>Reverse</button>
        <output className={styles.tempoReadout} aria-label={`Deck ${label} effective tempo`}>
          {effectiveBpm !== null ? effectiveBpm.toFixed(1) : "—"}<span>BPM</span>
        </output>
      </div>

      <div className={styles.cues}>
        <div className={styles.groupLabel}><span>Hot cues</span><span>Shift + press to set</span></div>
        <div className={styles.cuePads}>
          {CUE_SLOTS.map(({ id: cueId, index }) => {
            const cue = deck.cues[index];
            return <button key={cueId} type="button" disabled={!loaded} className={styles.cuePad} data-set={cue !== null}
              aria-label={`Deck ${label} cue ${index + 1}, ${cue === null ? "empty; press to set" : formatTime(cue) + "; press to play, Shift to replace"}`}
              onClick={(event) => operate((engine) => { void engine.hotCue(id, index, event.shiftKey); })}>
              <span>{index + 1}<kbd>{cueKeys[index]}</kbd></span><span>{cue === null ? "Set cue" : formatTime(cue)}</span>
            </button>;
          })}
        </div>
      </div>

      <div className={styles.loopGroup}>
        <div className={styles.groupLabel}><span>Loop</span><span>{loaded ? `${formatTime(deck.loop.start)} → ${formatTime(deck.loop.end)}` : "Mark a beginning and an end"}</span></div>
        <div className={styles.loopButtons}>
          <button className={styles.button} type="button" disabled={!loaded} title="Set loop beginning at the playhead"
            onClick={() => operate((engine) => engine.setLoopIn(id))}>In</button>
          <button className={styles.button} type="button" disabled={!loaded} title="Set loop end at the playhead"
            onClick={() => operate((engine) => engine.setLoopOut(id))}>Out</button>
          <button className={styles.button} type="button" disabled={!loaded} aria-pressed={deck.loop.enabled}
            onClick={() => operate((engine) => engine.toggleLoop(id))}>{deck.loop.enabled ? "Loop on" : "Loop off"}</button>
          <button className={styles.button} type="button" disabled={!loaded} aria-label={`Halve deck ${label} loop`}
            onClick={() => operate((engine) => engine.resizeLoop(id, 0.5))}>½</button>
          <button className={styles.button} type="button" disabled={!loaded} aria-label={`Double deck ${label} loop`}
            onClick={() => operate((engine) => engine.resizeLoop(id, 2))}>×2</button>
        </div>
      </div>

      <div className={styles.toneControls}>
        <div>
          <Slider label="Speed / pitch" valueText={`${deck.rate.toFixed(2)}×`} value={deck.rate} min={0.5} max={2} disabled={!loaded}
            onChange={(value) => operate((engine) => engine.setRate(id, value))} />
          <div className={styles.tempoControls}>
            <label>Source BPM <input ref={bpmInputRef} type="number" inputMode="decimal" min="30" max="300" step="0.1" placeholder="—"
              defaultValue={deck.bpm ?? ""} disabled={!loaded} aria-label={`Deck ${label} source BPM`}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              onBlur={(event) => {
                const input = event.currentTarget;
                operate((engine) => {
                  engine.setBpm(id, input.value === "" ? null : Number(input.value));
                  input.value = String(engine.getState().decks[id].bpm ?? "");
                });
              }} /></label>
            <button type="button" className={styles.smallButton} disabled={!loaded || deck.bpm === null}
              title="Match the other deck’s BPM. Does not align beats." onClick={() => operate((engine) => engine.matchTempo(id))}>Match tempo</button>
            <button type="button" className={styles.smallButton} disabled={!loaded || deck.rate === 1}
              onClick={() => operate((engine) => engine.setRate(id, 1))}>Reset</button>
          </div>
        </div>
        <div>
          <Slider label="Filter" valueText={filterText} value={deck.filter} min={-1} max={1} disabled={!loaded}
            onChange={(value) => operate((engine) => engine.setFilter(id, value))} />
          <div className={styles.rangeHints}><span>Low</span><button type="button" disabled={!loaded} onClick={() => operate((engine) => engine.setFilter(id, 0))}>Open</button><span>High</span></div>
        </div>
        <Slider label="Level" valueText={`${Math.round(deck.gain * 100)}%`} value={deck.gain} min={0} max={1} disabled={!loaded}
          onChange={(value) => operate((engine) => engine.setGain(id, value))} />
      </div>
      {deck.error && <p className={styles.error} role="alert">{deck.error}</p>}
    </section>
  );
});
