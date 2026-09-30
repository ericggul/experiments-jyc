import type { Metadata } from "next";
import SccNavigation from "@/components/navigation";
import { getSccNavigationItems } from "@/components/navigation/experiments";

export const metadata: Metadata = {
  title: "swarm",
};

export default function SwarmIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "swarm" })}
      scope="swarm"
      scopeKey="swarm"
    />
  );
}
