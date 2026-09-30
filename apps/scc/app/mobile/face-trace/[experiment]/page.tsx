import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FaceTraceOne from "@/components/mobile/face-trace/1";

export function generateStaticParams() {
  return [{ experiment: "1" }];
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
  notFound();
}
