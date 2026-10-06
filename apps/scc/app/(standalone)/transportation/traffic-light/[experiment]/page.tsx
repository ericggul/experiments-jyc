import { notFound } from "next/navigation";
import TrafficLightOne from "@/components/standalone/transportation/traffic-light/1";
import TrafficLightTwo from "@/components/standalone/transportation/traffic-light/2";
import { trafficLightExperiments } from "@/components/standalone/transportation/traffic-light/experiments";

export const metadata = { title: "Traffic light" };
export function generateStaticParams() { return trafficLightExperiments.map(({ slug }) => ({ experiment: slug })); }
export default async function Page({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!trafficLightExperiments.some(({ slug }) => slug === experiment)) notFound();
  return experiment === "1" ? <TrafficLightOne /> : <TrafficLightTwo />;
}
