import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LanguageTransfer from "@/components/mobile/transform/language";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ experiment: "1", clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string; clone: string }> }): Promise<Metadata> {
  const { experiment, clone } = await params;
  return { title: `mobile / language / ${experiment} / ${clone}` };
}

export default async function LanguageClonePage({ params }: { params: Promise<{ experiment: string; clone: string }> }) {
  const { experiment, clone } = await params;
  const Clone = clones[clone];
  if (!Clone || experiment !== "1") notFound();
  return <><Clone /><LanguageTransfer clone={clone} /></>;
}
