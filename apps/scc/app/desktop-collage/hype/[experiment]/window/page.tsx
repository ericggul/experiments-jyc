import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import HypeOneWindow from "@/components/desktop-collage/hype/1/window/client";
import HypeTwoWindow from "@/components/desktop-collage/hype/2/window/client";
import HypeThreeWindow from "@/components/desktop-collage/hype/3/window/client";

export const metadata: Metadata = { title: "\u200b" };

// The cloned page shown inside a window the experiment opens; its service and
// keyword come from the query.
const windows: Record<string, ComponentType> = { "1": HypeOneWindow, "2": HypeTwoWindow, "3": HypeThreeWindow };

export default async function HypeWindowPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  const Window = windows[experiment];
  if (!Window) notFound();
  return <Window />;
}
