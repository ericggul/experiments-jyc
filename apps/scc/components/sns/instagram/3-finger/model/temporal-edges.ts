import type { StoryActivation, StoryEdge } from "./types";

const HISTORY_MILLISECONDS = 1000;
export const EDGE_MILLISECONDS = 1200;

export function connectStoryActivation(
  history: readonly StoryActivation[],
  target: number,
  now: number,
  edgeId: (source: number) => string,
): { history: StoryActivation[]; edges: StoryEdge[] } {
  const recent = history.filter((entry) => now - entry.createdAt <= HISTORY_MILLISECONDS);
  const edges = recent.filter((entry) => entry.index !== target).map((entry) => ({
    id: edgeId(entry.index),
    source: entry.index,
    target,
    createdAt: now,
    expiresAt: now + EDGE_MILLISECONDS,
  }));
  return { history: [...recent, { index: target, createdAt: now }], edges };
}
