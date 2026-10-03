import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function LivingTopologyIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "living-topology" })}
      scope="living-topology"
      scopeKey="living-topology"
    />
  );
}
