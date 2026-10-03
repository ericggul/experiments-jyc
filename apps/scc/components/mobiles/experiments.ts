export const mobilesExperiments = [{ slug: "1", label: "mobiles/1" }] as const;

export type MobilesExperimentSlug = (typeof mobilesExperiments)[number]["slug"];

export function isMobilesExperimentSlug(value: string): value is MobilesExperimentSlug {
  return mobilesExperiments.some((experiment) => experiment.slug === value);
}
