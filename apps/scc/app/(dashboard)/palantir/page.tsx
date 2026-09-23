import type { Metadata } from "next";
import Link from "next/link";
import { palantirExperiments } from "@/components/dashboard/palantir/experiments";

export const metadata: Metadata = { title: "palantir" };

export default function PalantirIndexPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0c1116] p-4 text-[#d8e0e5]">
      <nav className="grid w-full max-w-[760px] overflow-hidden rounded-[4px] bg-[#151c23] ring-1 ring-white/10">
        {palantirExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/palantir/${experiment.slug}`}
            className="px-5 py-5 text-[28px] font-semibold leading-none hover:bg-white/[0.06]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
