import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MobileFingerSkatingDefault from "@/components/mobile/finger-skating/default";

export function generateStaticParams() {
  return [{ experiment: "default" }];
}

export const metadata: Metadata = { title: "mobile / finger-skating" };

export default async function MobileFingerSkatingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "default") return <MobileFingerSkatingDefault />;
  // Renamed from /1 on 2026-10-07.
  if (experiment === "1") redirect("/mobile/finger-skating/default");
  notFound();
}
