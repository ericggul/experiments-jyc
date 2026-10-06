export const adaptiveCoevolvingNetworkExperiments = [
  { slug: "1", label: "coevolving voter network" },
  { slug: "1-3d", label: "coevolving voter network in 3d" },
  { slug: "1-glsl", label: "coevolving voter network as tissue" },
  { slug: "2", label: "adaptive epidemic" },
  { slug: "3", label: "adaptive cooperation" },
  { slug: "4", label: "echo chambers" },
  { slug: "5", label: "self-organized criticality" },
  { slug: "6", label: "awareness and epidemic" },
  { slug: "7", label: "ranked web" },
  { slug: "7-glsl", label: "ranked web as gel" },
  { slug: "7-glsl-2", label: "ranked web as combed fibres" },
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
