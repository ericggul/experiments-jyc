import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Stretch from "@/components/mobile/transform/stretch";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ clone: string }> }): Promise<Metadata> {
  const { clone } = await params;
  return { title: `mobile / stretch / ${clone}` };
}

export default async function StretchClonePage({ params }: { params: Promise<{ clone: string }> }) {
  const { clone } = await params;
  const Clone = clones[clone];
  if (!Clone) notFound();
  return <><Clone /><Stretch /></>;
}
