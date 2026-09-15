import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GoldfishesNavigation from "@/components/navigation";
import { findGoldfishExperiment, getGoldfishExperimentsForDate } from "@/components/experiments";

type Props = { params: Promise<{ experiment: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment: path } = await params;
  return { title: `goldfishes maximalist-collage ${path.join("/")}` };
}

export default async function MaximalistCollageExperiment({ params }: Props) {
  const { experiment: path } = await params;
  if (path.length === 1) {
    const experiments = getGoldfishExperimentsForDate(path[0], "maximalist-collage")
      .map(({ key, area, section, date, phrase }) => ({ key, area, section, date, phrase }));
    if (!experiments.length) notFound();
    return <GoldfishesNavigation experiments={experiments} scope="maximalist-collage" archiveKey={`maximalist-collage/${path[0]}`} />;
  }
  const experiment = findGoldfishExperiment(["maximalist-collage", ...path]);
  if (!experiment || experiment.area !== "maximalist-collage") notFound();
  const { default: Component } = await experiment.load();
  return <Component />;
}
