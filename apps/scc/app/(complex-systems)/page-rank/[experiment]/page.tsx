import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageRankOne from "@/components/complex-systems/page-rank/1";
import PageRankTwo from "@/components/complex-systems/page-rank/2";
import PageRankThree from "@/components/complex-systems/page-rank/3";
import {
  isPageRankExperimentSlug,
  pageRankExperiments,
} from "@/components/complex-systems/page-rank/experiments";

export function generateStaticParams() {
  return pageRankExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "page-rank",
  description: "An interactive directed graph for observing PageRank diffusion and random-surfer estimates.",
};

export default async function PageRankExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isPageRankExperimentSlug(experiment)) notFound();
  if (experiment === "1") return <PageRankOne />;
  if (experiment === "2") return <PageRankTwo />;
  return <PageRankThree />;
}
