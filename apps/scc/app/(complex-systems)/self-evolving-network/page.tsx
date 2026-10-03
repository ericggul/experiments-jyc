import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
