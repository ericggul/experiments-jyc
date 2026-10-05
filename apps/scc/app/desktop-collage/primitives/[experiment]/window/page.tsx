import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FieldWindow from "@/components/desktop-collage/primitives/2/window/client";

export const metadata: Metadata = { title: "\u200b" };

// The page shown inside each window an experiment opens. Only /2 has one.
export default async function PrimitivesWindowPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "2") notFound();
  return <FieldWindow />;
}
