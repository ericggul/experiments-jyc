import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
