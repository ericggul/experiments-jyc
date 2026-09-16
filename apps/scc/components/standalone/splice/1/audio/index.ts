import {
  clamp,
  crossfadeGains,
  MIN_LOOP_SECONDS,
  originalLoopForSource,
  positionAt,
  resolvePlayPosition,
  sourceOffsetForPosition,
  usableLoop,
} from "../model/transport";
import {
  initialState,
  type DeckId,
  type DeckState,
  type InstrumentState,
} from "../model/types";

const CLICK_FADE_SECONDS = 0.005;
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_DURATION_SECONDS = 6 * 60;
const MAX_DECODED_BYTES = 128 * 1024 * 1024;
const PEAK_COUNT = 256;

type ActiveSource = {
  gain: GainNode;
  node: AudioBufferSourceNode;
};

type DeckRuntime = {
  buffer: AudioBuffer | null;
  reversedBuffer: AudioBuffer | null;
  source: ActiveSource | null;
  anchorPosition: number;
  anchorTime: number;
  loadGeneration: number;
};

type DeckNodes = {
  crossfade: GainNode;
  gain: GainNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function buildPeaks(buffer: AudioBuffer) {
  const peaks = Array.from({ length: PEAK_COUNT }, () => 0);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < PEAK_COUNT; index += 1) {
      const start = Math.floor((index * samples.length) / PEAK_COUNT);
      const end = Math.floor(((index + 1) * samples.length) / PEAK_COUNT);
      let peak = 0;
      for (let frame = start; frame < end; frame += 1) {
        peak = Math.max(peak, Math.abs(samples[frame] ?? 0));
      }
      peaks[index] = Math.max(peaks[index] ?? 0, peak);
    }
  }
  return peaks;
}

function createPracticeBuffer(
  context: AudioContext,
  id: DeckId,
) {
  const sampleRate = context.sampleRate;
  const duration = 8;
  const buffer = context.createBuffer(2, sampleRate * duration, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const beatFrames = sampleRate / 2;

  const addTone = (
    target: Float32Array,
    start: number,
    length: number,
    frequency: number,
    amplitude: number,
  ) => {
    const attack = Math.max(1, Math.floor(sampleRate * 0.007));
    const release = Math.max(1, Math.floor(sampleRate * 0.045));
    for (let index = 0; index < length && start + index < target.length; index += 1) {
      const envelope = index < attack
        ? index / attack
        : index > length - release
          ? Math.max(0, (length - index) / release)
          : 1;
      const time = index / sampleRate;
      target[start + index] += amplitude * envelope * (
        Math.sin(2 * Math.PI * frequency * time)
        + 0.22 * Math.sin(2 * Math.PI * frequency * 2 * time)
      );
    }
  };

  for (let beat = 0; beat < 16; beat += 1) {
    const start = Math.floor(beat * beatFrames);
    const end = Math.min(left.length, start + Math.floor(beatFrames));
    for (let frame = start; frame < end; frame += 1) {
      const local = (frame - start) / sampleRate;
      let sample = 0;
      if (id === "a") {
        const kick = Math.sin(2 * Math.PI * (92 - local * 58) * local) * Math.exp(-local * 23);
        const snare = beat % 4 === 2
          ? (((frame * 214013 + beat * 2531011) & 1023) / 511.5 - 1) * Math.exp(-local * 28) * 0.3
          : 0;
        const hat = beat % 2 === 1
          ? (((frame * 1103515245 + beat * 12345) & 255) / 127.5 - 1) * Math.exp(-local * 52)
          : 0;
        sample = 0.5 * kick + snare + 0.09 * hat;
      }
      left[frame] += sample * (id === "a" ? 0.92 : 0.83);
      right[frame] += sample * (id === "a" ? 0.76 : 0.96);
    }
  }

  if (id === "b") {
    const chords = [
      [261.626, 329.628, 391.995, 130.813],
      [220, 261.626, 329.628, 110],
      [174.614, 220, 261.626, 87.307],
      [195.998, 246.942, 293.665, 97.999],
    ];
    for (let bar = 0; bar < 4; bar += 1) {
      const chord = chords[bar] ?? chords[0];
      const barStart = Math.floor(bar * 4 * beatFrames);
      for (const frequency of chord.slice(0, 3)) {
        addTone(left, barStart, Math.floor(beatFrames * 3.7), frequency, 0.085);
        addTone(right, barStart, Math.floor(beatFrames * 3.7), frequency * 1.003, 0.085);
      }
      for (const offset of [0, 1.5, 2.5]) {
        const start = barStart + Math.floor(offset * beatFrames);
        addTone(left, start, Math.floor(beatFrames * 0.33), chord[3] ?? 110, 0.15);
        addTone(right, start, Math.floor(beatFrames * 0.33), chord[3] ?? 110, 0.15);
      }
    }
  }
  return buffer;
}

function reversedCopy(context: AudioContext, buffer: AudioBuffer) {
  const reversed = context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    reversed.getChannelData(channel).set(buffer.getChannelData(channel).slice().reverse());
  }
  return reversed;
}

