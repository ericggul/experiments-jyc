import type { Metadata } from "next";
import Link from "next/link";
import { githubExperiments } from "@/components/dashboard/github/experiments";

export const metadata: Metadata = { title: "github" };

export default function GitHubIndexPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#070b36] p-4 text-white">
      <nav className="grid w-full max-w-[760px] overflow-hidden rounded-lg bg-white/[0.08] ring-1 ring-white/[0.14]">
        {githubExperiments.map((experiment) => (
          <Link target="_blank" rel="noopener noreferrer" className="px-5 py-5 text-[28px] font-semibold leading-none hover:bg-white/[0.08]" href={`/github/${experiment.slug}`} key={experiment.slug}>
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
