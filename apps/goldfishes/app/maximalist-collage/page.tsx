import type { Metadata } from "next";
import GoldfishesNavigation from "@/components/navigation";
import { goldfishExperiments } from "@/components/experiments";

export const metadata: Metadata = { title: "goldfishes maximalist-collage" };

export default function MaximalistCollageIndex() {
  const experiments = goldfishExperiments
    .filter((experiment) => experiment.area === "maximalist-collage")
    .map(({ key, area, section, date, phrase }) => ({ key, area, section, date, phrase }));
  return <GoldfishesNavigation experiments={experiments} scope="maximalist-collage" />;
}
