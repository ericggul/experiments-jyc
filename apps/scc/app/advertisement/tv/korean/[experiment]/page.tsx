import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LinaOkSilver from "@/components/advertisement/tv/korean/1";
import HeungkukDementia from "@/components/advertisement/tv/korean/2";
import AiaDementia from "@/components/advertisement/tv/korean/3";
import HeungkukDasarang from "@/components/advertisement/tv/korean/4";
import { koreanTvExperiments } from "@/components/advertisement/tv/korean/experiments";
import { parseCaptureOptions } from "@/components/advertisement/tv/player";

export const metadata: Metadata = { title: "advertisement / tv / korean" };

export function generateStaticParams() {
  return koreanTvExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function KoreanTvExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ experiment: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { experiment } = await params;
  const capture = parseCaptureOptions(await searchParams);
  if (experiment === "1") return <LinaOkSilver capture={capture} />;
  if (experiment === "2") return <HeungkukDementia capture={capture} />;
  if (experiment === "3") return <AiaDementia capture={capture} />;
  if (experiment === "4") return <HeungkukDasarang capture={capture} />;
  notFound();
}
