import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement / tv",
};

export default function AdvertisementTvIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "advertisement/tv" })}
      scope="advertisement/tv"
      scopeKey="advertisement/tv"
    />
  );
}
