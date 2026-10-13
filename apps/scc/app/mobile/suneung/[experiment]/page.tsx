import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import SuneungDefault from "@/components/mobile/suneung/default";
import SuneungMath from "@/components/mobile/suneung/math";

const titles: Record<string, string> = {
  default: "2026학년도 대학수학능력시험 문제지 국어 영역",
  math: "2026학년도 대학수학능력시험 문제지 수학 영역",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return [{ experiment: "default" }, { experiment: "math" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: titles[experiment] };
}

export default async function SuneungPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "default") return <SuneungDefault />;
  if (experiment === "math") return <SuneungMath />;
  notFound();
}
