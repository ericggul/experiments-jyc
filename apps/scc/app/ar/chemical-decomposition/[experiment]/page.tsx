import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import ChemicalDecompositionOne from "@/components/ar/chemical-decomposition/1";
import {
  chemicalDecompositionExperiments,
  isChemicalDecompositionExperimentSlug,
  type ChemicalDecompositionExperimentSlug,
} from "@/components/ar/chemical-decomposition/experiments";

const components: Record<ChemicalDecompositionExperimentSlug, ComponentType> = {
  "1": ChemicalDecompositionOne,
};

export function generateStaticParams() {
  return chemicalDecompositionExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `ar / chemical-decomposition / ${experiment}`,
    description: "The phone camera's view, parsed on the device and written over with the chemical formulas of what each thing is made of.",
  };
}

export default async function ChemicalDecompositionExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isChemicalDecompositionExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
