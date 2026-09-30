export const flightVisualisationExperiments = [
  { slug: "1", label: "flight visualisation / 1" },
] as const;

export type FlightVisualisationExperimentSlug =
  (typeof flightVisualisationExperiments)[number]["slug"];

export function isFlightVisualisationExperimentSlug(
  value: string,
): value is FlightVisualisationExperimentSlug {
  return flightVisualisationExperiments.some((experiment) => experiment.slug === value);
}
