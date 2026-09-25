import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clones } from "@/components/mobile/transform/clones";

export function generateStaticParams() {
  return [{ experiment: "1" }, { experiment: "2" }];
}

export async function generateMetadata({ params }: { params: Promise<{ experiment: string }> }): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `mobile / substitution / ${experiment}` };
}

export default async function SubstitutionExperimentPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (experiment !== "1" && experiment !== "2") notFound();
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(40px,10vw,96px)] font-black leading-none">substitution/{experiment} <span className="text-[0.4em] align-middle">{experiment === "1" ? "FORM" : "IMPERATIVE"}</span></h1>
      <nav className="grid" aria-label={`Substitution ${experiment} clones`}>
        {Object.keys(clones).map((clone) => (
          <Link key={clone} target="_blank" rel="noopener noreferrer" href={`/mobile/transform/substitution/${experiment}/${clone}`} className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">
            clone/{clone}
          </Link>
        ))}
      </nav>
    </main>
  );
}
