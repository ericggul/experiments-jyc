import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

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
