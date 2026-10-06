import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import AmoebaOne from "@/components/complex-systems/amoeba/1";
import AmoebaTwo from "@/components/complex-systems/amoeba/2";
import {
  amoebaExperiments,
  isAmoebaExperimentSlug,
  type AmoebaExperimentSlug,
} from "@/components/complex-systems/amoeba/experiments";

const components: Record<AmoebaExperimentSlug, ComponentType> = {
  "1": AmoebaOne,
  "2": AmoebaTwo,
};

export function generateStaticParams() {
  return amoebaExperiments.map((experiment) => ({
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
    title: `amoeba/${experiment}`,
    description:
      experiment === "2"
        ? "Amoebae of wildly different, inherited sizes eat a bacterial lawn across the whole screen, divide, encyst and return in waves."
        : "Amoebae eat a bacterial lawn, divide into spreading plaques, encyst when starved and return in waves when the lawn regrows.",
  };
}

export default async function AmoebaExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAmoebaExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
