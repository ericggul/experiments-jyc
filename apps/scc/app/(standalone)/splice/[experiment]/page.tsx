import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SpliceOne from "@/components/standalone/splice/1";
import { isSpliceExperimentSlug, spliceExperiments } from "@/components/standalone/splice/experiments";

export const metadata: Metadata = {
  title: "Splice — audio instrument",
  description: "A two-deck instrument for practicing audio collage: cue, loop, change speed, and mix.",
};

export function generateStaticParams() {
  return spliceExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function SpliceExperimentPage({ params }: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isSpliceExperimentSlug(experiment)) notFound();
  return <SpliceOne />;
}
