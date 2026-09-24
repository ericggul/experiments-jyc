import type { Metadata } from "next";
import Link from "next/link";
import { mobileExperiments } from "@/components/mobile/experiments";

export const metadata: Metadata = { title: "mobile" };

export default function MobileIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">mobile</h1>
      <nav className="grid border-t border-black" aria-label="Mobile experiments">
        {mobileExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.key}
            href={experiment.href}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
