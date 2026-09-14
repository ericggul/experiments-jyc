import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjOneController from "@/components/dj/1/controller";
import DjTwoController from "@/components/dj/2/controller";
import { DjThreeController } from "@/components/dj/3";
import {
  djExperiments,
  isDjExperimentSlug,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return djExperiments.map((experiment) => ({
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
    title: `dj controller ${experiment}`,
  };
}

export default async function DjControllerPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDjExperimentSlug(experiment)) {
    notFound();
  }

  if (experiment === "2") return <DjTwoController />;
  if (experiment === "3") return <DjThreeController />;
  return <DjOneController />;
}
