import { notFound } from "next/navigation";
import { findSixSigmaExperiment } from "@/components/experiments";

export default async function MobileExperimentPage({
  params,
}: {
  params: Promise<{ date: string; experiment: string }>;
}) {
  const { date, experiment } = await params;
  const entry = findSixSigmaExperiment(["mobile", date, experiment]);
  if (!entry) notFound();

  const { default: Mobile } = await entry.load();
  return <Mobile />;
}
