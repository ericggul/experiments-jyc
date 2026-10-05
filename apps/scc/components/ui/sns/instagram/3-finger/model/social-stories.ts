import type { SocialStorySystem, StoryCellState, StoryNode } from "./types";

const HANDLES = [
  "han.jiwon", "miso.archive", "yumi__o", "haeun.k", "siwoo.film", "eunchae.jpg",
  "leena.seo", "noah.kim", "yeoreum", "dohee.cho", "jinseoul", "sora__lee",
  "maeul.diary", "haneulpark", "riaonfilm", "jaeonfilm", "mina.park", "bora.archive",
  "do__not", "aeri.lee", "june.after", "nari.zip", "seoyeon.k", "sori.cho",
] as const;

const NEW_MILLISECONDS = 1200;
const VIEWING_MILLISECONDS = 760;
const LEAVING_MILLISECONDS = 300;

function emptyState(): StoryCellState {
  return { status: "empty", until: null };
}

export function createStorySystem(columns: number, rows: number): SocialStorySystem {
  const nodes: StoryNode[] = Array.from({ length: columns * rows }, (_, index) => ({
    id: `story-${index + 1}`,
    index,
    handle: HANDLES[index % HANDLES.length]!,
  }));
  return { columns, rows, nodes, states: nodes.map(emptyState) };
}

export function activateStory(system: SocialStorySystem, index: number, now: number): SocialStorySystem {
  if (system.states[index]?.status !== "empty") return system;
  const states = [...system.states];
  states[index] = { status: "new", until: now + NEW_MILLISECONDS };
  return { ...system, states };
}

export function stepStorySystem(system: SocialStorySystem, now: number): SocialStorySystem {
  let changed = false;
  const states = system.states.map((state) => {
    if (state.until === null || state.until > now) return state;
    changed = true;
    if (state.status === "new") {
      return { status: "viewing", until: now + VIEWING_MILLISECONDS } satisfies StoryCellState;
    }
    if (state.status === "viewing") {
      return { status: "leaving", until: now + LEAVING_MILLISECONDS } satisfies StoryCellState;
    }
    return emptyState();
  });
  return changed ? { ...system, states } : system;
}
