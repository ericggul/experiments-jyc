import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement / tv / american",
};

export default function AmericanTvIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "advertisement/tv/american" })}
      scope="advertisement/tv/american"
      scopeKey="advertisement/tv/american"
    />
  );
}
