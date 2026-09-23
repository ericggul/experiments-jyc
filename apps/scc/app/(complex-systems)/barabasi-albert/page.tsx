import type { Metadata } from "next";
import Link from "next/link";
import { barabasiAlbertExperiments } from "@/components/complex-systems/barabasi-albert/experiments";

export const metadata: Metadata = {
  title: "Barabási–Albert network growth",
};

export default function BarabasiAlbertIndexPage() {
  return (
    <main className="min-h-screen bg-[#202943] p-4 text-[#f1e6c8]">
      <h1 className="mb-6 max-w-3xl text-[clamp(2.8rem,9vw,7rem)] leading-[0.88] tracking-[-0.065em]">
        Barabási–Albert network growth
      </h1>
      <nav aria-label="Experiments" className="grid gap-2">
        {barabasiAlbertExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/barabasi-albert/${experiment.slug}`}
            className="w-fit bg-[#e7684f] px-3 py-2 text-sm font-semibold text-[#202943] outline-offset-4 hover:bg-[#f1e6c8] focus-visible:outline focus-visible:outline-1"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
