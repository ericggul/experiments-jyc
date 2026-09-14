import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SnsFeedOne from "@/components/sns/feed/1";
import SnsInstagramOne from "@/components/sns/instagram/1";
import SnsInstagramTwo from "@/components/sns/instagram/2";
import SnsInstagramThree from "@/components/sns/instagram/3";
import SnsInstagramFour from "@/components/sns/instagram/4";
import SnsNavigationOne from "@/components/sns/navigation/1";
import SnsNavigationTwo from "@/components/sns/navigation/2";
import SnsNavigationDefault from "@/components/sns/navigation/default";
import SnsLinkedinTwo from "@/components/sns/linkedin/2";
import SnsLinkedinThree from "@/components/sns/linkedin/3";
import SnsLinkedinFour from "@/components/sns/linkedin/4";
import SnsLinkedinFive from "@/components/sns/linkedin/5";
import SnsLinkedinSix from "@/components/sns/linkedin/6";
import SnsLinkedinSixTest from "@/components/sns/linkedin/6-test";
import SnsLinkedinOne from "@/components/sns/linkedin/1";
import SnsYoutubeOne from "@/components/sns/youtube/1";
import SnsYoutubeTwo from "@/components/sns/youtube/2";
import SnsYoutubeThree from "@/components/sns/youtube/3";
import SnsYoutubeFour from "@/components/sns/youtube/4";
import SnsYoutubeFive from "@/components/sns/youtube/5";
import SnsYoutubeSix from "@/components/sns/youtube/6";
import {
  findSnsExperiment,
  snsExperiments,
  type SnsExperimentKey,
} from "@/components/sns/experiments";

const components: Record<SnsExperimentKey, ComponentType> = {
  "feed/1": SnsFeedOne,
  "instagram/1": SnsInstagramOne,
  "instagram/2": SnsInstagramTwo,
  "instagram/3": SnsInstagramThree,
  "instagram/4": SnsInstagramFour,
  "navigation/default": SnsNavigationDefault,
  "navigation/1": SnsNavigationOne,
  "navigation/2": SnsNavigationTwo,
  "linkedin/1": SnsLinkedinOne,
  "linkedin/2": SnsLinkedinTwo,
  "linkedin/3": SnsLinkedinThree,
  "linkedin/4": SnsLinkedinFour,
  "linkedin/5": SnsLinkedinFive,
  "linkedin/6": SnsLinkedinSix,
  "linkedin/6-test": SnsLinkedinSixTest,
  "youtube/1": SnsYoutubeOne,
  "youtube/2": SnsYoutubeTwo,
  "youtube/3": SnsYoutubeThree,
  "youtube/4": SnsYoutubeFour,
  "youtube/5": SnsYoutubeFive,
  "youtube/6": SnsYoutubeSix,
};

export function generateStaticParams() {
  return snsExperiments.map(({ category, slug }) => ({
    category,
    experiment: slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; experiment: string }>;
}): Promise<Metadata> {
  const { category, experiment } = await params;
  return {
    title: `sns ${category} ${experiment}`,
  };
}

export default async function SnsExperimentPage({
  params,
}: {
  params: Promise<{ category: string; experiment: string }>;
}) {
  const { category, experiment } = await params;
  const registeredExperiment = findSnsExperiment(category, experiment);

  if (!registeredExperiment) {
    notFound();
  }

  const Component = components[registeredExperiment.key];
  return <Component />;
}
