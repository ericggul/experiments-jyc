import type { Metadata } from "next";
import GoldfishesNavigation from "@/foundations/navigation";
import { goldfishExperiments } from "@/components/experiments";

export const metadata: Metadata = {
  title: "goldfishes pc",
  description: "Goldfishes PC experiments.",
};

export default function GoldfishesPcIndexPage() {
  const experiments = goldfishExperiments
    .filter((experiment) => experiment.area === "pc")
    .map(({ key, area, section, date, phrase }) => ({
      key,
      area,
      section,
      date,
      phrase,
    }));

  return <GoldfishesNavigation experiments={experiments} scope="pc" />;
}
