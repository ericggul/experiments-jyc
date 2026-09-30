import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DuffingOne from "@/components/dynamical-systems/duffing/1";
import DuffingTwo from "@/components/dynamical-systems/duffing/2";
import DuffingThree from "@/components/dynamical-systems/duffing/3";
import {
  duffingExperiments,
  isDuffingExperimentSlug,
} from "@/components/dynamical-systems/duffing/experiments";

export function generateStaticParams() {
  return duffingExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  const registered = duffingExperiments.find(({ slug }) => slug === experiment);
  if (!registered) return {};
  return {
    title: `duffing/${registered.slug}`,
    description: registered.description,
  };
}

export default async function DuffingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isDuffingExperimentSlug(experiment)) notFound();
  if (experiment === "3") return <DuffingThree />;
  return experiment === "2" ? <DuffingTwo /> : <DuffingOne />;
}
