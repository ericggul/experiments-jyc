import type { Metadata } from "next";
import GoldfishesNavigation from "@/foundations/navigation";
import { goldfishExperiments } from "@/components/experiments";

export const metadata: Metadata = {
  title: "goldfishes",
  description: "A searchable chronological index of Goldfishes experiments.",
};

export default function GoldfishesIndexPage() {
  const experiments = goldfishExperiments.map(
    ({ key, area, section, date, phrase }) => ({
      key,
      area,
      section,
      date,
      phrase,
    }),
  );

  return <GoldfishesNavigation experiments={experiments} />;
}
