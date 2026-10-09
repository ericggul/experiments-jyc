import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import HypeOne from "@/components/desktop-collage/hype/1";
import {
  hypeExperiments,
  isHypeExperimentSlug,
  type HypeExperimentSlug,
} from "@/components/desktop-collage/hype/experiments";

const components: Record<HypeExperimentSlug, ComponentType> = {
  "1": HypeOne,
};

export function generateStaticParams() {
  return hypeExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `desktop-collage / hype ${experiment}` };
}

export default async function HypeExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isHypeExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
