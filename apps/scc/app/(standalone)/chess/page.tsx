import type { Metadata } from "next";
import Link from "next/link";
import { chessExperiments } from "@/components/standalone/chess/experiments";

export const metadata: Metadata = { title: "Chess" };

export default function ChessIndexPage() {
  return (
    <main className="min-h-dvh bg-white p-8 text-black">
      <h1 className="mb-8 text-2xl font-medium tracking-tight">Chess</h1>
      <nav aria-label="Chess experiments">
        {chessExperiments.map((experiment) => (
          <Link target="_blank" rel="noopener noreferrer" key={experiment.slug} href={`/chess/${experiment.slug}`} className="inline-block py-3 underline underline-offset-4">
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
