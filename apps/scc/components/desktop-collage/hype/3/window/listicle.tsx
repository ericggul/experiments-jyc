"use client";

import { listicleFor } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./listicle.module.css";

// A numbered list on Medium: the genre of "is your job on the list".

export default function Listicle({ keyword }: WindowParams) {
  const list = listicleFor(keyword);
  useTitle(`${list.title} | by ${list.author} | Medium`);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <span className={styles.wordmark}>Medium</span>
        <span className={styles.search}>Search</span>
        <div className={styles.navEnd}><span>Write</span><span className={styles.bell} /><span className={styles.avatar}>J</span></div>
      </header>
      <article className={styles.article}>
        <h1>{list.title}</h1>
        <p className={styles.sub}>{list.sub}</p>
        <div className={styles.author}>
          <span className={styles.authorAvatar}>{list.author[0]}</span>
          <div><strong>{list.author}</strong> <span className={styles.follow}>· Follow</span><br /><span>Published in <b>The Startup</b> · {list.read} · Oct 8, 2026</span></div>
        </div>
        <div className={styles.bar}><span>{list.claps} claps</span><span>412 comments</span><span className={styles.barEnd}>Save · Share · ···</span></div>
        <p className={styles.lead}>Every quarter there is a new version of this list. This is the one people are forwarding this week. Read to the end before you decide whether to worry; the ranking matters less than the direction.</p>
        {list.items.map((item, index) => (
          <section key={item.title} className={styles.item}>
            <h2>{index + 1}. {item.title}</h2>
            <span className={styles.figure}>{item.figure}</span>
            <p>{item.blurb}</p>
          </section>
        ))}
        <p className={styles.outro}>{list.outro}</p>
        <div className={styles.tags}>{["AI", "Future Of Work", "Careers", "Technology", "Layoffs"].map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className={styles.more}>
          <h3>More from {list.author}</h3>
          {["What I learned from 1,000 job postings that said AI", "The quiet way companies stop hiring", "Nobody knows what AGI means and it does not matter"].map((title) => <a key={title} href="#"><strong>{title}</strong><span>{list.author} · 6 min read</span></a>)}
        </div>
      </article>
      <div className={styles.sticky}><span>{list.claps}</span><span>412</span><span className={styles.stickyEnd}>Save</span></div>
    </div>
  );
}
