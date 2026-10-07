import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FingerDecomposition from "@/components/mobile/transform/finger-decomposition";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ clone: string }> }): Promise<Metadata> {
  const { clone } = await params;
  return { title: `mobile / finger-decomposition / ${clone}` };
}

export default async function FingerDecompositionClonePage({ params }: { params: Promise<{ clone: string }> }) {
  const { clone } = await params;
  const Clone = clones[clone];
  if (!Clone) notFound();
  return <><Clone /><FingerDecomposition /></>;
}
