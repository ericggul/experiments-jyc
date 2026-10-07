import { notFound } from "next/navigation";
import RoadSignDirectionOne from "@/components/standalone/transportation/road-signs/direction/1";
import RoadSignDirectionFractal from "@/components/standalone/transportation/road-signs/direction/2";
import RoadSignDirectionBranching from "@/components/standalone/transportation/road-signs/direction/3";
import RoadSignDirectionSkating from "@/components/standalone/transportation/road-signs/direction/4";
import { roadSignDirectionExperiments } from "@/components/standalone/transportation/road-signs/direction/experiments";

export const metadata = { title: "Road sign direction" };
export function generateStaticParams() { return roadSignDirectionExperiments.map(({ slug }) => ({ experiment: slug })); }
export default async function Page({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!roadSignDirectionExperiments.some(({ slug }) => slug === experiment)) notFound();
  if (experiment === "2") return <RoadSignDirectionFractal />;
  if (experiment === "3") return <RoadSignDirectionBranching />;
  if (experiment === "4") return <RoadSignDirectionSkating />;
  return <RoadSignDirectionOne />;
}
