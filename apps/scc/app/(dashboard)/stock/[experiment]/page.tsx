import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import StockTwo from "@/components/ui/dashboard/stock/2";
import StockThree from "@/components/ui/dashboard/stock/3";
import StockFour from "@/components/ui/dashboard/stock/4";
import StockDefault from "@/components/ui/dashboard/stock/default";
import {
  isStockDirectRoute,
  stockDirectRoutes,
  type StockDirectRoute,
} from "@/components/ui/dashboard/stock/experiments";

const components: Record<StockDirectRoute, ComponentType> = {
  default: StockDefault,
  "2": StockTwo,
  "3": StockThree,
  "4": StockFour,
};

export function generateStaticParams() {
  return stockDirectRoutes.map((experiment) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  return {
    title: `stock ${experiment}`,
  };
}

export default async function StockExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isStockDirectRoute(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
