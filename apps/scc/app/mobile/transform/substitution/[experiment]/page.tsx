import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SccNavigation from "@/foundations/navigation";
import { getCloneNavigationItems } from "@/foundations/navigation/experiments";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / substitution / ${experiment}` };
}

export default async function SubstitutionExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "1" && experiment !== "2") notFound();
  const key = `mobile/transform/substitution/${experiment}`;
  return (
    <SccNavigation
      experiments={getCloneNavigationItems(key)}
      scope={key}
      scopeKey={key}
    />
  );
}
