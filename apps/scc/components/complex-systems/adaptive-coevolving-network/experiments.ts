export const adaptiveCoevolvingNetworkExperiments = [
  { slug: "1", label: "coevolving voter network" },
  { slug: "2", label: "adaptive epidemic" },
  { slug: "3", label: "adaptive cooperation" },
  { slug: "4", label: "physarum network" },
  { slug: "5", label: "structural balance" },
  { slug: "6", label: "bounded confidence" },
  { slug: "7", label: "echo chambers" },
  { slug: "8", label: "autocatalytic ecosystem" },
  { slug: "9", label: "self-organized criticality" },
  { slug: "10", label: "coevolving culture" },
  { slug: "11", label: "awareness and epidemic" },
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
