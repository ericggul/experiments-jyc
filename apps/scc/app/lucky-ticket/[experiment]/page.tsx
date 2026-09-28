import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import LuckyTicketOne from "@/components/mobile/lucky-ticket/1";
import LuckyTicketOneFinalScreen from "@/components/mobile/lucky-ticket/1/final-screen";
import LuckyTicketTwo from "@/components/mobile/lucky-ticket/2";
import LuckyTicketTwoFinalScreen from "@/components/mobile/lucky-ticket/2/final-screen";
import LuckyTicketThree from "@/components/mobile/lucky-ticket/3";
import LuckyTicketThreeFinalScreen from "@/components/mobile/lucky-ticket/3/final-screen";

export const metadata: Metadata = { title: "행운의 복권 | 오늘의 운세 보기" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#000000" };

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }, { experiment: "3" }];
}

export default async function LuckyTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ experiment: string }>;
  searchParams: Promise<{ final?: string | string[] }>;
}) {
  const { experiment } = await params;
  if (experiment !== "1" && experiment !== "2" && experiment !== "3") notFound();
  const { final } = await searchParams;
  if (experiment === "1") return final === "true" ? <LuckyTicketOneFinalScreen /> : <LuckyTicketOne />;
  if (experiment === "2") return final === "true" ? <LuckyTicketTwoFinalScreen /> : <LuckyTicketTwo />;
  return final === "true" ? <LuckyTicketThreeFinalScreen /> : <LuckyTicketThree />;
}
