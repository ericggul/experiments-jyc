import type { Metadata } from "next";
import { translateExperiments } from "@/components/standalone/translate/experiments";

export const metadata: Metadata = {
  title: "translate",
};

export default function TranslateIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        translate
      </h1>
      <nav className="grid border-t border-black">
        {translateExperiments.map((experiment) => (
          <a
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/translate/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            {experiment.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
