import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FaceTraceOne from "@/components/mobile/face-trace/1";
import FaceTraceTwo from "@/components/mobile/face-trace/2";
import FaceTraceThree from "@/components/mobile/face-trace/3";
import FaceTraceFour from "@/components/mobile/face-trace/4";
import FaceTraceFive from "@/components/mobile/face-trace/5";
import FaceTraceSix from "@/components/mobile/face-trace/6";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }, { experiment: "4" }, { experiment: "5" }, { experiment: "6" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / face-trace / ${experiment}` };
}

export default async function MobileFaceTraceExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "1") return <FaceTraceOne />;
  if (experiment === "2") return <FaceTraceTwo />;
  if (experiment === "3") return <FaceTraceThree />;
  if (experiment === "4") return <FaceTraceFour />;
  if (experiment === "5") return <FaceTraceFive />;
  if (experiment === "6") return <FaceTraceSix />;
  notFound();
}
