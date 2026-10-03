import type { ComponentType } from "react";
import type { Tone } from "../ios";
import type { Push, ScreenProps } from "../model/types";

/** A sample state for the standalone clone route and for review. */
export type Fixture = {
  view: string;
  /** Short authoring label, e.g. "second snooze". */
  label: string;
  seed?: number;
  /** Scene length in simulated minutes; the route plays elapsed 0 → duration. */
  duration?: number;
  /** Minute of day the scene starts. */
  clock?: number;
  pushes?: readonly Push[];
};

export type CloneDefinition = {
  Screen: ComponentType<ScreenProps>;
  fixtures: readonly Fixture[];
  /** Status-bar and home-indicator glyph tone for a view; default "dark". */
  tone?: (view: string) => Tone;
};
