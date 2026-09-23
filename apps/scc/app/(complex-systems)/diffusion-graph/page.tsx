import type { Metadata } from "next";
import Link from "next/link";
import { diffusionGraphExperiments } from "@/components/complex-systems/diffusion-graph/experiments";

export const metadata: Metadata = {
  title: "diffusion-graph",
};

export default function DiffusionGraphIndexPage() {
  return (
    <main className="min-h-screen bg-[#05080e] p-4 text-[#f3f6ff]">
      <h1 className="mb-6 font-sans text-[clamp(42px,10vw,108px)] leading-[0.86] tracking-[-0.07em]">
        diffusion graph
      </h1>
      <nav className="grid">
        {diffusionGraphExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/diffusion-graph/${experiment.slug}`}
            className="py-4 font-mono text-[clamp(20px,5vw,52px)] leading-none tracking-[-0.06em] hover:text-[#9ebcff]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
