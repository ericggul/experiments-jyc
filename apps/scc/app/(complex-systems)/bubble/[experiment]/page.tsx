import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import BubbleOne from "@/components/complex-systems/bubble/1";
import BubbleTwo from "@/components/complex-systems/bubble/2";
import BubbleThree from "@/components/complex-systems/bubble/3";
import {
  bubbleExperiments,
  isBubbleExperimentSlug,
  type BubbleExperimentSlug,
} from "@/components/complex-systems/bubble/experiments";

const components: Record<BubbleExperimentSlug, ComponentType> = {
  "1": BubbleOne,
  "2": BubbleTwo,
  "3": BubbleThree,
};

const descriptions: Record<BubbleExperimentSlug, string> = {
  "1": "A living PageRank web as a raft of soap bubbles; rank buds from bubble to bubble along links.",
  "2": "The same raft with its network and its visual parameters open to adjustment.",
  "3": "The same raft with Goldfishes' media on its films: cats, kisses, politicians, AI tech renders, tech faces and keywords, fixed per page or chasing a trend along the links.",
};

export function generateStaticParams() {
  return bubbleExperiments.map((experiment) => ({ experiment: experiment.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `bubble/${experiment}`,
    description: isBubbleExperimentSlug(experiment) ? descriptions[experiment] : undefined,
  };
}

export default async function BubbleExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isBubbleExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
