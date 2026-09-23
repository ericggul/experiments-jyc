import { notFound } from "next/navigation";
import { sixSigmaNavigationExperiments } from "@/components/experiments";
import SixSigmaNavigation from "@/components/navigation";

export default async function DatedScreenIndexPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const experiments = sixSigmaNavigationExperiments.filter((item) =>
    item.key.startsWith(`screen/${date}/`),
  );
  if (experiments.length === 0) notFound();

  return (
    <SixSigmaNavigation
      experiments={experiments}
      scope="screen"
      archiveDate={date}
    />
  );
}
