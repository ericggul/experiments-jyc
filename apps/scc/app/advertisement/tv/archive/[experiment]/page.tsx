import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AmericanTvOne from "@/components/advertisement/tv/archive/american/1";
import { tvArchiveExperiments } from "@/components/advertisement/tv/archive/experiments";
import KoreanTvOne from "@/components/advertisement/tv/archive/korean/1";

export const metadata: Metadata = { title: "advertisement / tv / archive" };

export function generateStaticParams() {
  return tvArchiveExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function TvArchiveExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "korean-1") return <KoreanTvOne />;
  if (experiment === "american-1") return <AmericanTvOne />;
  notFound();
}
