import type { Metadata } from "next";
import Link from "next/link";
import { swarmExperiments } from "@/components/standalone/swarm/experiments";

export const metadata: Metadata = {
  title: "swarm",
};

export default function SwarmIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        swarm
      </h1>
      <nav className="grid border-t border-black">
        {swarmExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/swarm/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