export class AudioEngine {
  private state = initialState();
  private readonly runtime: Record<DeckId, DeckRuntime> = {
    a: { buffer: null, reversedBuffer: null, source: null, anchorPosition: 0, anchorTime: 0, loadGeneration: 0 },
    b: { buffer: null, reversedBuffer: null, source: null, anchorPosition: 0, anchorTime: 0, loadGeneration: 0 },
  };
  private context: AudioContext | null = null;
  private nodes: Record<DeckId, DeckNodes> | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private recorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private stopRecordingResolver: ((blob: Blob | null) => void) | null = null;
  private stopRecordingPromise: Promise<Blob | null> | null = null;
  private recordingStartGeneration = 0;
  private recordingStarting = false;
  private playbackGeneration: Record<DeckId, number> = { a: 0, b: 0 };
  private disposed = false;

  constructor(private readonly onChange: (state: InstrumentState) => void) {
    this.state = {
      ...this.state,
      recordingSupported: typeof window !== "undefined" && typeof MediaRecorder !== "undefined",
    };
    this.commitState(this.state);
    this.emit();
  }

  getState() {
    return this.snapshot();
  }

  getPosition(id: DeckId) {
    const deck = this.state.decks[id];
    const runtime = this.runtime[id];
    if (!deck.playing || !this.context) return runtime.anchorPosition;
    return positionAt({
      anchor: runtime.anchorPosition,
      elapsed: Math.max(0, this.context.currentTime - runtime.anchorTime),
      duration: deck.duration,
      rate: deck.rate,
      reverse: deck.reverse,
      loop: deck.loop,
    });
  }

  async loadFile(id: DeckId, file: File) {
    if (this.disposed) return;
    const generation = ++this.runtime[id].loadGeneration;
    if (file.size > MAX_FILE_BYTES) {
      this.setDeck(id, { loading: false, error: "Files must be 40 MB or smaller." });
      return;
    }

    this.setDeck(id, { loading: true, error: null });
    try {
      const context = await this.ensureContext();
      if (this.disposed || generation !== this.runtime[id].loadGeneration) return;
      const bytes = await file.arrayBuffer();
      if (this.disposed || generation !== this.runtime[id].loadGeneration) return;
      const decoded = await context.decodeAudioData(bytes);
      if (this.disposed || generation !== this.runtime[id].loadGeneration) return;
      if (decoded.duration > MAX_DURATION_SECONDS) {
        this.setDeck(id, { loading: false, error: "Files must be six minutes or shorter." });
        return;
      }
      if (
        decoded.numberOfChannels > 2 ||
        decoded.length * decoded.numberOfChannels * Float32Array.BYTES_PER_ELEMENT > MAX_DECODED_BYTES
      ) {
        this.setDeck(id, {
          loading: false,
          error: "Decoded audio must be mono or stereo and use 128 MiB PCM or less.",
        });
        return;
      }
      this.installBuffer(id, decoded, file.name);
    } catch (error) {
      if (!this.disposed && generation === this.runtime[id].loadGeneration) {
        this.setDeck(id, {
          loading: false,
          error: error instanceof Error ? `Could not load file: ${error.message}` : "Could not decode this audio file.",
        });
      }
    }
  }

