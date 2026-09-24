export type StoryStatus = "empty" | "new" | "viewing" | "leaving";

export type StoryNode = Readonly<{
  id: string;
  index: number;
  handle: string;
}>;

export type StoryCellState = Readonly<{
  status: StoryStatus;
  until: number | null;
}>;

export type StoryActivation = Readonly<{
  index: number;
  createdAt: number;
}>;

export type StoryEdge = Readonly<{
  id: string;
  source: number;
  target: number;
  createdAt: number;
  expiresAt: number;
}>;

export type SocialStorySystem = Readonly<{
  columns: number;
  rows: number;
  nodes: readonly StoryNode[];
  states: readonly StoryCellState[];
}>;
