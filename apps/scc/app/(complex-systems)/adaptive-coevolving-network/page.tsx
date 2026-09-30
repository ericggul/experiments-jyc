import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function AdaptiveCoevolvingNetworkIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "adaptive-coevolving-network" })}
      scope="adaptive-coevolving-network"
      scopeKey="adaptive-coevolving-network"
    />
  );
}
