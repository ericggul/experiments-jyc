import { createContext, useContext } from "react";
import { timeConfig } from "../model/time";

/**
 * How fast simulated time runs, for animations that play on their own
 * (storyboards). The field and the single-clone route provide it; a screen
 * that is animating away provides `frozen` so its session stops in place.
 */
export type Playback = { minutesPerSecond: number; playing: boolean; frozen: boolean };

export const PlaybackContext = createContext<Playback>({ minutesPerSecond: timeConfig.minutesPerSecond, playing: true, frozen: false });

export const usePlayback = () => useContext(PlaybackContext);

/**
 * Hands-on use (the mobile-testing route). When provided, storyboards stop
 * playing themselves and wait for the person's taps instead.
 */
export type Interaction = {
  /** The session has no further scripted step from here. */
  onExhausted: () => void;
  /** The active board exposes its back action (edge swipe); null on unmount. */
  register: (controls: { back: () => boolean } | null) => void;
};

export const InteractionContext = createContext<Interaction | null>(null);

export const useInteraction = () => useContext(InteractionContext);
