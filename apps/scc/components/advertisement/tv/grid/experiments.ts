export const gridTvExperiments = [
  { slug: "1", label: "grid/1" },
  { slug: "2", label: "grid/2" },
  { slug: "3", label: "grid/3" },
] as const;

export type GridTvExperimentSlug = (typeof gridTvExperiments)[number]["slug"];

export function isGridTvExperimentSlug(value: string): value is GridTvExperimentSlug {
  return gridTvExperiments.some((experiment) => experiment.slug === value);
}
