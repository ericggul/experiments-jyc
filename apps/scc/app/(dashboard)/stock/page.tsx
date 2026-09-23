import type { Metadata } from "next";
import Link from "next/link";
import {
  stockExperiments,
  stockMultiDeviceExperiments,
} from "@/components/dashboard/stock/experiments";

export const metadata: Metadata = {
  title: "stock",
};

export default function StockIndexPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] p-4 text-[#f5f5f7]">
      <nav className="grid w-full max-w-[760px] overflow-hidden rounded-[8px] bg-[#111113] ring-1 ring-white/[0.08]">
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href="/stock/default"
          className="border-b border-white/[0.075] px-5 py-5 text-[28px] font-semibold leading-none hover:bg-white/[0.06]"
        >
          stock/default
        </Link>
        {stockMultiDeviceExperiments.flatMap((experiment) => [
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`mobile-${experiment.slug}`}
            href={`/stock/${experiment.slug}/mobile`}
            className="border-b border-white/[0.075] px-5 py-5 text-[28px] font-semibold leading-none hover:bg-white/[0.06]"
          >
            {experiment.slug}/mobile
          </Link>,
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`screen-${experiment.slug}`}
            href={`/stock/${experiment.slug}/screen`}
            className="border-b border-white/[0.075] px-5 py-5 text-[28px] font-semibold leading-none hover:bg-white/[0.06]"
          >
            {experiment.slug}/screen
          </Link>,
        ])}
        {stockExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={experiment.slug}
            href={`/stock/${experiment.slug}`}
            className="border-b border-white/[0.075] px-5 py-5 text-[28px] font-semibold leading-none last:border-b-0 hover:bg-white/[0.06]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
