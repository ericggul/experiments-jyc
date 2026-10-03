import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / language / ${experiment}` };
}

export default async function LanguageExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "1") notFound();
  const key = `mobile/transform/language/${experiment}`;
  return (
    <SccNavigation
      experiments={getCloneNavigationItems(key)}
      scope={key}
      scopeKey={key}
    />
  );
}
