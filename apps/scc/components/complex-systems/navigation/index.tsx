"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComplexSystemExperiment } from "./model";
import styles from "./navigation.module.css";

type ExperimentGroup = {
  id: string;
  label: string;
  summary?: string;
  experiments: ComplexSystemExperiment[];
};

function groupExperiments(experiments: ComplexSystemExperiment[]) {
  const groups = new Map<string, ExperimentGroup>();

  for (const experiment of experiments) {
    const current = groups.get(experiment.group);
    if (current) {
      current.experiments.push(experiment);
      continue;
    }

    groups.set(experiment.group, {
      id: experiment.group,
      label: experiment.groupLabel,
      summary: experiment.summary,
      experiments: [experiment],
    });
  }

  return [...groups.values()];
}

export default function ComplexSystemsNavigation({
  experiments,
}: {
  experiments: ComplexSystemExperiment[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredExperiments = useMemo(() => {
    if (!normalizedQuery) return experiments;

    return experiments.filter((experiment) =>
      [
        experiment.group,
        experiment.groupLabel,
        experiment.slug,
        experiment.label,
        experiment.href,
        experiment.summary ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [experiments, normalizedQuery]);

  const groups = useMemo(
    () => groupExperiments(filteredExperiments),
    [filteredExperiments],
  );

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    const refreshInterval = window.setInterval(refreshWhenVisible, 45_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);

  useEffect(() => {
    function moveFocus(direction: 1 | -1) {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("[data-complex-system]"),
      );
      if (links.length === 0) return;

      const activeIndex = links.findIndex(
        (link) => link === document.activeElement,
      );
      const nextIndex =
        activeIndex === -1
          ? direction === 1
            ? 0
            : links.length - 1
          : (activeIndex + direction + links.length) % links.length;
      links[nextIndex]?.focus();
    }

    function handleKeydown(event: KeyboardEvent) {
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

      if (!isEditing && event.key === "j") {
        event.preventDefault();
        moveFocus(1);
      }

      if (!isEditing && event.key === "k") {
        event.preventDefault();
        moveFocus(-1);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>SCC archive · directory index</p>
        <h1 className={styles.title}>
          <span>complex</span>
          systems
        </h1>
        <p className={styles.introduction}>
          An active index of runnable studies. Each route is read from the
          registered experiment files, then arranged by its system family.
        </p>
        <label className={styles.search}>
          <span className="sr-only">Filter complex systems experiments</span>
          <span aria-hidden="true">/</span>
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
            placeholder="filter the field"
            autoComplete="off"
          />
        </label>
        <p className={styles.count}>
          {filteredExperiments.length} route
          {filteredExperiments.length === 1 ? "" : "s"}
        </p>
      </header>

      <nav aria-label="Complex systems experiments" className={styles.catalogue}>
        {groups.map((group) => (
          <section key={group.id} className={styles.group}>
            <div className={styles.groupHeading}>
              <h2>{group.label}</h2>
              {group.summary ? <p>{group.summary}</p> : null}
            </div>
            <div className={styles.routes}>
              {group.experiments.map((experiment) => (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  key={experiment.id}
                  href={experiment.href}
                  prefetch={false}
                  data-complex-system
                  className={styles.route}
                >
                  <span className={styles.slug}>{experiment.slug}</span>
                  <span className={styles.routeName}>{experiment.groupLabel}</span>
                  <span className={styles.path}>{experiment.href}</span>
                  <span aria-hidden="true" className={styles.arrow}>
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {filteredExperiments.length === 0 ? (
          <p className={styles.empty}>
            No runnable experiment matches “{query}”.
          </p>
        ) : null}
      </nav>
    </main>
  );
}
