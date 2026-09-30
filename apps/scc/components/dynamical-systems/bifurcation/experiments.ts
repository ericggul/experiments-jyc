export const bifurcationExperiments = [
  {
    slug: "1",
    label: "bifurcation / 1",
    description:
      "A GPU particle rendering of the logistic-map period-doubling bifurcation.",
  },
  {
    slug: "2",
    label: "bifurcation / 2",
    description:
      "Forty-eight thousand GPU particles, each iterating a one-dimensional map at its own parameter, settling into the period-doubling route to chaos.",
  },
  {
    slug: "3",
    label: "bifurcation / 3",
    description:
      "Thirty thousand GPU particles carried by a three-dimensional flow whose parameter drifts, so the cloud lives through each bifurcation: it splits, circles, doubles and breaks into chaos.",
  },
] as const;

export type BifurcationExperimentSlug =
  (typeof bifurcationExperiments)[number]["slug"];

export function isBifurcationExperimentSlug(
  value: string,
): value is BifurcationExperimentSlug {
  return bifurcationExperiments.some((experiment) => experiment.slug === value);
}
