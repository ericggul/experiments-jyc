import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { substitutionExperiments } from "@/components/mobile/transform/substitution/experiments";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(substitutionExperiments).flatMap((experiment) =>
    Object.keys(clones).map((clone) => ({ experiment, clone }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string; clone: string }> }): Promise<Metadata> {
  const { experiment, clone } = await params;
  return { title: `mobile / substitution / ${experiment} / ${clone}` };
}

export default async function SubstitutionClonePage({ params }: { params: Promise<{ experiment: string; clone: string }> }) {
  const { experiment, clone } = await params;
  const Clone = clones[clone];
  const Experiment = substitutionExperiments[experiment];
  if (!Clone || !Experiment) notFound();
  return <><Clone /><Experiment clone={clone} /></>;
}
