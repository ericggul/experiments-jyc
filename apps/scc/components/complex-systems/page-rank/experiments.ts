export const pageRankExperiments = [
  { slug: "1", label: "page-rank/1" },
  { slug: "2", label: "page-rank/2" },
  { slug: "3", label: "page-rank/3" },
] as const;

export type PageRankExperimentSlug =
  (typeof pageRankExperiments)[number]["slug"];

export function isPageRankExperimentSlug(
  value: string,
): value is PageRankExperimentSlug {
  return pageRankExperiments.some((experiment) => experiment.slug === value);
}
