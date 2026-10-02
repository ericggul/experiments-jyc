import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function SelfEvolvingNetworkIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "self-evolving-network" })}
      scope="self-evolving-network"
      scopeKey="self-evolving-network"
    />
  );
}
