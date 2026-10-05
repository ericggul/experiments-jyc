export const palantirExperiments = [
  { slug: "1", label: "palantir/1" },
] as const;

export type PalantirExperimentSlug =
  (typeof palantirExperiments)[number]["slug"];

export function isPalantirExperimentSlug(
  value: string,
): value is PalantirExperimentSlug {
  return palantirExperiments.some((experiment) => experiment.slug === value);
}
