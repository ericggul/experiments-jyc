"use client";

import { useEffect, type RefObject } from "react";

declare global {
  interface Window {
    spoonClassUnlockAudio?: () => void;
    webkitAudioContext?: typeof AudioContext;
  }
}

// Runner.sounds keys, mapped to the source's embedded <audio> element ids.
const SOUND_SOURCES = {
  BUTTON_PRESS: "offline-sound-press",
  HIT: "offline-sound-hit",
  SCORE: "offline-sound-reached",
} as const;
type SoundName = keyof typeof SOUND_SOURCES;

// Bounded so a wall of games cannot pile up unbounded audio work.
const MAX_VOICES = 24;

type SoundMessage = { channel: "spoon-class-sound"; sound: SoundName };

function isSoundMessage(value: unknown): value is SoundMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<SoundMessage>;
  return (
    message.channel === "spoon-class-sound" &&
    typeof message.sound === "string" &&
    message.sound in SOUND_SOURCES
  );
}

function embeddedSound(html: string, id: string) {
  const match = html.match(
    new RegExp(`<audio id="${id}" src="data:[^;]+;base64,([^"]+)"`),
  );
  if (!match) return null;
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

// Plays every module's original sounds through one host audio context. Each
// game's press, hit and score sound is its own voice, so simultaneous games
// overlap. Per-voice gain falls with the number of games and a compressor
// holds the sum, so a synchronized press from many games stays listenable.
export function useGameAudio(
  framesRef: RefObject<Map<string, HTMLIFrameElement>>,
  sourceHtml: string,
) {
  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    const buffers = new Map<SoundName, AudioBuffer>();
    let voices = 0;

    for (const [name, id] of Object.entries(SOUND_SOURCES) as [
      SoundName,
      string,
    ][]) {
      const data = embeddedSound(sourceHtml, id);
      if (!data) continue;
      // The source sounds are Ogg Vorbis; a browser that cannot decode them
      // stays silent rather than failing.
      context
        .decodeAudioData(data)
        .then((buffer) => buffers.set(name, buffer))
        .catch(() => {});
    }

    // Every gesture retries until the context runs: touch grants permission
    // only on release, so a resume from the press itself can stay pending.
    // Pending resumes all settle once one is allowed, so sounds sent during
    // the unlocking press wait on the latest one instead of dropping.
    let resuming: Promise<void> | null = null;
    const unlock = () => {
      if (context.state === "running") return;
      resuming = context.resume().catch(() => {});
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isSoundMessage(event.data)) return;
      const frames = [...(framesRef.current?.values() ?? [])];
      if (!frames.some((frame) => frame.contentWindow === event.source)) return;
      const buffer = buffers.get(event.data.sound);
      if (!buffer) return;
      const voiceGain = 1 / Math.sqrt(Math.max(1, frames.length));
      if (context.state === "running") play(buffer, voiceGain);
      else resuming?.then(() => play(buffer, voiceGain));
    };

    const play = (buffer: AudioBuffer, voiceGain: number) => {
      if (context.state !== "running" || voices >= MAX_VOICES) return;
      const voice = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = voiceGain;
      voice.buffer = buffer;
      voice.connect(gain);
      gain.connect(compressor);
      voices += 1;
      voice.onended = () => {
        voices -= 1;
        voice.disconnect();
        gain.disconnect();
      };
      voice.start();
    };

    window.spoonClassUnlockAudio = unlock;
    window.addEventListener("message", onMessage);
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("touchend", unlock, true);
    return () => {
      if (window.spoonClassUnlockAudio === unlock)
        delete window.spoonClassUnlockAudio;
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      void context.close().catch(() => {});
    };
  }, [framesRef, sourceHtml]);
}
