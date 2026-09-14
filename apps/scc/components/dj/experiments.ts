export const djExperiments = [
  {
    slug: "1",
    label: "dj/1",
    screenIds: ["1", "2", "3", "4"],
    hasWholeScreen: true,
    hasSingleScreen: false,
  },
  {
    slug: "2",
    label: "dj/2",
    screenIds: [],
    hasWholeScreen: false,
    hasSingleScreen: true,
  },
  {
    slug: "3",
    label: "dj/3",
    screenIds: [],
    hasWholeScreen: false,
    hasSingleScreen: true,
  },
] as const;

export type DjExperimentSlug = (typeof djExperiments)[number]["slug"];

export function isDjExperimentSlug(value: string): value is DjExperimentSlug {
  return djExperiments.some((experiment) => experiment.slug === value);
}

export const djScreenIds = ["1", "2", "3", "4"] as const;

export type DjScreenId = (typeof djScreenIds)[number];
export type DjScreenRoute = DjScreenId | "whole";

export function isDjScreenId(value: string): value is DjScreenId {
  return djScreenIds.some((screenId) => screenId === value);
}

export function getDjExperimentScreenIds(experimentSlug: DjExperimentSlug) {
  return djExperiments.find((experiment) => experiment.slug === experimentSlug)
    ?.screenIds;
}

export function isDjExperimentScreenRoute(
  experimentSlug: DjExperimentSlug,
  value: string,
): value is DjScreenRoute {
  const experiment = djExperiments.find(
    (candidate) => candidate.slug === experimentSlug,
  );

  return (
    (value === "whole" && experiment?.hasWholeScreen === true) ||
    Boolean(experiment?.screenIds.some((screenId) => screenId === value))
  );
}
