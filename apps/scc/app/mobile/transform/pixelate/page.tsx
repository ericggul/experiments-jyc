import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "mobile / pixelate" };

export default function PixelateIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(40px,10vw,96px)] font-black leading-none">pixelate</h1>
      <nav className="grid" aria-label="Pixelate clone experiments">
        {Array.from({ length: 13 }, (_, index) => (
          <Link key={index + 1} target="_blank" rel="noopener noreferrer" href={`/mobile/transform/pixelate/${index + 1}`} className="py-3 text-[clamp(28px,7vw,64px)] font-black leading-none hover:bg-black hover:text-white">
            clone/{index + 1}
          </Link>
        ))}
      </nav>
    </main>
  );
}
