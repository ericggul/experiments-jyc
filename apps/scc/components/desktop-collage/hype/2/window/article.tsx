"use client";

import { useRef, useState } from "react";
import { videoById, videos } from "../model/catalogue";
import { articleFor } from "../model/corpus";
import { short, useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./article.module.css";

// An article on Signal, an invented outlet in the grammar of a quality tech
// daily. The hero image is a real video's still.

type Comment = { id: string; author: string; age: string; text: string; likes: number };

const sections = ["Technology", "AI", "Markets", "Policy", "Science", "Culture", "Newsletters"];
const mostRead = (keyword: string) => [`The investors betting against the ${keyword} consensus`, `Why your bank suddenly has an ${keyword} strategy`, `A data centre the size of a town`, `The chip shortage nobody saw coming, again`, `What the ${keyword} job postings actually ask for`];

export default function Article({ keyword, video, seed }: WindowParams) {
  const article = articleFor(keyword);
  const still = videoById(video ?? "") ?? videos[seed % videos.length];
  const [comments, setComments] = useState<Comment[]>([
    { id: "c1", author: "hyunwoo.k", age: "2 h", text: `Good piece but it reads like every other ${keyword} piece this month.`, likes: 41 },
    { id: "c2", author: "marta_v", age: "1 h", text: `"The next keyword is already waiting" is the only line that matters.`, likes: 88 },
    { id: "c3", author: "dkim", age: "34 min", text: `${keyword} 기사 하루에 다섯 개씩 읽는데 다 같은 얘기`, likes: 12 },
  ]);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const input = useRef<HTMLTextAreaElement>(null);

  useTitle(`${article.headline} | Signal`);
  const edit = (value: string) => { draftRef.current = value; setDraft(value); };
  const submit = () => {
    const text = draftRef.current.trim();
    if (!text) return;
    setComments((current) => [{ id: `me-${Date.now()}`, author: "jian_reads", age: "now", text, likes: 0 }, ...current]);
    edit("");
  };
  useHypeApi({
    focus: () => { input.current?.scrollIntoView({ block: "center", behavior: "smooth" }); input.current?.focus(); },
    type: (character) => edit(draftRef.current + character),
    submit,
    act: (name) => { if (name === "like") setComments((current) => current.map((comment, index) => (index === 0 ? { ...comment, likes: comment.likes + 1 } : comment))); },
  });

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.bar}>
          <span className={styles.wordmark}>SIGNAL</span>
          <nav className={styles.nav}>{sections.map((section) => <a key={section} href="#" className={section === "AI" ? styles.current : undefined}>{section}</a>)}</nav>
          <div className={styles.account}><a href="#">Sign in</a><button type="button">Subscribe</button></div>
        </div>
      </header>
      <div className={styles.layout}>
        <article className={styles.article}>
          <div className={styles.kicker}>Technology · AI</div>
          <h1 className={styles.headline}>{article.headline}</h1>
          <p className={styles.standfirst}>{article.standfirst}</p>
          <div className={styles.byline}>
            <span className={styles.author} />
            <div><strong>By Mira Okafor</strong><br /><span>Technology correspondent</span></div>
            <div className={styles.date}>9 October 2026 · 6 min read</div>
            <div className={styles.share}><span>Share</span><span>Save</span><span>Gift</span></div>
          </div>
          <figure className={styles.hero}>
            <img src={`https://i.ytimg.com/vi/${still.id}/maxresdefault.jpg`} alt={still.title} />
            <figcaption>{still.channel}: {still.title}</figcaption>
          </figure>
          <div className={styles.body}>
            {article.body.map((paragraph, index) => (
              <div key={index}>
                <p className={index === 0 ? styles.first : undefined}>{paragraph}</p>
                {index === 1 ? <blockquote className={styles.pull}>{article.pull}</blockquote> : null}
                {index === 2 ? <aside className={styles.related}><span>Related</span>{article.related.slice(0, 2).map((title) => <a key={title} href="#">{title}</a>)}</aside> : null}
              </div>
            ))}
          </div>
          <div className={styles.newsletter}>
            <strong>The Signal AI briefing</strong>
            <span>Every weekday morning. What moved, who said it, and why your inbox is full of it.</span>
            <div><input placeholder="Email address" aria-label="Email address" /><button type="button">Sign up</button></div>
          </div>
          <section className={styles.comments}>
            <h2>Comments <span>({short(128 + comments.length)})</span></h2>
            <div className={styles.composer}>
              <span className={styles.avatar}>J</span>
              <textarea ref={input} value={draft} onChange={(event) => edit(event.target.value)} placeholder="Join the conversation" aria-label="Join the conversation" rows={2} />
              <button type="button" onClick={submit} disabled={!draft.trim()}>Post</button>
            </div>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <span className={styles.avatar}>{comment.author[0].toUpperCase()}</span>
                <div>
                  <div className={styles.commentMeta}><strong>{comment.author}</strong><span>{comment.age}</span></div>
                  <p>{comment.text}</p>
                  <div className={styles.commentActions}><span>Like · {comment.likes}</span><span>Reply</span><span>Report</span></div>
                </div>
              </div>
            ))}
          </section>
        </article>
        <aside className={styles.rail}>
          <h3>Most read</h3>
          <ol>{mostRead(keyword).map((title) => <li key={title}><a href="#">{title}</a></li>)}</ol>
          <div className={styles.promo}><span>Signal+</span><strong>Read without limits</strong><span>£1 a week for 12 weeks</span><button type="button">Subscribe</button></div>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span className={styles.wordmark}>SIGNAL</span>
        <span>© 2026 Signal Media Ltd · Privacy · Cookies · Terms · Contact</span>
      </footer>
    </div>
  );
}
