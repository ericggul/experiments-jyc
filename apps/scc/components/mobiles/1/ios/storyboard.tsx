import { useState, type ReactNode } from "react";
import { useInteraction } from "./playback";
import { AutoBoard } from "./storyboard-auto";
import { InteractiveBoard } from "./storyboard-interactive";
import type { Session } from "./storyboard-types";

export type { Enter, Shot } from "./storyboard-model";
export type { Panel, Session } from "./storyboard-types";

/**
 * An app's session: built once per `id` from the clone's pure builder, then
 * played either by itself in simulated time (the desktop field, AutoBoard) or
 * by hand (the mobile-testing route, InteractiveBoard). Clones never choose:
 * the surrounding route does, through InteractionContext.
 */
export function Storyboard({ id, elapsed, build, live }: {
  /** Changes whenever the session should be rebuilt (scene seed, view, duration). */
  id: string;
  /** Simulated minutes since the scene started (re-sync point). */
  elapsed: number;
  /** Builds the session; called once per `id`. Must be pure. */
  build: () => Session;
  /**
   * Per-panel live content (ETA, timers, meters) that re-renders every tick.
   * It is drawn inside its panel, so it moves with that panel's transitions.
   * Return null for panels without live values.
   */
  live?: (panel: string) => ReactNode;
}) {
  // The session is built once per id (derived state), never on ordinary ticks.
  const [built, setBuilt] = useState(() => ({ id, session: build() }));
  if (built.id !== id) setBuilt({ id, session: build() });
  const interactive = useInteraction() !== null;
  const Board = interactive ? InteractiveBoard : AutoBoard;
  return <Board key={built.id} session={built.session} elapsed={elapsed} live={live} />;
}
