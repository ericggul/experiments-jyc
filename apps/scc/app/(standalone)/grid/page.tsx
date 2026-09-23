import type { Metadata } from "next";
import Link from "next/link";
import { gridExperiments } from "@/components/standalone/grid/experiments";

export const metadata: Metadata = {
  title: "grid",
};

export default function GridIndexPage() {
  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        grid
      </h1>
      <nav className="grid border-t border-white">
        {gridExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/grid/${experiment.slug}`}
            className="border-b border-white py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-white hover:text-black"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
