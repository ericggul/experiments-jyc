export const duffingExperiments = [
  {
    slug: "1",
    label: "duffing / 1",
    description:
      "An editable visualization of a driven, damped double-well Duffing oscillator.",
  },
  {
    slug: "2",
    label: "duffing / 2",
    description:
      "Thirty thousand GPU-integrated Duffing oscillators rolling in a double well that the drive tilts around one ring of drive phase.",
  },
  {
    slug: "3",
    label: "duffing / 3",
    description:
      "The duffing/2 ring with a drive strength that drifts continuously, so one ensemble lives through two wells, period doubling, chaos and back.",
  },
] as const;

export type DuffingExperimentSlug =
  (typeof duffingExperiments)[number]["slug"];

export function isDuffingExperimentSlug(
  value: string,
): value is DuffingExperimentSlug {
  return duffingExperiments.some((experiment) => experiment.slug === value);
}
