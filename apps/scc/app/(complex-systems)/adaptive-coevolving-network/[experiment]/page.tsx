import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CoevolvingVoterOne from "@/components/complex-systems/adaptive-coevolving-network/1";
import CoevolvingVoterThreeDimensional from "@/components/complex-systems/adaptive-coevolving-network/1-3d";
import AdaptiveEpidemicTwo from "@/components/complex-systems/adaptive-coevolving-network/2";
import AdaptiveCooperationThree from "@/components/complex-systems/adaptive-coevolving-network/3";
import EchoChambersFour from "@/components/complex-systems/adaptive-coevolving-network/4";
import ThresholdNetworkFive from "@/components/complex-systems/adaptive-coevolving-network/5";
import AwarenessMultiplexSix from "@/components/complex-systems/adaptive-coevolving-network/6";
import RankedWebSeven from "@/components/complex-systems/adaptive-coevolving-network/7";
import PollingEcology from "@/components/complex-systems/adaptive-coevolving-network/polling-ecology";
import {
  adaptiveCoevolvingNetworkExperiments,
  isAdaptiveCoevolvingNetworkExperimentSlug,
  type AdaptiveCoevolvingNetworkExperimentSlug,
} from "@/components/complex-systems/adaptive-coevolving-network/experiments";

const components: Record<AdaptiveCoevolvingNetworkExperimentSlug, ComponentType> = {
  "1": CoevolvingVoterOne,
  "1-3d": CoevolvingVoterThreeDimensional,
  "2": AdaptiveEpidemicTwo,
  "3": AdaptiveCooperationThree,
  "4": EchoChambersFour,
  "5": ThresholdNetworkFive,
  "6": AwarenessMultiplexSix,
  "7": RankedWebSeven,
  "polling-ecology": PollingEcology,
};

const descriptions: Record<AdaptiveCoevolvingNetworkExperimentSlug, string> = {
  "1": "A coevolving voter network where disagreement is resolved either by adopting a neighbour's view or by rewiring the tie to someone like-minded, so opinions reshape the graph and the graph reshapes opinions.",
  "1-3d": "The same coevolving voter network laid out in a turning volume: disagreements glow as bright filaments, and rewiring pulls like-minded voters into separate luminous islands.",
  "2": "An adaptive SIS epidemic where healthy people cut ties to infected neighbours and reconnect to healthy ones, so avoidance reshapes the network that carries the next outbreak.",
  "3": "A prisoner's dilemma on a network where players copy richer neighbours and leave defecting partners, so cooperators gather ties, become hubs and take over.",
  "4": "An activity-driven opinion network where like-minded contact choice turns one-sided radicalization into two polarized echo chambers.",
  "5": "Boolean threshold nodes blink on and off from their signed inputs; still nodes gain an input and blinking nodes lose one, so the wiring tunes itself to the edge between order and chaos.",
  "6": "People live on two layers: news of a disease spreads and fades on one, the disease spreads on the other, and aware people avoid infection by rewiring their physical contacts away from the infected.",
  "7": "A living web where each page's area is exactly its PageRank share; attention weights flow continuously toward highly ranked, high-quality pages, so rank shapes links and links shape rank while leaders keep changing.",
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
