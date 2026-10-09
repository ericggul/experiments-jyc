import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "advertisement / tv / archive",
};

export default function TvArchiveIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "advertisement/tv/archive" })}
      scope="advertisement/tv/archive"
      scopeKey="advertisement/tv/archive"
    />
  );
}
