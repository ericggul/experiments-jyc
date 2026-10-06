export const amoebaExperiments = [
  { slug: "1", label: "amoeba/1" },
  { slug: "2", label: "amoeba/2" },
] as const;

export type AmoebaExperimentSlug = (typeof amoebaExperiments)[number]["slug"];

export function isAmoebaExperimentSlug(value: string): value is AmoebaExperimentSlug {
  return amoebaExperiments.some((experiment) => experiment.slug === value);
}
