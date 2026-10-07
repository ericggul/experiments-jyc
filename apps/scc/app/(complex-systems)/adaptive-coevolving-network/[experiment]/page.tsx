import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CoevolvingVoterOne from "@/components/complex-systems/adaptive-coevolving-network/1";
import CoevolvingVoterThreeDimensional from "@/components/complex-systems/adaptive-coevolving-network/1-3d";
import CoevolvingVoterGlsl from "@/components/complex-systems/adaptive-coevolving-network/1-glsl";
import AdaptiveEpidemicTwo from "@/components/complex-systems/adaptive-coevolving-network/2";
import AdaptiveCooperationThree from "@/components/complex-systems/adaptive-coevolving-network/3";
import EchoChambersFour from "@/components/complex-systems/adaptive-coevolving-network/4";
import ThresholdNetworkFive from "@/components/complex-systems/adaptive-coevolving-network/5";
import AwarenessMultiplexSix from "@/components/complex-systems/adaptive-coevolving-network/6";
import RankedWebSeven from "@/components/complex-systems/adaptive-coevolving-network/7";
import RankedWebGlsl from "@/components/complex-systems/adaptive-coevolving-network/7-glsl";
import RankedWebGlslTwo from "@/components/complex-systems/adaptive-coevolving-network/7-glsl-2";
import RankedWebMorphogen from "@/components/complex-systems/adaptive-coevolving-network/7-glsl-3";
import {
  adaptiveCoevolvingNetworkExperiments,
  isAdaptiveCoevolvingNetworkExperimentSlug,
  type AdaptiveCoevolvingNetworkExperimentSlug,
} from "@/components/complex-systems/adaptive-coevolving-network/experiments";

const components: Record<AdaptiveCoevolvingNetworkExperimentSlug, ComponentType> = {
  "1": CoevolvingVoterOne,
  "1-3d": CoevolvingVoterThreeDimensional,
  "1-glsl": CoevolvingVoterGlsl,
  "2": AdaptiveEpidemicTwo,
  "3": AdaptiveCooperationThree,
  "4": EchoChambersFour,
  "5": ThresholdNetworkFive,
  "6": AwarenessMultiplexSix,
  "7": RankedWebSeven,
  "7-glsl": RankedWebGlsl,
  "7-glsl-2": RankedWebGlslTwo,
  "7-glsl-3": RankedWebMorphogen,
};

const descriptions: Record<AdaptiveCoevolvingNetworkExperimentSlug, string> = {
  "1": "A coevolving voter network where disagreement is resolved either by adopting a neighbour's view or by rewiring the tie to someone like-minded, so opinions reshape the graph and the graph reshapes opinions.",
  "1-3d": "The same coevolving voter network laid out in a turning volume: disagreements glow as bright filaments, and rewiring pulls like-minded voters into separate luminous islands.",
  "1-glsl": "The same coevolving voter network as one 2D neon gel: voters of varied size are glowing cells whose ties grow out of them as swaying, tapering processes, with hot beads running along disagreements.",
  "2": "An adaptive SIS epidemic where healthy people cut ties to infected neighbours and reconnect to healthy ones, so avoidance reshapes the network that carries the next outbreak.",
  "3": "A prisoner's dilemma on a network where players copy richer neighbours and leave defecting partners, so cooperators gather ties, become hubs and take over.",
  "4": "An activity-driven opinion network where like-minded contact choice turns one-sided radicalization into two polarized echo chambers.",
  "5": "Boolean threshold nodes blink on and off from their signed inputs; still nodes gain an input and blinking nodes lose one, so the wiring tunes itself to the edge between order and chaos.",
  "6": "People live on two layers: news of a disease spreads and fades on one, the disease spreads on the other, and aware people avoid infection by rewiring their physical contacts away from the infected.",
  "7": "A living web where each page's area is exactly its PageRank share; attention weights flow continuously toward highly ranked, high-quality pages, so rank shapes links and links shape rank while leaders keep changing.",
  "7-glsl": "The same living PageRank web drawn as one continuous gel: each page is a soft cell whose area is its rank, its links grow out of it as ribbons as wide as the rank they pass on, and bright beads of random surfers travel inside them.",
  "7-glsl-2": "7-glsl's PageRank gel in relief: rank-sized cells are lit domes, large pages grow stout processes into their links, and links that pass on more rank are wider and brighter.",
  "7-glsl-3": "The PageRank web as a tissue that patterns itself: a reaction–diffusion system grows dividing cells inside pages, in proportion to their rank, and fibres along links, as many as the rank they pass on, drifting from source to target.",
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
