import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement / tv / grid",
};

export default function GridTvIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "advertisement/tv/grid" })}
      scope="advertisement/tv/grid"
      scopeKey="advertisement/tv/grid"
    />
  );
}
