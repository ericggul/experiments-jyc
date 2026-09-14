import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjTwoScreen from "@/components/dj/2/screen";
import { DjThreeScreen } from "@/components/dj/3";

export function generateStaticParams() {
  return [{ experiment: "2" }, { experiment: "3" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `dj ${experiment} screen` };
}

export default async function DjSingleScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "2") return <DjTwoScreen />;
  if (experiment === "3") return <DjThreeScreen />;
  notFound();
}
