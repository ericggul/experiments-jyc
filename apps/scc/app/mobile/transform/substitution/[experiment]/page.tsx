import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";
import { substitutionClones, substitutionExperiments } from "@/components/mobile/transform/substitution/experiments";

export function generateStaticParams() {
  return Object.keys(substitutionExperiments).map((experiment) => ({ experiment }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / substitution / ${experiment}` };
}

export default async function SubstitutionExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!substitutionExperiments[experiment]) notFound();
  const key = `mobile/transform/substitution/${experiment}`;
  return (
    <SccNavigation
      experiments={getCloneNavigationItems(key, substitutionClones[experiment])}
      scope={key}
      scopeKey={key}
    />
  );
}
