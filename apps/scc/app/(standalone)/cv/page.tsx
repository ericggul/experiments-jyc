import type { Metadata } from "next";
import Link from "next/link";
import { cvExperiments } from "@/components/standalone/cv/experiments";

export const metadata: Metadata = {
  title: "cv",
};

export default function CvIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">
        cv
      </h1>
      <nav className="grid border-t border-black">
        {cvExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/cv/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
