import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BifurcationOne from "@/components/dynamical-systems/bifurcation/1";
import BifurcationTwo from "@/components/dynamical-systems/bifurcation/2";
import BifurcationThree from "@/components/dynamical-systems/bifurcation/3";
import {
  bifurcationExperiments,
  isBifurcationExperimentSlug,
} from "@/components/dynamical-systems/bifurcation/experiments";

export function generateStaticParams() {
  return bifurcationExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>): Promise<Metadata> {
  const { experiment } = await params;
  const registered = bifurcationExperiments.find(({ slug }) => slug === experiment);
  if (!registered) return {};
  return {
    title: `bifurcation/${registered.slug}`,
    description: registered.description,
  };
}

export default async function BifurcationExperimentPage({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>) {
  const { experiment } = await params;
  if (!isBifurcationExperimentSlug(experiment)) notFound();
  if (experiment === "3") return <BifurcationThree />;
  return experiment === "2" ? <BifurcationTwo /> : <BifurcationOne />;
}
