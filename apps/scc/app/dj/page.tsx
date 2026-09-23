import type { Metadata } from "next";
import Link from "next/link";
import { djExperiments } from "@/components/dj/experiments";

export const metadata: Metadata = {
  title: "dj",
};

export default function DjPage() {
  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">
        dj
      </h1>
      <nav className="grid gap-2">
        {djExperiments.map((experiment) => (
          <Link
            target="_blank"
            rel="noopener noreferrer"
            key={`controller-${experiment.slug}`}
            href={`/dj/${experiment.slug}/controller`}
            className="py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-white hover:text-black"
          >
            {experiment.slug}/controller
          </Link>
        ))}
        {djExperiments.flatMap((experiment) => [
          ...(experiment.hasSingleScreen
            ? [
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`screen-${experiment.slug}`}
                  href={`/dj/${experiment.slug}/screen`}
                  className="py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-white hover:text-black"
                >
                  {experiment.slug}/screen
                </Link>,
              ]
            : []),
          ...experiment.screenIds.map((screenId) => (
            <Link
              target="_blank"
              rel="noopener noreferrer"
              key={`screen-${experiment.slug}-${screenId}`}
              href={`/dj/${experiment.slug}/screen/${screenId}`}
              className="py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-white hover:text-black"
            >
              {experiment.slug}/screen/{screenId}
            </Link>
          )),
          ...(experiment.hasWholeScreen
            ? [
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`screen-${experiment.slug}-whole`}
                  href={`/dj/${experiment.slug}/screen/whole`}
                  className="py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-white hover:text-black"
                >
                  {experiment.slug}/screen/whole
                </Link>,
              ]
            : []),
        ])}
      </nav>
    </main>
  );
}
