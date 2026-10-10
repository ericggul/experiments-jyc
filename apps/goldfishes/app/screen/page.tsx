import type { Metadata } from "next";
import GoldfishesNavigation from "@/foundations/navigation";
import { goldfishExperiments } from "@/components/experiments";

export const metadata: Metadata = {
  title: "goldfishes screen",
  description: "Goldfishes screen experiments.",
};

export default function GoldfishesScreenIndexPage() {
  const experiments = goldfishExperiments
    .filter((experiment) => experiment.area === "screen")
    .map(({ key, area, section, date, updated, phrase }) => ({
      key,
      area,
      section,
      date,
      updated,
      phrase,
    }));

  return <GoldfishesNavigation experiments={experiments} scope="screen" />;
}
