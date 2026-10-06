import { notFound } from "next/navigation";
import RoadSignsOne from "@/components/standalone/transportation/road-signs/1";
import { roadSignsExperiments } from "@/components/standalone/transportation/road-signs/experiments";

export const metadata = { title: "Road signs" };
export function generateStaticParams() { return roadSignsExperiments.map(({ slug }) => ({ experiment: slug })); }
export default async function Page({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!roadSignsExperiments.some(({ slug }) => slug === experiment)) notFound();
  return <RoadSignsOne />;
}
