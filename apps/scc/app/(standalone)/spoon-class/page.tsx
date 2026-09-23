import type { Metadata } from "next";
import Link from "next/link";
import { spoonClassExperiments } from "@/components/standalone/spoon-class/experiments";

export const metadata: Metadata = {
  title: "spoon-class",
};

export default function SpoonClassIndexPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-[#535353]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        spoon-class
      </h1>
      <nav className="grid">
        {spoonClassExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/spoon-class/${experiment.slug}`}
            className="py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#535353] hover:text-[#f7f7f7]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
