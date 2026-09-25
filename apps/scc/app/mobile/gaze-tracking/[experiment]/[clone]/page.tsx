import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GazeTrackingCloneExperiment from "@/components/mobile/gaze-tracking/clone-experiment";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ experiment: "2", clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string; clone: string }> }): Promise<Metadata> {
  const { experiment, clone } = await params;
  return { title: `mobile / gaze-tracking / ${experiment} / ${clone}` };
}

export default async function GazeTrackingClonePage({ params }: { params: Promise<{ experiment: string; clone: string }> }) {
  const { experiment, clone } = await params;
  const Clone = clones[clone];
  if (experiment !== "2" || !Clone) notFound();
  return <GazeTrackingCloneExperiment><Clone /></GazeTrackingCloneExperiment>;
}
