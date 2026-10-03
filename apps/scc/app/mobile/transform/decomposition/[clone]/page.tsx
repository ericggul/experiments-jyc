import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Decomposition from "@/components/mobile/transform/decomposition";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ clone: string }> }): Promise<Metadata> {
  const { clone } = await params;
  return { title: `mobile / decomposition / ${clone}` };
}

export default async function DecompositionClonePage({ params }: { params: Promise<{ clone: string }> }) {
  const { clone } = await params;
  const Clone = clones[clone];
  if (!Clone) notFound();
  return <><Clone /><Decomposition /></>;
}
