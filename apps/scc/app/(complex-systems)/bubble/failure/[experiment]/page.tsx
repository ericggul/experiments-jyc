import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import FailureTwo from "@/components/complex-systems/bubble/failure/2";
import FailureThree from "@/components/complex-systems/bubble/failure/3";
import FailureFour from "@/components/complex-systems/bubble/failure/4";
import FailureFive from "@/components/complex-systems/bubble/failure/5";
import {
  bubbleFailures,
  isBubbleFailureSlug,
  type BubbleFailureSlug,
} from "@/components/complex-systems/bubble/experiments";

const components: Record<BubbleFailureSlug, ComponentType> = {
  "2": FailureTwo,
  "3": FailureThree,
  "4": FailureFour,
  "5": FailureFive,
};

export function generateStaticParams() {
  return bubbleFailures.map((experiment) => ({ experiment: experiment.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `bubble/failure/${experiment}`, description: "A rejected bubble build, kept as a recorded failure." };
}

export default async function BubbleFailurePage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isBubbleFailureSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
