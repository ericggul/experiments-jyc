export const selfEvolvingNetworkExperiments = [
  { slug: "1", label: "introductions and turnover" },
] as const;

export type SelfEvolvingNetworkExperimentSlug =
  (typeof selfEvolvingNetworkExperiments)[number]["slug"];

export function isSelfEvolvingNetworkExperimentSlug(
  value: string,
): value is SelfEvolvingNetworkExperimentSlug {
  return selfEvolvingNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
