import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SelfEvolvingNetworkOne from "@/components/complex-systems/self-evolving-network/1";
import {
  isSelfEvolvingNetworkExperimentSlug,
  selfEvolvingNetworkExperiments,
  type SelfEvolvingNetworkExperimentSlug,
} from "@/components/complex-systems/self-evolving-network/experiments";

const components: Record<SelfEvolvingNetworkExperimentSlug, ComponentType> = {
  "1": SelfEvolvingNetworkOne,
};

export function generateStaticParams() {
  return selfEvolvingNetworkExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "complex-systems",
  description:
    "A fixed population that rewires itself through introductions and turnover, forming a clustered small world without any outside growth rule.",
};

export default async function SelfEvolvingNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isSelfEvolvingNetworkExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
