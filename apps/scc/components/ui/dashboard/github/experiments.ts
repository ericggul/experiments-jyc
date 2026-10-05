export const githubExperiments = [
  { slug: "1", label: "github/1" },
  { slug: "2", label: "github/2" },
] as const;

export type GitHubExperimentSlug = (typeof githubExperiments)[number]["slug"];

export function isGitHubExperimentSlug(
  value: string,
): value is GitHubExperimentSlug {
  return githubExperiments.some((experiment) => experiment.slug === value);
}
