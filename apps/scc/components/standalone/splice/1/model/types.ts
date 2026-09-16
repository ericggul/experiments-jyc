export type DeckId = "a" | "b";

export const CUE_SLOTS = [
  { id: "cue-1", index: 0 }, { id: "cue-2", index: 1 },
  { id: "cue-3", index: 2 }, { id: "cue-4", index: 3 },
] as const;

export type DeckState = {
  id: DeckId;
  name: string;
  duration: number;
  playing: boolean;
  loading: boolean;
  error: string | null;
  peaks: readonly number[];
  rate: number;
  gain: number;
  filter: number;
  reverse: boolean;
  loop: { enabled: boolean; start: number; end: number };
  cues: readonly (number | null)[];
  bpm: number | null;
};

export type InstrumentState = {
  decks: Record<DeckId, DeckState>;
  crossfade: number;
  master: number;
  recording: boolean;
  recordingSupported: boolean;
  error: string | null;
};

export function emptyDeck(id: DeckId): DeckState {
  return {
    id, name: "No sound loaded", duration: 0, playing: false,
    loading: false, error: null, peaks: [], rate: 1, gain: 0.8,
    filter: 0, reverse: false,
    loop: { enabled: false, start: 0, end: 0 },
    cues: [null, null, null, null], bpm: null,
  };
}

export function initialState(): InstrumentState {
  return {
    decks: { a: emptyDeck("a"), b: emptyDeck("b") },
    crossfade: 0, master: 0.7, recording: false,
    recordingSupported: false, error: null,
  };
}
