import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Substitution from "@/components/mobile/transform/substitution";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return (["1", "2"] as const).flatMap((experiment) =>
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
  if (!Clone || (experiment !== "1" && experiment !== "2")) notFound();
  return <><Clone /><Substitution variant={experiment === "1" ? 1 : 2} clone={clone} /></>;
}
