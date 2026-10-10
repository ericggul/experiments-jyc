export const bubbleExperiments = [
  { slug: "1", label: "bubble/1" },
  { slug: "2", label: "bubble/2" },
  { slug: "3", label: "bubble/3" },
] as const;

/** Rejected builds kept as recorded failures (see docs/experiments/complex-systems/bubble/README.md). */
export const bubbleFailures = [
  { family: "failure", slug: "2", label: "bubble/failure/2" },
  { family: "failure", slug: "3", label: "bubble/failure/3" },
  { family: "failure", slug: "4", label: "bubble/failure/4" },
  { family: "failure", slug: "5", label: "bubble/failure/5" },
] as const;

export type BubbleExperimentSlug = (typeof bubbleExperiments)[number]["slug"];
export type BubbleFailureSlug = (typeof bubbleFailures)[number]["slug"];

export function isBubbleExperimentSlug(value: string): value is BubbleExperimentSlug {
  return bubbleExperiments.some((experiment) => experiment.slug === value);
}

export function isBubbleFailureSlug(value: string): value is BubbleFailureSlug {
  return bubbleFailures.some((experiment) => experiment.slug === value);
}
