import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement / tv / korean",
};

export default function KoreanTvIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "advertisement/tv/korean" })}
      scope="advertisement/tv/korean"
      scopeKey="advertisement/tv/korean"
    />
  );
}
