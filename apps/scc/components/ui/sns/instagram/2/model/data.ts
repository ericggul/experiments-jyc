import type { InstagramStory, InstagramStoryCycle, InstagramStoryState } from "./types";

const handles = [
  "han.jiwon", "miso.archive", "yumi__o", "haeun.k", "siwoo.film", "eunchae.jpg",
  "leena.seo", "noah.kim", "yeoreum", "dohee.cho", "jinseoul", "sora__lee",
  "maeul.diary", "haneulpark", "riaonfilm", "jaeonfilm", "mina.park", "bora.archive",
  "do__not", "aeri.lee", "june.after", "nari.zip", "seoyeon.k", "sori.cho",
] as const;

export const instagramStories: readonly InstagramStory[] = handles.map(
  (handle, index) => ({
    id: `profile-${String(index + 1).padStart(3, "0")}`,
    handle,
    cycle: getStoryCycle(index),
  }),
);

function getRandomFraction(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getStoryCycle(index: number): InstagramStoryCycle {
  const emptyDuration = 1800 + Math.round(getRandomFraction(index, 1) * 3200);
  const newDuration = 2200 + Math.round(getRandomFraction(index, 2) * 3600);
  const plainDuration = 2400 + Math.round(getRandomFraction(index, 3) * 4000);
  const totalDuration = emptyDuration + newDuration + plainDuration;

  return {
    emptyDuration,
    newDuration,
    plainDuration,
    phaseOffset: Math.round(getRandomFraction(index, 4) * totalDuration),
  };
}

function getElapsedCycleTime(story: InstagramStory, time: number): number {
  const { emptyDuration, newDuration, plainDuration, phaseOffset } = story.cycle;
  const totalDuration = emptyDuration + newDuration + plainDuration;
  const elapsed = (time + phaseOffset) % totalDuration;

  return elapsed < 0 ? elapsed + totalDuration : elapsed;
}

export function getStoryState(story: InstagramStory, time: number): InstagramStoryState {
  const elapsed = getElapsedCycleTime(story, time);
  const { emptyDuration, newDuration } = story.cycle;

  if (elapsed < emptyDuration) return "empty";
  if (elapsed < emptyDuration + newDuration) return "new";
  return "plain";
}

export function getNextStoryStateChangeAt(story: InstagramStory, time: number): number {
  const elapsed = getElapsedCycleTime(story, time);
  const { emptyDuration, newDuration, plainDuration } = story.cycle;
  const boundary = elapsed < emptyDuration
    ? emptyDuration
    : elapsed < emptyDuration + newDuration
      ? emptyDuration + newDuration
      : emptyDuration + newDuration + plainDuration;

  return time + Math.max(1, Math.ceil(boundary - elapsed));
}

export function getInstagramGridStories(count: number): readonly InstagramStory[] {
  return Array.from({ length: count }, (_, index) => {
    const company = instagramStories[index % instagramStories.length];
    const repeat = Math.floor(index / instagramStories.length) + 1;

    return {
      ...company,
      id: `${company.id}-grid-${repeat}`,
      cycle: getStoryCycle(index),
    };
  });
}
