import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "mobile / substitution" };

export default function SubstitutionIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(40px,10vw,96px)] font-black leading-none">substitution</h1>
      <nav className="grid" aria-label="Substitution experiments">
        {(["1", "2"] as const).map((experiment) => (
          <Link key={experiment} target="_blank" rel="noopener noreferrer" href={`/mobile/transform/substitution/${experiment}`} className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">
            {experiment} <span className="text-[0.4em] align-middle">{experiment === "1" ? "FORM" : "IMPERATIVE"}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
