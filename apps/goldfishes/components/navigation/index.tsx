"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type NavigationExperiment = {
  key: string;
  area: "screen" | "pc";
  section: "default" | "2d" | "dated";
  date: string | null;
  phrase: string;
};

type ExperimentGroup = {
  key: string;
  label: string;
  archiveKey?: string;
  experiments: NavigationExperiment[];
};

function getExperimentName(key: string) {
  const path = key.split("/");
  if (path[1] === "default") return "default";
  if (path[1] === "2d" && path[2] === "1") return "2d";
  return path.at(-1) ?? key;
}

function getDateLabel(date: string) {
  return date.replaceAll("-", ".");
}

function groupExperiments(experiments: NavigationExperiment[]) {
  const groups: ExperimentGroup[] = [];
  const current = experiments.filter(
    (experiment) => experiment.section === "default",
  );
  const formats = experiments.filter(
    (experiment) => experiment.section === "2d",
  );

  if (current.length > 0) {
    groups.push({ key: "current", label: "current", experiments: current });
  }
  if (formats.length > 0) {
    groups.push({ key: "formats", label: "formats", experiments: formats });
  }

  const datedExperiments = experiments.filter(
    (
      experiment,
    ): experiment is NavigationExperiment & { date: string } =>
      experiment.section === "dated" && experiment.date !== null,
  );
  const areas = Array.from(
    new Set(
      datedExperiments.map((experiment) => experiment.area),
    ),
  );
  const showAreaInDateLabel = areas.length > 1;

  for (const area of areas) {
    const dates = Array.from(
      new Set(
        datedExperiments
          .filter((experiment) => experiment.area === area)
          .map((experiment) => experiment.date),
      ),
    ).sort((first, second) => second.localeCompare(first));

    for (const date of dates) {
      const dateExperiments = datedExperiments
        .filter(
          (experiment) => experiment.area === area && experiment.date === date,
        )
        .sort((first, second) => first.key.localeCompare(second.key));

      groups.push({
        key: `${area}:${date}`,
        label: showAreaInDateLabel ? `${area} / ${getDateLabel(date)}` : getDateLabel(date),
        archiveKey: `${area}/${dateExperiments[0]?.key.split("/")[1]}`,
        experiments: dateExperiments,
      });
    }
  }

  return groups;
}

export default function GoldfishesNavigation({
  experiments,
  archiveKey,
  scope,
}: {
  experiments: NavigationExperiment[];
  archiveKey?: string;
  scope?: "screen" | "pc";
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperiments = useMemo(() => {
    if (!normalizedQuery) return experiments;
    return experiments.filter((experiment) => {
      const searchable = [
        experiment.key,
        getExperimentName(experiment.key),
        experiment.phrase,
        experiment.date ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [experiments, normalizedQuery]);

  const groups = useMemo(
    () => groupExperiments(filteredExperiments),
    [filteredExperiments],
  );

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && target === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
        return;
      }

      if ((event.key === "j" || event.key === "k") && !isEditing) {
        const links = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            "[data-goldfish-experiment]",
          ),
        );
        if (links.length === 0) return;

        event.preventDefault();
        const activeIndex = links.findIndex(
          (link) => link === document.activeElement,
        );
        const direction = event.key === "j" ? 1 : -1;
        const nextIndex =
          activeIndex === -1
            ? direction === 1
              ? 0
              : links.length - 1
            : (activeIndex + direction + links.length) % links.length;
        links[nextIndex]?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-4 bg-black px-4 sm:gap-8">
        <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
          {archiveKey || scope ? (
            <>
              <Link
                href="/"
                className="text-white/55 hover:text-white focus-visible:text-white focus-visible:outline-none"
              >
                Goldfishes
              </Link>
              <span aria-hidden="true" className="text-white/25">
                /
              </span>
              <span>{archiveKey ?? scope}</span>
            </>
          ) : (
            "Goldfishes"
          )}
        </h1>
        <label className="relative block max-w-[680px]">
          <span className="sr-only">Search experiments</span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-white/40"
          >
            /
          </span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              setQuery("");
              event.currentTarget.blur();
            }}
            placeholder={
              archiveKey
                ? `Search ${archiveKey} experiments`
                : "Search name, date, description, or path"
            }
            autoComplete="off"
            className="h-8 w-full bg-[#171717] pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:bg-[#222] focus:ring-1 focus:ring-white/55"
          />
        </label>
        <div className="flex items-center gap-5 font-mono text-[10px] text-white/45">
          <Link
            href="/screen"
            className="hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            screen
          </Link>
          <Link
            href="/pc"
            className="hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            pc
          </Link>
          <Link
            href="/desktop"
            className="hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            desktop
          </Link>
          <span>{filteredExperiments.length} experiments</span>
          <span className="hidden lg:inline">J/K move · Enter open · Esc clear</span>
        </div>
      </header>

      <nav aria-label="Goldfishes experiments" className="px-2 pb-8 sm:px-4">
        <div className="hidden h-7 grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_minmax(12rem,1fr)_1rem] items-center gap-4 px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-white/30 md:grid">
          <span>Name</span>
          <span>Description</span>
          <span>Path</span>
          <span />
        </div>

        {groups.map((group) => {
          const isCollapsed = !normalizedQuery && collapsedGroups.has(group.key);

          return (
            <section key={group.key} className="mb-2">
              <div className="flex items-center">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleGroup(group.key)}
                  className="flex h-8 min-w-0 flex-1 items-center gap-2 px-3 text-left font-mono text-[11px] text-white/50 hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.1] focus-visible:text-white focus-visible:outline-none"
                >
                  <span aria-hidden="true" className="w-3 text-[9px]">
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                  <span>{group.label}</span>
                  <span className="text-white/25">
                    {group.experiments.length}
                  </span>
                </button>

                {group.archiveKey && group.archiveKey !== archiveKey ? (
                  <Link
                    href={`/${group.archiveKey}`}
                    aria-label={`Open ${group.label} experiment archive`}
                    className="flex h-8 items-center px-3 font-mono text-[10px] text-white/35 hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none"
                  >
                    {group.archiveKey} →
                  </Link>
                ) : null}
              </div>

              {!isCollapsed ? (
                <div>
                  {group.experiments.map((experiment) => (
                    <Link
                      key={experiment.key}
                      href={`/${experiment.key}`}
                      prefetch={false}
                      data-goldfish-experiment
                      className="group grid min-h-11 grid-cols-[6rem_minmax(0,1fr)_1rem] items-center gap-3 px-3 text-[12px] hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none md:grid-cols-[minmax(7rem,0.65fr)_minmax(15rem,2fr)_minmax(12rem,1fr)_1rem] md:gap-4"
                    >
                      <span className="truncate font-medium group-hover:text-black group-focus-visible:text-black">
                        {getExperimentName(experiment.key)}
                      </span>
                      <span className="truncate text-white/58 group-hover:text-black/65 group-focus-visible:text-black/65">
                        {experiment.phrase}
                      </span>
                      <span className="hidden truncate font-mono text-[10px] text-white/32 group-hover:text-black/45 group-focus-visible:text-black/45 md:block">
                        /{experiment.key}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-right group-hover:text-black group-focus-visible:text-black"
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}

        {filteredExperiments.length === 0 ? (
          <p className="px-3 py-8 font-mono text-[11px] text-white/45">
            No experiments match “{query}”.
          </p>
        ) : null}
      </nav>
    </main>
  );
}
