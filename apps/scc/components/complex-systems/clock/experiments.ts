export const clockExperiments = [
  { slug: "1", label: "clock / 1" },
  { slug: "2", label: "clock / 2" },
  { slug: "3", label: "clock / 3" },
] as const;

export type ClockExperimentSlug =
  (typeof clockExperiments)[number]["slug"];

export function isClockExperimentSlug(
  value: string,
): value is ClockExperimentSlug {
  return clockExperiments.some((experiment) => experiment.slug === value);
}
