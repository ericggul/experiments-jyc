import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import MobileTesting from "@/components/mobiles/1/os";

export const metadata: Metadata = {
  title: "mobiles",
  description: "A phone to use by hand, built from the mobiles/1 app clones.",
};

// Behaves like a phone's own screen: no zoom, edge to edge, black chrome.
export const viewport: Viewport = {
  themeColor: "black",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return [{ experiment: "1" }];
}

export default async function MobileTestingPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "1") notFound();
  return <MobileTesting />;
}
