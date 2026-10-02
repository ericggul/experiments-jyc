export const adaptiveCoevolvingNetworkExperiments = [
  { slug: "1", label: "coevolving voter network" },
  { slug: "2", label: "open adaptive network" },
  { slug: "3", label: "lattice adaptive network" },
  { slug: "polling-ecology", label: "polling ecology" },
] as const;

export type AdaptiveCoevolvingNetworkExperimentSlug =
  (typeof adaptiveCoevolvingNetworkExperiments)[number]["slug"];

export function isAdaptiveCoevolvingNetworkExperimentSlug(
  value: string,
): value is AdaptiveCoevolvingNetworkExperimentSlug {
  return adaptiveCoevolvingNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
