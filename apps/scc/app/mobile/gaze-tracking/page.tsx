import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "mobile / gaze-tracking" };

export default function GazeTrackingIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(40px,10vw,96px)] font-black leading-none">gaze-tracking</h1>
      <nav className="grid" aria-label="Gaze tracking experiments">
        <Link target="_blank" rel="noopener noreferrer" href="/mobile/gaze-tracking/1" className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">1</Link>
        <Link target="_blank" rel="noopener noreferrer" href="/mobile/gaze-tracking/2" className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">2</Link>
      </nav>
    </main>
  );
}
