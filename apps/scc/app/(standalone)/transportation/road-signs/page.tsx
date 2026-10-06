import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Road signs",
};

export default function RoadSignsIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "transportation/road-signs" })}
      scope="transportation/road-signs"
      scopeKey="transportation/road-signs"
    />
  );
}
