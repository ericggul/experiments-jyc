import type { Metadata } from "next";
import Link from "next/link";
import { calendarExperiments } from "@/components/realtime/calendar/experiments";

export const metadata: Metadata = {
  title: "calendar",
};

export default function CalendarIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        calendar
      </h1>
      <nav className="grid border-t border-black">
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href="/calendar/default"
          className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
        >
          default
        </Link>
        {calendarExperiments.flatMap((experiment) => [
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`mobile-${experiment.slug}`}
            href={`/calendar/${experiment.slug}/mobile`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            {experiment.slug}/mobile
          </Link>,
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`screen-${experiment.slug}`}
            href={`/calendar/${experiment.slug}/screen`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            {experiment.slug}/screen
          </Link>,
        ])}
      </nav>
    </main>
  );
}
