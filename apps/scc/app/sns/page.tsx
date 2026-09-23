import type { Metadata } from "next";
import Link from "next/link";
import { snsExperiments } from "@/components/sns/experiments";

export const metadata: Metadata = {
  title: "sns",
};

export default function SnsIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">
        sns
      </h1>
      <nav className="grid border-t border-black">
        {snsExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`${experiment.category}/${experiment.slug}`}
            href={`/sns/${experiment.category}/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
