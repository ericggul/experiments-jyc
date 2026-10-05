import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecursiveClockOne from "@/components/complex-systems/fractal/clock/1";
import FingerSkatingClockGrid from "@/components/complex-systems/fractal/clock/2";
import FractalSkatingClockGrid from "@/components/complex-systems/fractal/clock/3";
import FractalLogoOne from "@/components/complex-systems/fractal/logo/1";
import {
  fractalExperiments,
  getFractalExperiment,
} from "@/components/complex-systems/fractal/experiments";

const descriptions: Record<string, string> = {
  "clock/1":
    "A deterministic tree of analogue clocks recursively attached to every hour, minute, and second hand.",
  "clock/2":
    "A viewport-filling grid of clocks whose hands are finger-skated: hour hands keep the exit direction, minute hands follow the finger.",
  "clock/3":
    "A grid of finger-skated clocks, each carrying two smaller finger-skated clocks at its hand tips.",
  "logo/1":
    "An AI logo holding smaller copies of itself at every tip, down to sub-pixel; Gemini by default.",
};

export function generateStaticParams() {
  return fractalExperiments.map((experiment) => ({
    family: experiment.family,
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ family: string; experiment: string }>;
}): Promise<Metadata> {
  const { family, experiment } = await params;
  return {
    title: `fractal/${family}/${experiment}`,
    description: descriptions[`${family}/${experiment}`],
  };
}

export default async function FractalExperimentPage({
  params,
}: {
  params: Promise<{ family: string; experiment: string }>;
}) {
  const { family, experiment } = await params;
  const currentExperiment = getFractalExperiment(family, experiment);
  if (!currentExperiment) notFound();

  if (currentExperiment.family === "logo") return <FractalLogoOne />;
  if (currentExperiment.slug === "2") return <FingerSkatingClockGrid />;
  if (currentExperiment.slug === "3") return <FractalSkatingClockGrid />;
  return <RecursiveClockOne />;
}
