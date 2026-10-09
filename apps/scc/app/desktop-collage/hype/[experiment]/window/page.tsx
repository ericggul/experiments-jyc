import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HypeWindowClient from "@/components/desktop-collage/hype/1/window/client";

export const metadata: Metadata = { title: "​" };

// The cloned page shown inside a window the experiment opens; its service and
// keyword come from the query.
export default async function HypeWindowPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "1") notFound();
  return <HypeWindowClient />;
}
