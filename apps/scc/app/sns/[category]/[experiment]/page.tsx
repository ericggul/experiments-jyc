import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SnsMobileOne from "@/components/mobile/clone/1";
import SnsMobileTwo from "@/components/mobile/clone/2";
import SnsMobileThree from "@/components/mobile/clone/3";
import SnsMobileFour from "@/components/mobile/clone/4";
import SnsMobileFive from "@/components/mobile/clone/5";
import SnsMobileSix from "@/components/mobile/clone/6";
import SnsMobileSeven from "@/components/mobile/clone/7";
import SnsMobileEight from "@/components/mobile/clone/8";
import SnsMobileNine from "@/components/mobile/clone/9";
import SnsMobileTen from "@/components/mobile/clone/10";
import SnsMobileEleven from "@/components/mobile/clone/11";
import SnsMobileTwelve from "@/components/mobile/clone/12";
import SnsMobileThirteen from "@/components/mobile/clone/13";
import SnsFeedOne from "@/components/ui/sns/feed/1";
import SnsInstagramOne from "@/components/ui/sns/instagram/1";
import SnsInstagramTwo from "@/components/ui/sns/instagram/2";
import SnsInstagramThree from "@/components/ui/sns/instagram/3";
import SnsInstagramThreeFinger from "@/components/ui/sns/instagram/3-finger";
import SnsInstagramFour from "@/components/ui/sns/instagram/4";
import SnsNavigationOne from "@/components/ui/sns/navigation/1";
import SnsNavigationTwo from "@/components/ui/sns/navigation/2";
import SnsNavigationDefault from "@/components/ui/sns/navigation/default";
import SnsLinkedinTwo from "@/components/ui/sns/linkedin/2";
import SnsLinkedinThree from "@/components/ui/sns/linkedin/3";
import SnsLinkedinFour from "@/components/ui/sns/linkedin/4";
import SnsLinkedinFive from "@/components/ui/sns/linkedin/5";
import SnsLinkedinSix from "@/components/ui/sns/linkedin/6";
import SnsLinkedinSixTest from "@/components/ui/sns/linkedin/6-test";
import SnsLinkedinOne from "@/components/ui/sns/linkedin/1";
import SnsYoutubeOne from "@/components/ui/sns/youtube/1";
import SnsYoutubeTwo from "@/components/ui/sns/youtube/2";
import SnsYoutubeThree from "@/components/ui/sns/youtube/3";
import SnsYoutubeFour from "@/components/ui/sns/youtube/4";
import SnsYoutubeFive from "@/components/ui/sns/youtube/5";
import SnsYoutubeSix from "@/components/ui/sns/youtube/6";
import {
  findSnsExperiment,
  snsExperiments,
  type SnsExperimentKey,
} from "@/components/ui/sns/experiments";

const components: Record<SnsExperimentKey, ComponentType> = {
  "mobile/1": SnsMobileOne,
  "mobile/2": SnsMobileTwo,
  "mobile/3": SnsMobileThree,
  "mobile/4": SnsMobileFour,
  "mobile/5": SnsMobileFive,
  "mobile/6": SnsMobileSix,
  "mobile/7": SnsMobileSeven,
  "mobile/8": SnsMobileEight,
  "mobile/9": SnsMobileNine,
  "mobile/10": SnsMobileTen,
  "mobile/11": SnsMobileEleven,
  "mobile/12": SnsMobileTwelve,
  "mobile/13": SnsMobileThirteen,
  "feed/1": SnsFeedOne,
  "instagram/1": SnsInstagramOne,
  "instagram/2": SnsInstagramTwo,
  "instagram/3": SnsInstagramThree,
  "instagram/3-finger": SnsInstagramThreeFinger,
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
