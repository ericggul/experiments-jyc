import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GazeTracking from "@/components/mobile/gaze-tracking";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / gaze-tracking / ${experiment}` };
}

export default async function GazeTrackingExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <GazeTracking />;
  if (experiment !== "2") notFound();

  return (
    <SccNavigation
      experiments={getCloneNavigationItems("mobile/gaze-tracking/2")}
      scope="mobile/gaze-tracking/2"
      scopeKey="mobile/gaze-tracking/2"
    />
  );
}
