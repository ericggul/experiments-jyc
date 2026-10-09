import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement",
  description: "A dated index of SCC advertisement experiments.",
};

export default function AdvertisementIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "advertisement" })}
      scope="advertisement"
      scopeKey="advertisement"
    />
  );
}
