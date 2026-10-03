import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

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
