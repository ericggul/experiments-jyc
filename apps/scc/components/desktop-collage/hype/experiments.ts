export const hypeExperiments = [
  { slug: "1", label: "desktop-collage/hype/1" },
] as const;

export type HypeExperimentSlug = (typeof hypeExperiments)[number]["slug"];

export function isHypeExperimentSlug(value: string): value is HypeExperimentSlug {
  return hypeExperiments.some((experiment) => experiment.slug === value);
}
