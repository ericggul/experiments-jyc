import { normalise, type Enter, type Script, type Shot } from "./storyboard-model.ts";

/** One way out of a panel: where the person tapped and where it led. */
export type Edge = { to: string; enter: Enter; tap?: Shot["tap"]; index: number };

export type Navigation = {
  start: string;
  /** Shots in script order, for following the scripted path when nothing specific is tapped. */
  shots: readonly Shot[];
  /** Ways out of each panel, in script order. */
  edges: ReadonlyMap<string, readonly Edge[]>;
};

/**
 * Reads a session's script as a navigation graph, so the same session that
 * plays itself on the desktop field can be used by hand: each change of panel
 * becomes an edge from the panel the person was on, at the point they tapped.
 */
export function buildNavigation(script: Script, panelIds: readonly string[]): Navigation {
  const shots = normalise(script).filter((shot) => panelIds.includes(shot.panel));
  const start = shots[0]?.panel ?? panelIds[0];
  const edges = new Map<string, Edge[]>();
  let current = start;
  shots.forEach((shot, index) => {
    if (index === 0 || shot.panel === current) return;
    const list = edges.get(current) ?? [];
    list.push({ to: shot.panel, enter: shot.enter ?? "push", tap: shot.tap, index });
    edges.set(current, list);
    current = shot.panel;
  });
  return { start, shots, edges };
}

/**
 * Tap targets for a panel: one per distinct tap point, preferring the next
 * edge after the script cursor so repeated taps walk through the session.
 */
export function hotspots(navigation: Navigation, panel: string, cursor: number, grid = 36): Edge[] {
  const byPoint = new Map<string, Edge>();
  for (const edge of navigation.edges.get(panel) ?? []) {
    if (!edge.tap) continue;
    const key = `${Math.round(edge.tap.x / grid)}:${Math.round(edge.tap.y / grid)}`;
    const held = byPoint.get(key);
    const better = !held || (held.index <= cursor && edge.index > cursor) || (held.index > cursor && edge.index > cursor && edge.index < held.index);
    if (better) byPoint.set(key, edge);
  }
  return [...byPoint.values()];
}

/** The next scripted change of panel after the cursor, if any. */
export function nextStep(navigation: Navigation, panel: string, cursor: number): Edge | null {
  for (let index = cursor + 1; index < navigation.shots.length; index++) {
    const shot = navigation.shots[index];
    if (shot.panel !== panel) return { to: shot.panel, enter: shot.enter ?? "push", tap: shot.tap, index };
  }
  return null;
}
