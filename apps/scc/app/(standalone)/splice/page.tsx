import type { Metadata } from "next";
import Link from "next/link";
import { spliceExperiments } from "@/components/standalone/splice/experiments";

export const metadata: Metadata = { title: "Splice" };

export default function SpliceIndexPage() {
  return (
    <main className="min-h-screen bg-[#f2f1ed] p-8 text-[#242421] sm:p-14">
      <Link href="/" className="text-sm underline underline-offset-4">SCC</Link>
      <h1 className="mb-12 mt-20 text-6xl font-medium tracking-[-0.06em]">Splice</h1>
      <nav aria-label="Splice experiments" className="grid gap-8">
        {spliceExperiments.map((experiment) => (
          <Link key={experiment.slug} href={`/splice/${experiment.slug}`} className="block w-fit">
            <span className="text-2xl underline underline-offset-8">{experiment.label} ↗</span>
            <p className="mt-4 text-sm">{experiment.description}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
