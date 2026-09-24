import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Pixelate from "@/components/mobile/transform/pixelate";
import { clones } from "@/components/mobile/transform/pixelate/clones";

export function generateStaticParams() {
  return Object.keys(clones).map((clone) => ({ clone }));
}

export async function generateMetadata({ params }: { params: Promise<{ clone: string }> }): Promise<Metadata> {
  const { clone } = await params;
  return { title: `mobile / pixelate / ${clone}` };
}

export default async function PixelateClonePage({ params }: { params: Promise<{ clone: string }> }) {
  const { clone } = await params;
  const Clone = clones[clone];
  if (!Clone) notFound();
  return <><Clone /><Pixelate /></>;
}
