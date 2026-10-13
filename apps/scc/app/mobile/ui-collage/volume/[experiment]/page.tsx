import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileUiCollageVolumeOne from "@/components/mobile/ui-collage/volume/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export const metadata: Metadata = { title: "mobile / ui-collage / volume" };

export default async function MobileUiCollageVolumeExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <MobileUiCollageVolumeOne />;
  notFound();
}
