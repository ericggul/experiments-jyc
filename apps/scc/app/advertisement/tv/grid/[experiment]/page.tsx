import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TvGridOne from "@/components/advertisement/tv/grid/1";
import TvGridTwo from "@/components/advertisement/tv/grid/2";
import { gridTvExperiments, isGridTvExperimentSlug } from "@/components/advertisement/tv/grid/experiments";

export const metadata: Metadata = { title: "advertisement / tv / grid" };

export function generateStaticParams() {
  return gridTvExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function GridTvExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isGridTvExperimentSlug(experiment)) notFound();
  return experiment === "2" ? <TvGridTwo /> : <TvGridOne />;
}
