import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CoevolvingVoterOne from "@/components/complex-systems/adaptive-coevolving-network/1";
import CoevolvingExchangeTwo from "@/components/complex-systems/adaptive-coevolving-network/2";
import GridAdaptiveThree from "@/components/complex-systems/adaptive-coevolving-network/3";
import PollingEcology from "@/components/complex-systems/adaptive-coevolving-network/polling-ecology";
import {
  adaptiveCoevolvingNetworkExperiments,
  isAdaptiveCoevolvingNetworkExperimentSlug,
  type AdaptiveCoevolvingNetworkExperimentSlug,
} from "@/components/complex-systems/adaptive-coevolving-network/experiments";

const components: Record<AdaptiveCoevolvingNetworkExperimentSlug, ComponentType> = {
  "1": CoevolvingVoterOne,
  "2": CoevolvingExchangeTwo,
  "3": GridAdaptiveThree,
  "polling-ecology": PollingEcology,
};

const descriptions: Record<AdaptiveCoevolvingNetworkExperimentSlug, string> = {
  "1": "A coevolving voter network where disagreement is resolved either by adopting a neighbour's view or by rewiring the tie to someone like-minded, so opinions reshape the graph and the graph reshapes opinions.",
  "2": "An open adaptive network where state-dependent recruitment and rewiring change ties, while entry and death change the vertex set.",
  "3": "An open adaptive network constrained to a configurable N by N grid of candidate sites, where only some sites are active.",
  "polling-ecology": "A synthetic polling field where blue and white stance cells reproduce, switch, and decay through rotating issues.",
};

export function generateStaticParams() {
  return adaptiveCoevolvingNetworkExperiments.map((experiment) => ({
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
    title: "complex-systems",
    description: isAdaptiveCoevolvingNetworkExperimentSlug(experiment)
      ? descriptions[experiment]
      : "Adaptive coevolving network simulation.",
  };
}

export default async function AdaptiveCoevolvingNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAdaptiveCoevolvingNetworkExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
