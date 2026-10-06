import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Traffic light",
};

export default function TrafficLightIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "transportation/traffic-light" })}
      scope="transportation/traffic-light"
      scopeKey="transportation/traffic-light"
    />
  );
}
