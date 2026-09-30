export const orbitalResonanceExperiments = [
  {
    slug: "1",
    label: "orbital-resonance / 1",
    description:
      "Thirty thousand GPU-integrated test particles around a star and one planet, seen in the planet's rotating frame, where period-matched orbits stand still.",
  },
] as const;

export type OrbitalResonanceExperimentSlug =
  (typeof orbitalResonanceExperiments)[number]["slug"];

export function isOrbitalResonanceExperimentSlug(
  value: string,
): value is OrbitalResonanceExperimentSlug {
  return orbitalResonanceExperiments.some((experiment) => experiment.slug === value);
}
