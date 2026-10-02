import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecursiveClockOne from "@/components/complex-systems/clock/1";
import FingerSkatingClockGrid from "@/components/complex-systems/clock/2";
import FractalSkatingClockGrid from "@/components/complex-systems/clock/3";
import {
  clockExperiments,
  isClockExperimentSlug,
} from "@/components/complex-systems/clock/experiments";

export function generateStaticParams() {
  return clockExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `clock/${experiment}`,
    description:
      experiment === "3"
        ? "A grid of finger-skated clocks, each carrying two smaller finger-skated clocks at its hand tips."
        : experiment === "2"
        ? "A viewport-filling grid of clocks whose hands are finger-skated: hour hands keep the exit direction, minute hands follow the finger."
        : "A deterministic tree of analogue clocks recursively attached to every hour, minute, and second hand.",
  };
}

export default async function ClockExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isClockExperimentSlug(experiment)) notFound();
  if (experiment === "2") return <FingerSkatingClockGrid />;
  if (experiment === "3") return <FractalSkatingClockGrid />;
  return <RecursiveClockOne />;
}
