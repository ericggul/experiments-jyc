import { barrierExperiments } from "@/components/standalone/barrier/experiments";

export const metadata = { title: "barrier" };

export default function BarrierIndex() {
  return (
    <main className="min-h-screen bg-[#f5f1e8] p-8 text-[#483a31]">
      <h1 className="mb-12 text-5xl">barrier</h1>
      <nav aria-label="장벽 광고 실험">
        {barrierExperiments.map((experiment) => (
          <a target="_blank" rel="noopener noreferrer" key={experiment.slug} href={`/barrier/${experiment.slug}`} className="block max-w-3xl py-6 text-3xl leading-relaxed underline-offset-8 hover:underline">
            {experiment.slug}. {experiment.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
