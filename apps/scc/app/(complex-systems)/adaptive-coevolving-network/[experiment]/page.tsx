import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CoevolvingVoterOne from "@/components/complex-systems/adaptive-coevolving-network/1";
import AdaptiveEpidemicTwo from "@/components/complex-systems/adaptive-coevolving-network/2";
import AdaptiveCooperationThree from "@/components/complex-systems/adaptive-coevolving-network/3";
import PhysarumNetworkFour from "@/components/complex-systems/adaptive-coevolving-network/4";
import BoundedConfidenceSix from "@/components/complex-systems/adaptive-coevolving-network/6";
import EchoChambersSeven from "@/components/complex-systems/adaptive-coevolving-network/7";
import AutocatalyticEcosystemEight from "@/components/complex-systems/adaptive-coevolving-network/8";
import ThresholdNetworkNine from "@/components/complex-systems/adaptive-coevolving-network/9";
import CoevolvingCultureTen from "@/components/complex-systems/adaptive-coevolving-network/10";
import AwarenessMultiplexEleven from "@/components/complex-systems/adaptive-coevolving-network/11";
import StructuralBalanceFive from "@/components/complex-systems/adaptive-coevolving-network/5";
import PollingEcology from "@/components/complex-systems/adaptive-coevolving-network/polling-ecology";
import {
  adaptiveCoevolvingNetworkExperiments,
  isAdaptiveCoevolvingNetworkExperimentSlug,
  type AdaptiveCoevolvingNetworkExperimentSlug,
} from "@/components/complex-systems/adaptive-coevolving-network/experiments";

const components: Record<AdaptiveCoevolvingNetworkExperimentSlug, ComponentType> = {
  "1": CoevolvingVoterOne,
  "2": AdaptiveEpidemicTwo,
  "3": AdaptiveCooperationThree,
  "4": PhysarumNetworkFour,
  "6": BoundedConfidenceSix,
  "7": EchoChambersSeven,
  "8": AutocatalyticEcosystemEight,
  "9": ThresholdNetworkNine,
  "10": CoevolvingCultureTen,
  "11": AwarenessMultiplexEleven,
  "5": StructuralBalanceFive,
  "polling-ecology": PollingEcology,
};

const descriptions: Record<AdaptiveCoevolvingNetworkExperimentSlug, string> = {
  "1": "A coevolving voter network where disagreement is resolved either by adopting a neighbour's view or by rewiring the tie to someone like-minded, so opinions reshape the graph and the graph reshapes opinions.",
  "2": "An adaptive SIS epidemic where healthy people cut ties to infected neighbours and reconnect to healthy ones, so avoidance reshapes the network that carries the next outbreak.",
  "3": "A prisoner's dilemma on a network where players copy richer neighbours and leave defecting partners, so cooperators gather ties, become hubs and take over.",
  "4": "A Physarum transport network on a tube mesh: flow between food sources thickens tubes, and thickness steers the next flow; place, move or remove food and cut tubes to watch it reroute.",
  "6": "Bounded-confidence opinions on an adaptive network: people compromise with neighbours within tolerance and cut ties beyond it, so opinion groups and network pieces form together.",
  "7": "An activity-driven opinion network where like-minded contact choice turns one-sided radicalization into two polarized echo chambers.",
  "8": "A Jain–Krishna ecosystem: the least-populated species is repeatedly replaced by a randomly linked newcomer, so a chance catalytic cycle grows into a network-wide autocatalytic set that crashes when a keystone is lost.",
  "9": "Boolean threshold nodes blink on and off from their signed inputs; still nodes gain an input and blinking nodes lose one, so the wiring tunes itself to the edge between order and chaos.",
  "10": "Axelrod's culture model on a network that rewires: agents copy traits from neighbours they partly resemble and cut ties to total strangers, so few traits yield one culture and many traits split the network into monocultural islands.",
  "11": "People live on two layers: news of a disease spreads and fades on one, the disease spreads on the other, and aware people avoid infection by rewiring their physical contacts away from the infected.",
  "5": "A complete signed network where unbalanced triangles keep changing relationships until everyone is friends or two hostile camps remain; drag between people to flip a relationship.",
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
