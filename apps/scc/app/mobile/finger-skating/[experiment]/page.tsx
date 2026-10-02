import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileFingerSkatingOne from "@/components/mobile/finger-skating/1";
import MobileFingerSkatingTwo from "@/components/mobile/finger-skating/2";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export const metadata: Metadata = { title: "mobile / finger-skating" };

export default async function MobileFingerSkatingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <MobileFingerSkatingOne />;
  if (experiment === "2") return <MobileFingerSkatingTwo />;
  notFound();
}
