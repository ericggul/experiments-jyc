import Image from "next/image";
import Link from "next/link";
import { collection, events, exhibitions, visitCards } from "./data";

function Arrow() {
  return <span aria-hidden="true">-&gt;</span>;
}

export default function MomaOne() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-20 border-b border-black bg-white">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[240px_1fr_auto] md:px-6">
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="/moma"
            className="text-[42px] font-black leading-none tracking-[-0.08em] md:text-[64px]"
            aria-label="Back to MoMA experiments"
          >
            MoMA
          </Link>
          <nav className="hidden gap-6 text-[15px] font-semibold md:flex">
            <a href="#visit">Visit</a>
            <a href="#exhibitions">Exhibitions and events</a>
            <a href="#collection">Art and artists</a>
            <a href="#store">Store</a>
          </nav>
          <div className="flex items-center gap-4 text-[15px] font-semibold">
            <a href="#membership" className="hidden sm:inline">
              Membership
            </a>
            <a href="#tickets" className="rounded-none bg-black px-4 py-2 text-white">
              Tickets
            </a>
          </div>
        </div>
      </header>

      <section className="grid min-h-[78vh] border-b border-black lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between gap-12 px-4 py-6 md:px-6 md:py-8">
          <div className="max-w-4xl">
            <p className="mb-5 text-[15px] font-semibold">Welcome</p>
            <h1 className="text-[clamp(64px,15vw,180px)] font-black leading-[0.78] tracking-[-0.075em]">
              Explore art and ideas at MoMA.
            </h1>
          </div>
          <div
            id="visit"
            className="grid gap-4 border-t border-black pt-5 md:grid-cols-[1fr_auto]"
          >
            <p className="max-w-xl text-2xl font-semibold leading-tight md:text-4xl">
              The museum is open 10:30 a.m.-5:30 p.m. today.
            </p>
            <a
              href="#tickets"
              className="self-start border border-black px-5 py-3 text-lg font-semibold transition hover:bg-black hover:text-white"
            >
              Plan your visit <Arrow />
            </a>
          </div>
        </div>

        <div className="relative min-h-[440px] overflow-hidden border-t border-black lg:border-l lg:border-t-0">
          <Image
            src={collection[0].image}
            alt="The Starry Night by Vincent van Gogh"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 grid gap-1 bg-black p-4 text-white md:grid-cols-[1fr_auto] md:items-end">
            <p className="text-2xl font-bold leading-none">
              Vincent van Gogh, The Starry Night
            </p>
            <p className="text-sm">Collection highlight</p>
          </div>
        </div>
      </section>

      <section
        id="exhibitions"
        className="grid border-b border-black lg:grid-cols-[340px_1fr]"
      >
        <div className="border-b border-black p-4 md:p-6 lg:border-b-0 lg:border-r">
          <h2 className="text-5xl font-black tracking-[-0.06em] md:text-7xl">
            Exhibitions
          </h2>
        </div>
        <div>
          {exhibitions.map(([title, date]) => (
            <a
              key={title}
              href="#tickets"
              className="grid gap-3 border-b border-black px-4 py-5 transition last:border-b-0 hover:bg-black hover:text-white md:grid-cols-[1fr_180px_24px] md:px-6"
            >
              <span className="text-2xl font-bold leading-tight md:text-4xl">
                {title}
              </span>
              <span className="text-lg font-semibold md:text-right">{date}</span>
              <Arrow />
            </a>
          ))}
        </div>
      </section>

      <section id="collection" className="border-b border-black px-4 py-8 md:px-6">
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_320px] md:items-end">
          <h2 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-8xl">
            Art and artists in our collection
          </h2>
          <p className="text-xl font-semibold leading-snug">
            Discover works that speak across painting, design, photography,
            performance, film, and everyday objects.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden border border-black bg-black md:grid-cols-3">
          {collection.map((item) => (
            <article key={item.work} className="bg-white">
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
                <Image
                  src={item.image}
                  alt={`${item.work} by ${item.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-500 hover:scale-[1.04]"
                />
              </div>
              <div className="grid gap-2 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                  {item.title}
                </p>
                <h3 className="text-3xl font-black tracking-[-0.04em]">
                  {item.work}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid border-b border-black lg:grid-cols-2">
        <div className="border-b border-black p-4 md:p-6 lg:border-b-0 lg:border-r">
          <p className="mb-4 text-lg font-semibold">Events for everyone</p>
          <h2 className="text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-8xl">
            Films, performances, talks, and making.
          </h2>
        </div>
        <div>
          {events.map(([title, type, text]) => (
            <article
              key={title}
              className="border-b border-black p-4 last:border-b-0 md:p-6"
            >
              <div className="mb-3 flex justify-between gap-4 text-sm font-bold uppercase tracking-[0.12em]">
                <span>{type}</span>
                <Arrow />
              </div>
              <h3 className="mb-2 text-3xl font-black tracking-[-0.04em]">
                {title}
              </h3>
              <p className="max-w-xl text-lg leading-snug">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="store" className="grid lg:grid-cols-[1fr_1fr_1fr]">
        {visitCards.map(([title, text]) => (
          <a
            key={title}
            href="#tickets"
            className="min-h-[260px] border-b border-black p-4 transition hover:bg-black hover:text-white md:p-6 lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <h2 className="mb-5 text-4xl font-black leading-none tracking-[-0.05em]">
              {title}
            </h2>
            <p className="max-w-sm text-xl font-semibold leading-tight">{text}</p>
          </a>
        ))}
      </section>
    </main>
  );
}