  async loadPracticePair() {
    if (this.disposed) return;
    try {
      const context = await this.ensureContext();
      if (this.disposed) return;
      this.runtime.a.loadGeneration += 1;
      this.runtime.b.loadGeneration += 1;
      this.installBuffer("a", createPracticeBuffer(context, "a"), "Drum phrase", 120);
      this.installBuffer("b", createPracticeBuffer(context, "b"), "Chord phrase", 120);
      for (const id of ["a", "b"] as const) {
        const duration = this.state.decks[id].duration;
        this.setDeck(id, {
          filter: 0,
          loop: { enabled: true, start: 0, end: duration },
          rate: 1,
        });
        this.applyFilter(id);
      }
      this.setGlobalError(null);
    } catch (error) {
      this.setGlobalError(error instanceof Error ? error.message : "Practice sound is unavailable.");
    }
  }

  async togglePlay(id: DeckId) {
    if (this.state.decks[id].playing) {
      this.invalidatePendingStarts(id);
      this.pauseDeck(id);
      return;
    }
    try {
      const generation = ++this.playbackGeneration[id];
      const context = await this.resumeContext();
      if (this.disposed || generation !== this.playbackGeneration[id]) return;
      this.startDeck(id, this.runtime[id].anchorPosition, context.currentTime + 0.008);
    } catch (error) {
      this.setDeckError(id, error);
    }
  }

  async playBoth() {
    try {
      const generations = {
        a: ++this.playbackGeneration.a,
        b: ++this.playbackGeneration.b,
      };
      const context = await this.resumeContext();
      if (this.disposed) return;
      const startsAt = context.currentTime + 0.02;
      for (const id of ["a", "b"] as const) {
        if (generations[id] === this.playbackGeneration[id] && this.state.decks[id].duration && !this.state.decks[id].playing) {
          this.startDeck(id, this.runtime[id].anchorPosition, startsAt);
        }
      }
    } catch (error) {
      this.setGlobalError(error instanceof Error ? error.message : "Audio playback is unavailable.");
    }
  }

  pauseAll() {
    this.invalidatePendingStarts();
    this.pauseDeck("a");
    this.pauseDeck("b");
  }

  seek(id: DeckId, seconds: number) {
    const deck = this.state.decks[id];
    if (!deck.duration) return;
    const position = clamp(finite(seconds), 0, deck.duration);
    const loop = usableLoop(deck.loop, deck.duration);
    if (deck.loop.enabled && loop && (position < loop.start || position >= loop.end)) {
      this.setDeck(id, { loop: { ...deck.loop, enabled: false } });
    }
    this.runtime[id].anchorPosition = position;
    if (deck.playing && this.context) this.startDeck(id, position, this.context.currentTime + CLICK_FADE_SECONDS);
    else this.setDeck(id, {});
  }

  setRate(id: DeckId, value: number) {
    const rate = clamp(finite(value, 1), 0.5, 2);
    const runtime = this.runtime[id];
    runtime.anchorPosition = this.getPosition(id);
    if (this.context) {
      // Keep one continuous source when changing speed; re-anchor its clock.
      runtime.anchorTime = Math.max(runtime.anchorTime, this.context.currentTime);
      runtime.source?.node.playbackRate.setValueAtTime(rate, this.context.currentTime);
    }
    this.setDeck(id, { rate, error: null });
  }

  setGain(id: DeckId, value: number) {
    const gain = clamp(finite(value), 0, 1);
    this.setDeck(id, { gain });
    if (this.nodes && this.context) this.nodes[id].gain.gain.setTargetAtTime(gain, this.context.currentTime, 0.006);
  }

