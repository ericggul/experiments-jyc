import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileUiCollageSlidersOne from "@/components/mobile/ui-collage/sliders/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export const metadata: Metadata = { title: "mobile / ui-collage / sliders" };

export default async function MobileUiCollageSlidersExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <MobileUiCollageSlidersOne />;
  notFound();
}
