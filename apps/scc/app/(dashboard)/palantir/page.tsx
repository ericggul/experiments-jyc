import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