  setFilter(id: DeckId, value: number) {
    const filter = clamp(finite(value), -1, 1);
    this.setDeck(id, { filter });
    this.applyFilter(id);
  }

  setReverse(id: DeckId, value: boolean) {
    this.reconfigureDeck(id, { reverse: Boolean(value) });
  }

  setBpm(id: DeckId, value: number | null) {
    const bpm = value === null || !Number.isFinite(value) || value <= 0
      ? null
      : clamp(value, 30, 300);
    this.setDeck(id, { bpm });
  }

  matchTempo(id: DeckId) {
    const other: DeckId = id === "a" ? "b" : "a";
    const source = this.state.decks[other];
    const target = this.state.decks[id];
    if (!source.bpm || !target.bpm) {
      this.setDeck(id, { error: "Set BPM on both decks before matching tempo." });
      return;
    }
    this.setRate(id, (source.bpm * source.rate) / target.bpm);
  }

  setLoopIn(id: DeckId) {
    this.setLoopBoundary(id, "start", this.getPosition(id));
  }

  setLoopOut(id: DeckId) {
    this.setLoopBoundary(id, "end", this.getPosition(id));
  }

  toggleLoop(id: DeckId) {
    const deck = this.state.decks[id];
    if (!deck.duration) return;
    let loop = deck.loop;
    if (!usableLoop(loop, deck.duration)) {
      const length = Math.min(1, deck.duration);
      const start = clamp(this.getPosition(id), 0, deck.duration - length);
      loop = { enabled: true, start, end: start + length };
    } else {
      loop = { ...loop, enabled: !loop.enabled };
    }
    this.reconfigureDeck(id, { loop });
  }

  resizeLoop(id: DeckId, factor: number) {
    const deck = this.state.decks[id];
    const bounds = usableLoop(deck.loop, deck.duration);
    if (!bounds || !Number.isFinite(factor) || factor <= 0) return;
    const length = clamp((bounds.end - bounds.start) * factor, MIN_LOOP_SECONDS, deck.duration - bounds.start);
    this.reconfigureDeck(id, { loop: { ...deck.loop, start: bounds.start, end: bounds.start + length } });
  }

