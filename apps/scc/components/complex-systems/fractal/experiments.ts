export const fractalExperiments = [
  { family: "clock", slug: "1", label: "clock / 1" },
  { family: "clock", slug: "2", label: "clock / 2" },
  { family: "clock", slug: "3", label: "clock / 3" },
  { family: "logo", slug: "1", label: "logo / 1" },
] as const;

export type FractalExperiment = (typeof fractalExperiments)[number];

export function getFractalExperiment(family: string, slug: string) {
  return fractalExperiments.find(
    (experiment) => experiment.family === family && experiment.slug === slug,
  );
}
