import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GitHubOne from "@/components/ui/dashboard/github/1";
import GitHubTwo from "@/components/ui/dashboard/github/2";
import {
  githubExperiments,
  isGitHubExperimentSlug,
} from "@/components/ui/dashboard/github/experiments";

export function generateStaticParams() {
  return githubExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `github ${experiment}` };
}

export default async function GitHubExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isGitHubExperimentSlug(experiment)) notFound();
  return experiment === "1" ? <GitHubOne /> : <GitHubTwo />;
}
