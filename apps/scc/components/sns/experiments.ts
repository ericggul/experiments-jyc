export const snsExperiments = [
  { key: "mobile/1", category: "mobile", slug: "1", label: "sns/mobile/1 — 오브제" },
  { key: "mobile/2", category: "mobile", slug: "2", label: "sns/mobile/2 — 한끼" },
  { key: "mobile/3", category: "mobile", slug: "3", label: "sns/mobile/3 — 여백" },
  { key: "mobile/4", category: "mobile", slug: "4", label: "sns/mobile/4 — 오늘" },
  { key: "mobile/5", category: "mobile", slug: "5", label: "sns/mobile/5 — 곁" },
  { key: "mobile/6", category: "mobile", slug: "6", label: "sns/mobile/6 — THREAD" },
  { key: "mobile/7", category: "mobile", slug: "7", label: "sns/mobile/7 — SIDEWALK" },
  { key: "mobile/8", category: "mobile", slug: "8", label: "sns/mobile/8 — PLATFORM" },
  { key: "mobile/9", category: "mobile", slug: "9", label: "sns/mobile/9 — REP" },
  { key: "mobile/10", category: "mobile", slug: "10", label: "sns/mobile/10 — COMMON" },
  { key: "feed/1", category: "feed", slug: "1", label: "sns/feed/1" },
  {
    key: "instagram/1",
    category: "instagram",
    slug: "1",
    label: "sns/instagram/1",
  },
  {
    key: "instagram/2",
    category: "instagram",
    slug: "2",
    label: "sns/instagram/2",
  },
  {
    key: "instagram/3",
    category: "instagram",
    slug: "3",
    label: "sns/instagram/3",
  },
  {
    key: "instagram/4",
    category: "instagram",
    slug: "4",
    label: "sns/instagram/4",
  },
  {
    key: "navigation/default",
    category: "navigation",
    slug: "default",
    label: "sns/navigation/default",
  },
  {
    key: "navigation/1",
    category: "navigation",
    slug: "1",
    label: "sns/navigation/1",
  },
  {
    key: "navigation/2",
    category: "navigation",
    slug: "2",
    label: "sns/navigation/2",
  },
  { key: "youtube/1", category: "youtube", slug: "1", label: "sns/youtube/1" },
  { key: "youtube/2", category: "youtube", slug: "2", label: "sns/youtube/2" },
  { key: "youtube/3", category: "youtube", slug: "3", label: "sns/youtube/3" },
  { key: "youtube/4", category: "youtube", slug: "4", label: "sns/youtube/4" },
  { key: "youtube/5", category: "youtube", slug: "5", label: "sns/youtube/5" },
  { key: "youtube/6", category: "youtube", slug: "6", label: "sns/youtube/6" },
  { key: "linkedin/2", category: "linkedin", slug: "2", label: "sns/linkedin/2" },
  { key: "linkedin/3", category: "linkedin", slug: "3", label: "sns/linkedin/3" },
  { key: "linkedin/4", category: "linkedin", slug: "4", label: "sns/linkedin/4" },
  { key: "linkedin/5", category: "linkedin", slug: "5", label: "sns/linkedin/5" },
  { key: "linkedin/6", category: "linkedin", slug: "6", label: "sns/linkedin/6" },
  { key: "linkedin/6-test", category: "linkedin", slug: "6-test", label: "sns/linkedin/6-test" },
  { key: "linkedin/1", category: "linkedin", slug: "1", label: "sns/linkedin/1" },
] as const;

export type SnsExperiment = (typeof snsExperiments)[number];
export type SnsExperimentCategory = SnsExperiment["category"];
export type SnsExperimentKey = SnsExperiment["key"];

export function findSnsExperiment(category: string, slug: string) {
  return snsExperiments.find(
    (experiment) =>
      experiment.category === category && experiment.slug === slug,
  );
}
