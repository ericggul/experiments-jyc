import type { Metadata } from "next";
import { notFound } from "next/navigation";
import XyztCityOne from "@/components/dimensions/xyzt-city/1";
import { xyztCityExperiments } from "@/components/dimensions/xyzt-city/experiments";

export const metadata: Metadata = { title: "dimensions / xyzt-city" };

export function generateStaticParams() {
  return xyztCityExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function XyztCityExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <XyztCityOne />;
  notFound();
}
