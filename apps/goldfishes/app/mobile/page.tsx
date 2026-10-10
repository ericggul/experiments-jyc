import type { Metadata } from "next";
import GoldfishesNavigation from "@/foundations/navigation";
import { goldfishExperiments } from "@/components/experiments";

export const metadata: Metadata = { title: "goldfishes mobile" };

export default function MobileIndex() {
  const experiments = goldfishExperiments
    .filter((experiment) => experiment.area === "mobile")
    .map(({ key, area, section, date, updated, phrase }) => ({ key, area, section, date, updated, phrase }));
  return <GoldfishesNavigation experiments={experiments} scope="mobile" />;
}
