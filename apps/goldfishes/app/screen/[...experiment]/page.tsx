import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GoldfishesNavigation from "@/foundations/navigation";
import {
  findGoldfishExperiment,
  getGoldfishExperimentsForDate,
} from "@/components/experiments";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}): Promise<Metadata> {
  const { experiment: path } = await params;
  const dateExperiments =
    path.length === 1 ? getGoldfishExperimentsForDate(path[0]) : [];

  if (dateExperiments.length > 0) {
    return { title: `goldfishes screen ${path[0]}` };
  }

  const experiment = findGoldfishExperiment(["screen", ...path]);
  return experiment ? { title: `goldfishes ${experiment.key}` } : {};
}

export default async function GoldfishesScreenExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  const dateExperiments =
    path.length === 1 ? getGoldfishExperimentsForDate(path[0]) : [];

  if (dateExperiments.length > 0) {
    const experiments = dateExperiments.map(
      ({ key, area, section, date, updated, phrase }) => ({
        key,
        area,
        section,
        date,
        updated,
        phrase,
      }),
    );
    return (
      <GoldfishesNavigation
        experiments={experiments}
        archiveKey={`screen/${path[0]}`}
        scope="screen"
      />
    );
  }

  const experiment = findGoldfishExperiment(["screen", ...path]);
  if (!experiment || experiment.area !== "screen") notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
