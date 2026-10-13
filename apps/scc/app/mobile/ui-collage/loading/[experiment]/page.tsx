import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileUiCollageLoadingOne from "@/components/mobile/ui-collage/loading/1";
import MobileUiCollageLoadingTwo from "@/components/mobile/ui-collage/loading/2";
import MobileUiCollageLoadingThree from "@/components/mobile/ui-collage/loading/3";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }];
}

export const metadata: Metadata = { title: "mobile / ui-collage / loading" };

export default async function MobileUiCollageLoadingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <MobileUiCollageLoadingOne />;
  if (experiment === "2") return <MobileUiCollageLoadingTwo />;
  if (experiment === "3") return <MobileUiCollageLoadingThree />;
  notFound();
}
