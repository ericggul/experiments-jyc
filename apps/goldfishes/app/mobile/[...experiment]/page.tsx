import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import GoldfishesNavigation from "@/components/navigation";
import { findGoldfishExperiment, getGoldfishExperimentsForDate } from "@/components/experiments";

type Props = { params: Promise<{ experiment: string[] }> };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment: path } = await params;
  return { title: `goldfishes mobile ${path.join("/")}` };
}

export default async function MobileExperiment({ params }: Props) {
  const { experiment: path } = await params;
  if (path.length === 1) {
    const experiments = getGoldfishExperimentsForDate(path[0], "mobile")
      .map(({ key, area, section, date, phrase }) => ({ key, area, section, date, phrase }));
    if (!experiments.length) notFound();
    return <GoldfishesNavigation experiments={experiments} scope="mobile" archiveKey={`mobile/${path[0]}`} />;
  }
  const experiment = findGoldfishExperiment(["mobile", ...path]);
  if (!experiment || experiment.area !== "mobile") notFound();
  const { default: Component } = await experiment.load();
  return <Component />;
}
