"use client";

import { useRef, useState } from "react";
import { googleResults } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./google.module.css";

// Google web results for the keyword, with the AI Overview on top. The
// reader's composer is the search box: typing replaces the query, and the
// page answers a submitted query the way Google corrects one, with the
// keyword's results and a "Showing results for" line.

const tabs = ["All", "News", "Images", "Videos", "Short videos", "Forums", "Web", "More"];

export default function Google({ keyword }: WindowParams) {
  const [query, setQuery] = useState(keyword);
  const [draft, setDraft] = useState(keyword);
  const [openAsk, setOpenAsk] = useState<number | null>(null);
  const draftRef = useRef(keyword);
  const input = useRef<HTMLInputElement>(null);
  const page = googleResults(keyword);

  useTitle(`${query} - Google Search`);
  const edit = (value: string) => { draftRef.current = value; setDraft(value); };
  const submit = () => {
    const text = draftRef.current.trim();
    if (!text) return;
    setQuery(text);
    setOpenAsk(null);
    window.scrollTo({ top: 0 });
  };
  useHypeApi({
    focus: () => { edit(""); input.current?.focus(); },
    type: (character) => edit(draftRef.current + character),
    submit,
    act: (name) => { if (name === "like") setOpenAsk(0); },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.logo} href="#" aria-label="Google"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></a>
        <form className={styles.box} onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <input ref={input} value={draft} onChange={(event) => edit(event.target.value)} aria-label="Search" />
          <span className={styles.clear}>✕</span>
          <span className={styles.divider} />
          <span className={styles.tool} /><span className={styles.tool} /><span className={styles.go} />
        </form>
        <div className={styles.account}><span className={styles.apps} /><span className={styles.avatar}>J</span></div>
      </header>
      <nav className={styles.tabs}>
        {tabs.map((tab, index) => <a key={tab} href="#" className={index === 0 ? styles.tabActive : undefined}>{tab}{tab === "More" ? " ▾" : ""}</a>)}
        <a href="#" className={styles.tools}>Tools</a>
      </nav>
      <main className={styles.main}>
        <div className={styles.count}>{page.count}</div>
        {query !== keyword ? <div className={styles.corrected}>Showing results for <a href="#"><i>{keyword}</i></a><br />Search instead for <a href="#">{query}</a></div> : null}
        <section className={styles.overview}>
          <div className={styles.overviewLabel}><span className={styles.spark}>✦</span> AI Overview</div>
          <p>{page.overview}</p>
          <div className={styles.overviewFoot}><span>Show more</span><span>AI responses may include mistakes.</span></div>
        </section>
        {page.results.slice(0, 3).map((result) => <Result key={result.url} {...result} />)}
        <section className={styles.ask}>
          <h3>People also ask</h3>
          {page.alsoAsk.map((question, index) => (
            <div key={question} className={styles.askRow} onClick={() => setOpenAsk(openAsk === index ? null : index)}>
              <div><span>{question}</span><span className={styles.chevron}>{openAsk === index ? "⌃" : "⌄"}</span></div>
              {openAsk === index ? <p>{page.overview.split(". ")[0]}. The answer depends on which definition is used; most analysts treat the term broadly.</p> : null}
            </div>
          ))}
        </section>
        {page.results.slice(3).map((result) => <Result key={result.url} {...result} />)}
        <section className={styles.related}>
          <h3>Related searches</h3>
          <div>{page.related.map((term) => <a key={term} href="#"><span className={styles.magnifier} />{term}</a>)}</div>
        </section>
        <nav className={styles.pages} aria-label="Pagination">
          <span className={styles.gl}>G<em>o</em><em>o</em><em>o</em><em>o</em><em>o</em><em>o</em><em>o</em><em>o</em><em>o</em>gle</span>
          <div>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <a key={n} href="#" className={n === 1 ? styles.pageActive : undefined}>{n}</a>)}<a href="#">Next</a></div>
        </nav>
      </main>
      <footer className={styles.footer}>
        <div>South Korea · Daejeon · Based on your past activity</div>
        <div><a href="#">Help</a><a href="#">Send feedback</a><a href="#">Privacy</a><a href="#">Terms</a></div>
      </footer>
    </div>
  );
}

function Result({ title, url, site, path, snippet }: ReturnType<typeof googleResults>["results"][number]) {
  return (
    <div className={styles.result}>
      <div className={styles.source}>
        <span className={styles.favicon}>{site[0].toUpperCase()}</span>
        <div><span className={styles.site}>{site.split(".")[0]}</span><span className={styles.url}>{site}{path ? ` › ${path}` : ""}</span></div>
      </div>
      <a className={styles.title} href={url}>{title}</a>
      <p className={styles.snippet}>{snippet}</p>
    </div>
  );
}
