import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobileFingerSkatingOne from "@/components/mobile/finger-skating/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export const metadata: Metadata = { title: "mobile / finger-skating / 1" };

export default async function MobileFingerSkatingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment !== "1") notFound();
  return <MobileFingerSkatingOne />;
}
