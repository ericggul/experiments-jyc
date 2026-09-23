import { notFound } from "next/navigation";
import { findSixSigmaExperiment } from "@/components/experiments";

export default async function ScreenExperimentPage({
  params,
}: {
  params: Promise<{ date: string; experiment: string }>;
}) {
  const { date, experiment } = await params;
  const entry = findSixSigmaExperiment(["screen", date, experiment]);
  if (!entry) notFound();

  const { default: Screen } = await entry.load();
  return <Screen />;
}
