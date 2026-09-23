import type { Metadata } from "next";
import Link from "next/link";
import { buttonExperiments } from "@/components/ui/buttons/experiments";

export const metadata: Metadata = {
  title: "ui buttons",
};

export default function ButtonExperimentsIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">
        ui/buttons
      </h1>
      <nav className="grid border-t border-black">
        {buttonExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-black hover:text-white"
            href={`/ui/buttons/${experiment.slug}`}
            key={experiment.slug}
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
