import type { Metadata } from "next";
import Link from "next/link";
import { fingerSkatingGroups } from "@/components/finger-skating/experiments";

export const metadata: Metadata = {
  title: "finger-skating",
};

export default function FingerSkatingPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#171717]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        finger-skating
      </h1>
      <nav className="grid gap-10" aria-label="finger-skating experiments">
        {fingerSkatingGroups.map((group) => (
          <section key={group.slug}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em]">
              {group.label}
            </h2>
            <div className="grid border-t border-black">
              {group.experiments.flatMap((experiment) => [
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`${group.slug}-${experiment.slug}-mobile`}
                  href={`/finger-skating/${group.slug}/${experiment.slug}/mobile`}
                  className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
                >
                  {experiment.slug}/mobile
                </Link>,
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`${group.slug}-${experiment.slug}-screen`}
                  href={`/finger-skating/${group.slug}/${experiment.slug}/screen`}
                  className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
                >
                  {experiment.slug}/screen
                </Link>,
              ])}
            </div>
          </section>
        ))}
      </nav>
    </main>
  );
}
