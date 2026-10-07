import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "Road sign direction",
};

export default function RoadSignDirectionIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "transportation/road-signs/direction" })}
      scope="transportation/road-signs/direction"
      scopeKey="transportation/road-signs/direction"
    />
  );
}
