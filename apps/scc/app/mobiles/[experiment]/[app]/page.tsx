import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SingleApp from "@/components/mobiles/1/single";
import { appIds, isAppId } from "@/components/mobiles/1/model/catalogue";

export const metadata: Metadata = {
  title: "mobiles",
};

export function generateStaticParams() {
  return appIds.map((app) => ({ experiment: "1", app }));
}

export default async function MobilesAppPage({ params }: { params: Promise<{ experiment: string; app: string }> }) {
  const { experiment, app } = await params;
  if (experiment !== "1" || !isAppId(app)) notFound();
  return <SingleApp app={app} />;
}
