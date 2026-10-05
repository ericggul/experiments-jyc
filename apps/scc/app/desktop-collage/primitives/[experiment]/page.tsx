import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import PrimitivesOne from "@/components/desktop-collage/primitives/1";
import PrimitivesTwo from "@/components/desktop-collage/primitives/2";
import {
  isPrimitivesExperimentSlug,
  primitivesExperiments,
  type PrimitivesExperimentSlug,
} from "@/components/desktop-collage/primitives/experiments";

const components: Record<PrimitivesExperimentSlug, ComponentType> = {
  "1": PrimitivesOne,
  "2": PrimitivesTwo,
};

export function generateStaticParams() {
  return primitivesExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `desktop-collage / primitives ${experiment}` };
}

export default async function PrimitivesExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isPrimitivesExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
