import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ArithmeticOne from "@/components/mobile/arithmetic/1";
import ArithmeticDefault from "@/components/mobile/arithmetic/default";

export const metadata: Metadata = { title: "사칙연산" };
export async function generateViewport({ params }: { params: Promise<{ experiment: string }> }): Promise<Viewport> {
  const { experiment } = await params;
  return { viewportFit: "cover", themeColor: experiment === "default" ? "#0c1014" : "#000000" };
}

export function generateStaticParams() {
  return [{ experiment: "default" }, { experiment: "1" }];
}

export default async function ArithmeticPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "default") return <ArithmeticDefault />;
  if (experiment === "1") return <ArithmeticOne />;
  notFound();
}