  async hotCue(id: DeckId, index: number, store: boolean) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    const deck = this.state.decks[id];
    if (!deck.duration) return;
    const cue = deck.cues[index] ?? null;
    if (store || cue === null) {
      const cues = [...deck.cues];
      cues[index] = this.getPosition(id);
      this.setDeck(id, { cues });
      return;
    }
    this.seek(id, cue);
    if (!this.state.decks[id].playing) await this.togglePlay(id);
    if (this.disposed) return;
  }

  setCrossfade(value: number) {
    const crossfade = clamp(finite(value), -1, 1);
    this.commitState({ ...this.state, crossfade });
    this.applyCrossfade();
    this.emit();
  }

  setMaster(value: number) {
    const master = clamp(finite(value), 0, 1);
    this.commitState({ ...this.state, master });
    if (this.master && this.context) this.master.gain.setTargetAtTime(master, this.context.currentTime, 0.008);
    this.emit();
  }

  async startRecording() {
    if (this.disposed || this.state.recording || this.recordingStarting) return;
    this.recordingStarting = true;
    const generation = ++this.recordingStartGeneration;
    try {
      await this.resumeContext();
      if (this.disposed || generation !== this.recordingStartGeneration) return;
      const destination = this.recordingDestination;
      if (!destination || typeof MediaRecorder === "undefined") {
        this.setGlobalError("Mixed-output recording is not supported in this browser.");
        return;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      this.recordingChunks = [];
      const recorder = mimeType
        ? new MediaRecorder(destination.stream, { mimeType })
        : new MediaRecorder(destination.stream);
      this.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.recordingChunks.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = this.recordingChunks.length ? new Blob(this.recordingChunks, { type }) : null;
        this.finishRecording(recorder, blob);
      };
      recorder.onerror = () => {
        this.setGlobalError("Recording stopped because the browser audio encoder failed.");
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            this.finishRecording(recorder, null);
          }
        } else {
          this.finishRecording(recorder, null);
        }
      };
      recorder.start(1000);
      if (this.disposed || generation !== this.recordingStartGeneration) {
        recorder.stop();
        return;
      }
      this.commitState({ ...this.state, recording: true, error: null });
      this.emit();
    } catch (error) {
      if (this.recorder && generation === this.recordingStartGeneration) {
        this.recorder.ondataavailable = null;
        this.recorder.onstop = null;
        this.recorder.onerror = null;
        this.recorder = null;
      }
      this.setGlobalError(error instanceof Error ? `Could not start recording: ${error.message}` : "Could not start recording.");
    } finally {
      if (generation === this.recordingStartGeneration) this.recordingStarting = false;
    }
  }

  stopRecording() {
    this.recordingStartGeneration += 1;
    this.recordingStarting = false;
    if (this.stopRecordingPromise) return this.stopRecordingPromise;
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return Promise.resolve<Blob | null>(null);
    let resolveTake: (blob: Blob | null) => void = () => {};
    const pending = new Promise<Blob | null>((resolve) => { resolveTake = resolve; });
    this.stopRecordingPromise = pending;
    this.stopRecordingResolver = resolveTake;
    try {
      recorder.stop();
    } catch (error) {
      this.setGlobalError(error instanceof Error ? `Could not stop recording: ${error.message}` : "Could not stop recording.");
      this.finishRecording(recorder, null);
    }
    return pending;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidatePendingStarts();
    this.recordingStartGeneration += 1;
    this.recordingStarting = false;
    for (const id of ["a", "b"] as const) {
      this.runtime[id].loadGeneration += 1;
      this.stopSource(id, true);
      this.runtime[id].buffer = null;
      this.runtime[id].reversedBuffer = null;
    }
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // The recorder may have transitioned to inactive during teardown.
      }
    }
    this.stopRecordingResolver?.(null);
    this.stopRecordingResolver = null;
    this.stopRecordingPromise = null;
    this.recordingChunks = [];
    this.recorder = null;
    this.nodes = null;
    this.master = null;
    this.compressor = null;
    this.recordingDestination?.stream.getTracks().forEach((track) => track.stop());
    this.recordingDestination = null;
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = null;
  }

  private async ensureContext() {
    if (this.disposed) throw new Error("Audio engine is closed.");
    if (this.context && this.context.state !== "closed") return this.context;
    const AudioContextConstructor = window.AudioContext || (
      window as Window & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Web Audio is not available in this browser.");
    const context = new AudioContextConstructor({ latencyHint: "interactive", sampleRate: 44100 });
    this.context = context;
    this.createGraph(context);
    return context;
  }

  private async resumeContext() {
    const context = await this.ensureContext();
    if (context.state !== "running") await context.resume();
    return context;
  }

  private createGraph(context: AudioContext) {
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const recordingDestination = context.createMediaStreamDestination();
    compressor.threshold.value = -5;
    compressor.knee.value = 12;
    compressor.ratio.value = 10;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.14;
    master.gain.value = this.state.master;
    master.connect(compressor);
    compressor.connect(context.destination);
    compressor.connect(recordingDestination);
    this.master = master;
    this.compressor = compressor;
    this.recordingDestination = recordingDestination;
    this.nodes = ({} as Record<DeckId, DeckNodes>);
    for (const id of ["a", "b"] as const) {
      const lowpass = context.createBiquadFilter();
      const highpass = context.createBiquadFilter();
      const gain = context.createGain();
      const crossfade = context.createGain();
      lowpass.type = "lowpass";
      highpass.type = "highpass";
      lowpass.Q.value = 0.707;
      highpass.Q.value = 0.707;
      gain.gain.value = this.state.decks[id].gain;
      lowpass.connect(highpass).connect(gain).connect(crossfade).connect(master);
      this.nodes[id] = { lowpass, highpass, gain, crossfade };
      this.applyFilter(id);
    }
    this.applyCrossfade();
    this.commitState({ ...this.state, recordingSupported: typeof MediaRecorder !== "undefined" });
    this.emit();
  }

  private installBuffer(id: DeckId, buffer: AudioBuffer, name: string, bpm: number | null = null) {
    this.invalidatePendingStarts(id);
    this.pauseDeck(id);
    const runtime = this.runtime[id];
    runtime.buffer = buffer;
    runtime.reversedBuffer = null;
    runtime.anchorPosition = 0;
    runtime.anchorTime = this.context?.currentTime ?? 0;
    this.setDeck(id, {
      name,
      duration: buffer.duration,
      loading: false,
      error: null,
      peaks: buildPeaks(buffer),
      reverse: false,
      loop: { enabled: false, start: 0, end: 0 },
      cues: [null, null, null, null],
      bpm,
    });
  }

  private pauseDeck(id: DeckId) {
    const deck = this.state.decks[id];
    if (!deck.playing) return;
    const position = this.getPosition(id);
    this.stopSource(id, false);
    this.runtime[id].anchorPosition = position;
    this.setDeck(id, { playing: false });
  }

  private startDeck(id: DeckId, requestedPosition: number, at: number) {
    const deck = this.state.decks[id];
    const runtime = this.runtime[id];
    const context = this.context;
    const nodes = this.nodes;
    if (!context || !nodes || !runtime.buffer || !deck.duration) {
      this.setDeck(id, { error: "Load a sound before playing this deck." });
      return;
    }
    const position = resolvePlayPosition(
      requestedPosition,
      deck.duration,
      deck.reverse,
      deck.loop,
    );
    this.stopSource(id, false);
    const playbackBuffer = deck.reverse
      ? (runtime.reversedBuffer ??= reversedCopy(context, runtime.buffer))
      : runtime.buffer;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = playbackBuffer;
    source.playbackRate.value = deck.rate;
    if (deck.loop.enabled) {
      const loop = originalLoopForSource(deck.loop, deck.duration, deck.reverse);
      if (loop) {
        source.loop = true;
        source.loopStart = loop.start;
        source.loopEnd = loop.end;
      }
    }
    source.connect(gain).connect(nodes[id].lowpass);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + CLICK_FADE_SECONDS);
    const active: ActiveSource = { node: source, gain };
    runtime.source = active;
    runtime.anchorPosition = position;
    runtime.anchorTime = at;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (runtime.source !== active) return;
      runtime.source = null;
      if (this.disposed || !this.state.decks[id].playing) return;
      runtime.anchorPosition = this.getPosition(id);
      this.setDeck(id, { playing: false });
    };
    try {
      source.start(at, sourceOffsetForPosition(position, deck.duration, deck.reverse));
      this.setDeck(id, { playing: true, error: null });
    } catch (error) {
      runtime.source = null;
      source.disconnect();
      gain.disconnect();
      this.setDeck(id, { playing: false, error: error instanceof Error ? error.message : "Audio playback failed." });
    }
  }

  private stopSource(id: DeckId, immediate: boolean) {
    const active = this.runtime[id].source;
    const context = this.context;
    if (!active || !context) return;
    this.runtime[id].source = null;
    const now = context.currentTime;
    try {
      active.gain.gain.cancelScheduledValues(now);
      if (immediate) {
        active.node.stop(now);
      } else {
        active.gain.gain.setValueAtTime(Math.max(0.0001, active.gain.gain.value), now);
        active.gain.gain.linearRampToValueAtTime(0.0001, now + CLICK_FADE_SECONDS);
        active.node.stop(now + CLICK_FADE_SECONDS + 0.001);
      }
    } catch {
      // A source may already have ended between a UI action and this cleanup.
    }
  }

  private reconfigureDeck(id: DeckId, changes: Partial<DeckState>) {
    const position = this.getPosition(id);
    const playing = this.state.decks[id].playing;
    this.runtime[id].anchorPosition = position;
    this.setDeck(id, changes);
    if (playing && this.context) this.startDeck(id, position, this.context.currentTime + CLICK_FADE_SECONDS);
  }

  private setLoopBoundary(id: DeckId, boundary: "start" | "end", position: number) {
    const deck = this.state.decks[id];
    if (!deck.duration) return;
    const current = deck.loop;
    let start = current.start;
    let end = current.end;
    if (boundary === "start") {
      start = clamp(position, 0, Math.max(0, deck.duration - MIN_LOOP_SECONDS));
      if (end <= start) end = Math.min(deck.duration, start + 1);
    } else {
      end = clamp(position, MIN_LOOP_SECONDS, deck.duration);
      if (start >= end) start = Math.max(0, end - 1);
    }
    this.reconfigureDeck(id, { loop: { ...current, start, end } });
  }

  private applyFilter(id: DeckId) {
    const nodes = this.nodes?.[id];
    const context = this.context;
    if (!nodes || !context) return;
    const value = this.state.decks[id].filter;
    const maximumFrequency = Math.max(20, context.sampleRate / 2 - 1);
    const lowpassFrequency = Math.min(
      maximumFrequency,
      value < 0 ? 22000 * Math.pow(350 / 22000, -value) : 22000,
    );
    const highpassFrequency = Math.min(
      maximumFrequency,
      value > 0 ? 20 * Math.pow(5500 / 20, value) : 20,
    );
    nodes.lowpass.frequency.setTargetAtTime(lowpassFrequency, context.currentTime, 0.01);
    nodes.highpass.frequency.setTargetAtTime(highpassFrequency, context.currentTime, 0.01);
  }

  private applyCrossfade() {
    const nodes = this.nodes;
    const context = this.context;
    if (!nodes || !context) return;
    const gains = crossfadeGains(this.state.crossfade);
    nodes.a.crossfade.gain.setTargetAtTime(gains.a, context.currentTime, 0.006);
    nodes.b.crossfade.gain.setTargetAtTime(gains.b, context.currentTime, 0.006);
  }

  private setDeck(id: DeckId, changes: Partial<DeckState>) {
    this.commitState({
      ...this.state,
      decks: { ...this.state.decks, [id]: { ...this.state.decks[id], ...changes } },
    });
    this.emit();
  }

  private setDeckError(id: DeckId, error: unknown) {
    this.setDeck(id, { error: error instanceof Error ? error.message : "Audio playback failed." });
  }

  private setGlobalError(error: string | null) {
    this.commitState({ ...this.state, error });
    this.emit();
  }

  private finishRecording(recorder: MediaRecorder, blob: Blob | null) {
    if (this.recorder !== recorder) return;
    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;
    this.recordingChunks = [];
    this.recorder = null;
    this.commitState({ ...this.state, recording: false });
    this.emit();
    const resolve = this.stopRecordingResolver;
    this.stopRecordingResolver = null;
    this.stopRecordingPromise = null;
    if (resolve) resolve(blob);
    else if (!this.disposed) this.setGlobalError("Recording stopped before its take could be saved.");
  }

  private invalidatePendingStarts(id?: DeckId) {
    if (id) this.playbackGeneration[id] += 1;
    else {
      this.playbackGeneration.a += 1;
      this.playbackGeneration.b += 1;
    }
  }

  private commitState(next: InstrumentState) {
    const freezeDeck = (deck: DeckState) => {
      if (Object.isFrozen(deck)) return deck;
      if (!Object.isFrozen(deck.peaks)) Object.freeze(deck.peaks);
      if (!Object.isFrozen(deck.cues)) Object.freeze(deck.cues);
      if (!Object.isFrozen(deck.loop)) Object.freeze(deck.loop);
      return Object.freeze(deck);
    };
    const decks = next.decks;
    freezeDeck(decks.a);
    freezeDeck(decks.b);
    if (!Object.isFrozen(decks)) Object.freeze(decks);
    this.state = Object.freeze(next);
  }

  private snapshot(): InstrumentState {
    return this.state;
  }

  private emit() {
    if (!this.disposed) this.onChange(this.snapshot());
  }
}
