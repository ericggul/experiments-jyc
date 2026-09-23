import type { Metadata } from "next";
import Link from "next/link";
import { bastilleDayExperiments } from "@/components/standalone/bastille-day/experiments";

export const metadata: Metadata = {
  title: "bastille-day",
};

export default function BastilleDayIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        bastille-day
      </h1>
      <nav className="grid border-t border-black">
        {bastilleDayExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/bastille-day/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
