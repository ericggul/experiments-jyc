export const chemicalDecompositionExperiments = [
  { slug: "1", label: "chemical-decomposition/1" },
] as const;

export type ChemicalDecompositionExperimentSlug = (typeof chemicalDecompositionExperiments)[number]["slug"];

export function isChemicalDecompositionExperimentSlug(value: string): value is ChemicalDecompositionExperimentSlug {
  return chemicalDecompositionExperiments.some((experiment) => experiment.slug === value);
}
