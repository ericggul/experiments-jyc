import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "palantir",
};

export default function PalantirIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "palantir" })}
      scope="palantir"
      scopeKey="palantir"
    />
  );
}
