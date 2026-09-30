import type { Metadata } from "next";
import Link from "next/link";
import { flightVisualisationExperiments } from "@/components/complex-systems/flight-visualisation/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function FlightVisualisationIndexPage() {
  return (
    <main className="min-h-screen bg-black p-4 text-[#c4c4c4]">
      <nav className="grid">
        {flightVisualisationExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/flight-visualisation/${experiment.slug}`}
            className="py-2 font-mono text-[clamp(20px,5vw,48px)] leading-none hover:text-[#00ffae]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
