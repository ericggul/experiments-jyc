import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrbitalResonanceOne from "@/components/dynamical-systems/orbital-resonance/1";
import {
  isOrbitalResonanceExperimentSlug,
  orbitalResonanceExperiments,
} from "@/components/dynamical-systems/orbital-resonance/experiments";

export function generateStaticParams() {
  return orbitalResonanceExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>): Promise<Metadata> {
  const { experiment } = await params;
  const registered = orbitalResonanceExperiments.find(({ slug }) => slug === experiment);
  if (!registered) return {};
  return {
    title: `orbital-resonance/${registered.slug}`,
    description: registered.description,
  };
}

export default async function OrbitalResonanceExperimentPage({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>) {
  const { experiment } = await params;
  if (!isOrbitalResonanceExperimentSlug(experiment)) notFound();
  return <OrbitalResonanceOne />;
}
