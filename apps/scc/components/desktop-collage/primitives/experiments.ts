export const primitivesExperiments = [
  { slug: "1", label: "desktop-collage/primitives/1" },
] as const;

export type PrimitivesExperimentSlug = (typeof primitivesExperiments)[number]["slug"];

export function isPrimitivesExperimentSlug(value: string): value is PrimitivesExperimentSlug {
  return primitivesExperiments.some((experiment) => experiment.slug === value);
}
