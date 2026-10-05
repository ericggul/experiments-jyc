export const adaptiveCoevolvingNetworkExperiments = [
  { slug: "1", label: "coevolving voter network" },
  { slug: "1-3d", label: "coevolving voter network in 3d" },
  { slug: "2", label: "adaptive epidemic" },
  { slug: "3", label: "adaptive cooperation" },
  { slug: "4", label: "echo chambers" },
  { slug: "5", label: "self-organized criticality" },
  { slug: "6", label: "awareness and epidemic" },
  { slug: "7", label: "ranked web" },
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
