import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GoldfishesNavigation from "@/components/navigation";
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
    path.length === 1 ? getGoldfishExperimentsForDate(path[0], "pc") : [];

  if (dateExperiments.length > 0) {
    return { title: `goldfishes pc ${path[0]}` };
  }

  const experiment = findGoldfishExperiment(["pc", ...path]);
  return experiment ? { title: `goldfishes ${experiment.key}` } : {};
}

export default async function GoldfishesPcExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  if (path.join("/") === "0915/maximalist-collage") redirect("/maximalist-collage/0915/1");
  const dateExperiments =
    path.length === 1 ? getGoldfishExperimentsForDate(path[0], "pc") : [];

  if (dateExperiments.length > 0) {
    const experiments = dateExperiments.map(
      ({ key, area, section, date, phrase }) => ({
        key,
        area,
        section,
        date,
        phrase,
      }),
    );
    return (
      <GoldfishesNavigation
        experiments={experiments}
        archiveKey={`pc/${path[0]}`}
        scope="pc"
      />
    );
  }

  const experiment = findGoldfishExperiment(["pc", ...path]);

  if (!experiment || experiment.area !== "pc") notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
