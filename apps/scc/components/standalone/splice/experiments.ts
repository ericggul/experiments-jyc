export const spliceExperiments = [
  { slug: "1", label: "Audio instrument", description: "Two sources. Find a fragment, repeat it, mix it, interrupt it." },
] as const;

export type SpliceExperimentSlug = (typeof spliceExperiments)[number]["slug"];

export function isSpliceExperimentSlug(value: string): value is SpliceExperimentSlug {
  return spliceExperiments.some((experiment) => experiment.slug === value);
}
