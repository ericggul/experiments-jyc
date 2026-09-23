import type { Metadata } from "next";
import Link from "next/link";
import { tokyoNetworkExperiments } from "@/components/complex-systems/tokyo-network/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function TokyoNetworkIndexPage() {
  return (
    <main className="min-h-screen bg-[#dce2dc] p-4 text-[#17201c]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        tokyo network
      </h1>
      <nav className="grid border-t border-[#17201c]">
        {tokyoNetworkExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/tokyo-network/${experiment.slug}`}
            className="border-b border-[#17201c] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#17201c] hover:text-[#dce2dc]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
