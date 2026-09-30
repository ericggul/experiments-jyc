import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FlightVisualisationOne from "@/components/complex-systems/flight-visualisation/1";
import {
  flightVisualisationExperiments,
  isFlightVisualisationExperimentSlug,
} from "@/components/complex-systems/flight-visualisation/experiments";

export function generateStaticParams() {
  return flightVisualisationExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "complex-systems",
  description: "Live ADS-B aircraft around a receiver, after viz1090.",
};

export default async function FlightVisualisationExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isFlightVisualisationExperimentSlug(experiment)) notFound();
  return <FlightVisualisationOne />;
}
