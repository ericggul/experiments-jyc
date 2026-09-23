import type { Metadata } from "next";
import Link from "next/link";
import { erdosRenyiExperiments } from "@/components/complex-systems/erdos-renyi/experiments";

export const metadata: Metadata = {
  title: "Erdős–Rényi random graph",
};

export default function ErdosRenyiIndexPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] p-4 text-[#233f7c]">
      <h1 className="mb-6 max-w-3xl text-[clamp(2.8rem,9vw,7rem)] leading-[0.88] tracking-[-0.065em]">
        Erdős–Rényi random graph
      </h1>
      <nav aria-label="Experiments" className="grid gap-2">
        {erdosRenyiExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/erdos-renyi/${experiment.slug}`}
            className="w-fit bg-[#28529d] px-3 py-2 text-sm font-semibold text-[#f7f8fb] outline-offset-4 hover:bg-[#bb765d] focus-visible:outline focus-visible:outline-1"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
