import { notFound } from "next/navigation";
import {
  findSixSigmaExperiment,
  sixSigmaNavigationExperiments,
} from "@/components/experiments";
import SixSigmaNavigation from "@/foundations/navigation";
import { getSixSigmaArchive } from "@/foundations/navigation/archive";

export default async function ScreenExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;

  if (path.length === 1) {
    const experiments = sixSigmaNavigationExperiments.filter(
      (item) => getSixSigmaArchive(item) === `screen/${path[0]}`,
    );
    if (experiments.length === 0) notFound();

    return (
      <SixSigmaNavigation
        experiments={experiments}
        scope="screen"
        archiveDate={path[0]}
      />
    );
  }

  const entry = findSixSigmaExperiment(["screen", ...path]);
  if (!entry || !entry.key.startsWith("screen/")) notFound();

  const { default: Screen } = await entry.load();
  return <Screen />;
}
