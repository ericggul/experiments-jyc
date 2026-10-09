import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SokoloveMesothelioma from "@/components/advertisement/tv/american/1";
import ColonialPennThreePs from "@/components/advertisement/tv/american/2";
import { americanTvExperiments } from "@/components/advertisement/tv/american/experiments";
import { parseCaptureOptions } from "@/components/advertisement/tv/player";

export const metadata: Metadata = { title: "advertisement / tv / american" };

export function generateStaticParams() {
  return americanTvExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function AmericanTvExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ experiment: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { experiment } = await params;
  const capture = parseCaptureOptions(await searchParams);
  if (experiment === "1") return <SokoloveMesothelioma capture={capture} />;
  if (experiment === "2") return <ColonialPennThreePs capture={capture} />;
  notFound();
}
