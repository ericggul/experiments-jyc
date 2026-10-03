import type { Metadata } from "next";
import SccNavigation from "@/foundations/navigation";
import { getSccNavigationItems } from "@/foundations/navigation/experiments";

export const metadata: Metadata = {
  title: "mobile / gaze-tracking",
};

export default function MobileGazeTrackingIndexPage() {
  return (
    <SccNavigation
      experiments={getSccNavigationItems({ family: "mobile/gaze-tracking" })}
      scope="mobile/gaze-tracking"
      scopeKey="mobile/gaze-tracking"
    />
  );
}
