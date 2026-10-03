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
