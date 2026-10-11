"use client";

import { useState } from "react";
import { jobsFor } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./jobs.module.css";

// LinkedIn Jobs: a list of AI postings with "over 100 applicants" and a detail
// panel whose requirements are three years of a three-year-old field.

export default function Jobs({ keyword }: WindowParams) {
  const board = jobsFor(keyword);
  const [selected, setSelected] = useState(board.detail.id);
  const detail = board.jobs.find((job) => job.id === selected) ?? board.detail;
  useTitle(`${board.count} · ${board.query} Jobs | LinkedIn`);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navStart}><span className={styles.logo}>in</span><span className={styles.search}>{board.query}</span></div>
        <nav className={styles.navItems}>{["Home", "My Network", "Jobs", "Messaging", "Notifications", "Me"].map((item) => <span key={item} className={item === "Jobs" ? styles.navActive : undefined}><i />{item}</span>)}</nav>
      </header>
      <div className={styles.filters}>
        <span className={styles.chipActive}>Jobs</span>
        {["Date posted", "Experience level", "Company", "Remote", "Easy Apply", "All filters"].map((chip) => <span key={chip} className={styles.chip}>{chip} ▾</span>)}
      </div>
      <div className={styles.layout}>
        <aside className={styles.list}>
          <div className={styles.listHead}><strong>{board.query}</strong> in Seoul, South Korea<br /><span>{board.count}</span></div>
          {board.jobs.map((job) => (
            <div key={job.id} className={job.id === selected ? styles.cardActive : styles.card} onClick={() => setSelected(job.id)}>
              <span className={styles.logoBox}>{job.company[0]}</span>
              <div>
                <strong>{job.title}</strong>
                <span>{job.company}</span>
                <span className={styles.muted}>{job.place}</span>
                {job.id === "j12" ? <span className={styles.none}>No entry-level postings match your profile</span> : <span className={styles.meta}>{job.promoted ? "Promoted · " : ""}{job.easy ? "Easy Apply · " : ""}{job.applicants}</span>}
              </div>
            </div>
          ))}
        </aside>
        <main className={styles.detail}>
          <h1>{detail.title}</h1>
          <div className={styles.detailMeta}>{detail.company} · {detail.place} · {detail.posted || "Reposted"} · <b>{detail.applicants}</b></div>
          <div className={styles.tags}>{detail.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className={styles.actions}><button type="button" className={styles.apply}>{detail.easy ? "Easy Apply" : "Apply"}</button><button type="button" className={styles.save}>Save</button></div>
          {keyword === "CS graduates" ? <div className={styles.banner}>Entry level · 0 results. Try <a href="#">Associate</a> or <a href="#">Mid-Senior</a>.</div> : null}
          <h2>About the job</h2>
          <p>{board.about}</p>
          <h2>Requirements</h2>
          <ul>{board.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
          <h2>About the company</h2>
          <p>{detail.company} is building the AI layer for its industry. 120 employees, growing 40% a year, no entry-level roles at this time.</p>
        </main>
      </div>
    </div>
  );
}
