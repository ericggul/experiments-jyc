"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavigationExperiment } from "@/components/experiments";
import styles from "./navigation.module.css";

type Props = {
  experiments: readonly NavigationExperiment[];
  scope?: "screen";
  archiveDate?: string;
};

export default function SixSigmaNavigation({ experiments, scope, archiveDate }: Props) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const filtered = experiments.filter((item) =>
    [item.key, item.label, item.date].join(" ").toLowerCase().includes(search),
  );
  const dates = [...new Set(filtered.map((item) => item.key.split("/")[1]))].sort(
    (a, b) => b.localeCompare(a),
  );

  return (
    <main className={styles.archive}>
      <header className={styles.header}>
        <h1>
          {scope ? <Link href="/">six-sigma</Link> : "six-sigma"}
          {scope && <> / <Link href="/screen">screen</Link></>}
          {archiveDate && <> / {archiveDate}</>}
        </h1>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search experiments</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search experiments"
          />
        </label>
        <Link href="/screen" className={styles.familyLink}>screen</Link>
      </header>

      <nav aria-label="six-sigma experiments" className={styles.list}>
        {dates.map((date) => (
          <section key={date} className={styles.group}>
            <h2>
              {archiveDate ? date : <Link href={`/screen/${date}`}>{date}</Link>}
            </h2>
            {filtered.filter((item) => item.key.split("/")[1] === date).map((item) => (
              <Link key={item.key} href={`/${item.key}`} className={styles.experiment}>
                <span>{item.label}</span>
                <span className={styles.path}>/{item.key}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </section>
        ))}
        {filtered.length === 0 && <p className={styles.empty}>No matching experiments.</p>}
      </nav>
    </main>
  );
}
