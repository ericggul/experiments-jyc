import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "statistical-modelling",
  description: "A dated index of SCC statistical-modelling experiments.",
};

export default function StatisticalModellingIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ area: "statistical-modelling" })}
      scope="statistical-modelling"
      scopeKey="statistical-modelling"
    />
  );
}
