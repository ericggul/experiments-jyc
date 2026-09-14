import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjOneScreen, {
  DjScreenExperience as DjOneScreenExperience,
} from "@/components/dj/1/screen";
import {
  djExperiments,
  getDjExperimentScreenIds,
  type DjExperimentSlug,
  type DjScreenId,
  isDjExperimentScreenRoute,
  isDjExperimentSlug,
  isDjScreenId,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return djExperiments.flatMap((experiment) =>
    [
      ...experiment.screenIds,
      ...(experiment.hasWholeScreen ? (["whole"] as const) : []),
    ].map((screen) => ({
      experiment: experiment.slug,
      screen,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; screen: string }>;
}): Promise<Metadata> {
  const { experiment, screen } = await params;
  return {
    title: `dj ${experiment} screen ${screen}`,
  };
}

export default async function DjScreenPage({
  params,
}: {
  params: Promise<{ experiment: string; screen: string }>;
}) {
  const { experiment, screen } = await params;

  if (
    !isDjExperimentSlug(experiment) ||
    !isDjExperimentScreenRoute(experiment, screen)
  ) {
    notFound();
  }

  const screenIds = getDjExperimentScreenIds(experiment);
  if (!screenIds) {
    notFound();
  }

  if (screen === "whole") {
    return getWholeComponent(experiment, screenIds);
  }

  if (!isDjScreenId(screen)) {
    notFound();
  }

  return getScreenComponent(experiment, screen);
}

function getWholeComponent(
  _experiment: DjExperimentSlug,
  screenIds: readonly DjScreenId[],
) {
  return <DjOneScreenExperience screenIds={screenIds} />;
}

function getScreenComponent(experiment: DjExperimentSlug, screenId: DjScreenId) {
  if (experiment !== "1") notFound();
  return <DjOneScreen screenId={screenId} />;
}
