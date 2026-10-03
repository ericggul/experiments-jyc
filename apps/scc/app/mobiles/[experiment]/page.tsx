import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MobilesOne from "@/components/mobiles/1";
import { isMobilesExperimentSlug, mobilesExperiments } from "@/components/mobiles/experiments";

export const metadata: Metadata = {
  title: "mobiles",
};

export function generateStaticParams() {
  return mobilesExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function MobilesPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isMobilesExperimentSlug(experiment)) notFound();
  return <MobilesOne />;
}
