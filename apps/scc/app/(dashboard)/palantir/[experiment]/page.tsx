import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PalantirOne from "@/components/ui/dashboard/palantir/1";
import {
  isPalantirExperimentSlug,
  palantirExperiments,
} from "@/components/ui/dashboard/palantir/experiments";

export function generateStaticParams() {
  return palantirExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `palantir ${experiment}` };
}

export default async function PalantirExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isPalantirExperimentSlug(experiment)) notFound();
  return <PalantirOne />;
}
