import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import ArithmeticOne from "@/components/mobile/arithmetic/1";
import ArithmeticCalculator from "@/components/mobile/arithmetic/calculator";
import ArithmeticFractal from "@/components/mobile/arithmetic/fractal";
import ArithmeticDefault from "@/components/mobile/arithmetic/default";

export const metadata: Metadata = { title: "사칙연산" };
export async function generateViewport({ params }: { params: Promise<{ experiment: string }> }): Promise<Viewport> {
  const { experiment } = await params;
  return { viewportFit: "cover", themeColor: experiment === "calculator" ? "#000000" : "#0c1014" };
}

export function generateStaticParams() {
  return [{ experiment: "default" }, { experiment: "calculator" }, { experiment: "fractal" }, { experiment: "1" }];
}

export default async function ArithmeticPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "default") return <ArithmeticDefault />;
  if (experiment === "calculator") return <ArithmeticCalculator />;
  if (experiment === "fractal") return <ArithmeticFractal />;
  if (experiment === "1") return <ArithmeticOne />;
  notFound();
}
