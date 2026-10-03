import { createPacer, midiOf } from "../model/pitch";

type ToneModule = typeof import("tone");

export type SliderSound = {
  /** Call from a pointer gesture: browsers only start audio from one. */
  resume(): void;
  /** A slider moved to `value`; plays its note if the scale step changed. */
  play(value: number, previous: number): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
};

// Pages declare playback so iOS Safari (16.4+) routes Web Audio like media instead of muting it with the
// ringer/silent switch, which otherwise silences Web Audio even at full volume.
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

// Touch only grants audio permission on the end of a gesture (touchend / pointerup), not on pointerdown.
const unlockEvents = ["pointerup", "touchend", "click", "keydown"] as const;

/**
 * One soft mallet voice: a triangle tone with a quick attack and a short ring, a little room reverb, and a
 * limiter so a fast sweep stays even. Higher notes are played slightly softer so the range sounds balanced.
 */
export function createSliderSound(): SliderSound {
  let tone: ToneModule | null = null;
  let synth: import("tone").PolySynth | null = null;
  let nodes: { dispose(): void }[] = [];
  let enabled = true;
  let disposed = false;
  let primed = false;
  const pace = createPacer();

  void import("tone").then((module) => {
    if (disposed) return;
    tone = module;
    const limiter = new module.Limiter(-3).toDestination();
    const reverb = new module.Reverb({ decay: 2.2, preDelay: 0.01, wet: 0.18 }).connect(limiter);
    const filter = new module.Filter({ frequency: 4200, type: "lowpass", rolloff: -12 }).connect(reverb);
    synth = new module.PolySynth(module.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.004, decay: 0.45, sustain: 0, release: 0.5 },
      volume: -4,
    }).connect(filter);
    synth.maxPolyphony = 16;
    nodes = [synth, filter, reverb, limiter];
  });

  const resume = () => {
    if (!enabled || !tone) return;
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session && session.type !== "playback") {
      try {
        session.type = "playback";
      } catch {}
    }
    const context = tone.getContext();
    if (context.state === "running" && primed) return;
    void tone.start();
    // Older iOS also needs a buffer started inside the gesture before the context will sound.
    if (!primed) {
      try {
        const raw = context.rawContext;
        const source = raw.createBufferSource();
        source.buffer = raw.createBuffer(1, 1, raw.sampleRate);
        source.connect(raw.destination);
        source.start(0);
        primed = true;
      } catch {}
    }
  };

  for (const type of unlockEvents) window.addEventListener(type, resume, { capture: true, passive: true });

  return {
    resume,
    play(value, previous) {
      if (!enabled || !tone || !synth || tone.getContext().state !== "running") return;
      const midi = midiOf(value);
      if (midi === midiOf(previous)) return;
      const at = pace(tone.now());
      if (at === null) return;
      synth.triggerAttackRelease(tone.Frequency(midi, "midi").toFrequency(), 0.12, at, 0.9 - 0.35 * value);
    },
    setEnabled(next) {
      enabled = next;
      if (!next) synth?.releaseAll();
    },
    dispose() {
      disposed = true;
      for (const type of unlockEvents) window.removeEventListener(type, resume, { capture: true });
      for (const node of nodes) node.dispose();
      nodes = [];
      synth = null;
    },
  };
}
