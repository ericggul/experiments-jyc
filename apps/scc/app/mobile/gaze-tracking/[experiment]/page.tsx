import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GazeTracking from "@/components/mobile/gaze-tracking";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / gaze-tracking / ${experiment}` };
}

export default async function GazeTrackingExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment === "1") return <GazeTracking />;
  if (experiment !== "2") notFound();

  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(40px,10vw,96px)] font-black leading-none">gaze-tracking/2</h1>
      <nav className="grid" aria-label="Gaze tracking clone experiments">
        {Object.keys(clones).map((clone) => (
          <Link key={clone} target="_blank" rel="noopener noreferrer" href={`/mobile/gaze-tracking/2/${clone}`} className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">
            clone/{clone}
          </Link>
        ))}
      </nav>
    </main>
  );
}
