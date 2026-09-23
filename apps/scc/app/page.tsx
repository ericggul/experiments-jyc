import Link from "next/link";
import { experimentCatalog } from "@/lib/experiment-catalog";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-6 py-8 text-[#171717] sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-between">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span>SCC</span>
          <span>localhost socket study</span>
        </div>

        <div className="grid gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-5 max-w-lg text-sm uppercase tracking-[0.22em] text-[#6f6a61]">
              experiment index
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] sm:text-7xl">
              Route each artwork by experiment first.
            </h1>
          </div>

          <div className="grid gap-3">
            {experimentCatalog.map((route) => (
              <Link
                target="_blank"
                rel="noopener noreferrer"
                key={route.href}
                href={route.href}
                className="group grid gap-3 border border-[#171717]/15 bg-white/45 p-5 transition hover:border-[#171717]/55 hover:bg-white/80"
              >
                <span className="flex items-center justify-between text-2xl font-medium">
                  {route.label}
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    -&gt;
                  </span>
                </span>
                <span className="max-w-sm text-sm leading-6 text-[#6f6a61]">
                  {route.description}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-[#6f6a61]">
          Realtime and standalone studies share stable public routes while their
          implementation folders stay organized by runtime complexity.
        </p>
      </section>
    </main>
  );
}
