import type { Metadata } from "next";
import GazeTracking from "@/components/mobile/gaze-tracking";

export const metadata: Metadata = { title: "mobile / gaze-tracking" };

export default function GazeTrackingPage() {
  return <GazeTracking />;
}
