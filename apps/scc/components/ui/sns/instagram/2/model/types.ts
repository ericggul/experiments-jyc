export type InstagramStoryState = "new" | "plain" | "empty";

export type InstagramStoryCycle = {
  emptyDuration: number;
  newDuration: number;
  plainDuration: number;
  phaseOffset: number;
};

export type InstagramStory = {
  id: string;
  handle: string;
  cycle: InstagramStoryCycle;
};
