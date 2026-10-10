"use client";

import { useRef, useState } from "react";
import { videoById, videos } from "../model/catalogue";
import { videoComments, type Comment } from "../model/corpus";
import { short, useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./youtube.module.css";

// A YouTube watch page around the real video, with related videos that are
// the other real ones. The reader comments and likes.

export default function YouTube({ keyword, video, sound }: WindowParams) {
  const current = videoById(video ?? "") ?? videos[0];
  const [comments, setComments] = useState<Comment[]>(() => videoComments(keyword));
  const [likes, setLikes] = useState(24000 + current.id.charCodeAt(0) * 37);
  const [liked, setLiked] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const input = useRef<HTMLInputElement>(null);

  useTitle(`${current.title} - YouTube`);
  const edit = (value: string) => { draftRef.current = value; setDraft(value); };
  const submit = () => {
    const text = draftRef.current.trim();
    if (!text) return;
    setComments((existing) => [{ id: `me-${Date.now()}`, author: "@jian_reads", age: "just now", text, likes: "0" }, ...existing]);
    edit("");
  };
  useHypeApi({
    focus: () => { input.current?.scrollIntoView({ block: "center", behavior: "smooth" }); input.current?.focus(); },
    type: (character) => edit(draftRef.current + character),
    submit,
    act: (name) => { if (name === "like" && !liked) { setLiked(true); setLikes((n) => n + 1); } },
  });
  const related = videos.filter((other) => other.id !== current.id);

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.start}><span className={styles.menu}>≡</span><a className={styles.logo} href="#"><span className={styles.play} /><strong>YouTube</strong><sup>KR</sup></a></div>
        <form className={styles.search} onSubmit={(event) => event.preventDefault()}><input defaultValue={keyword} aria-label="Search" /><button type="button" aria-label="Search" /></form>
        <div className={styles.end}><span className={styles.pill}>+ Create</span><span className={styles.bell} /><span className={styles.avatar}>J</span></div>
      </header>
      <div className={styles.layout}>
        <main className={styles.primary}>
          <div className={styles.player}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&mute=${sound ? 0 : 1}&playsinline=1&rel=0`} title={current.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
          <h1 className={styles.title}>{current.title}</h1>
          <div className={styles.row}>
            <div className={styles.channel}>
              <span className={styles.channelAvatar}>{current.channel[0]}</span>
              <div><strong>{current.channel} <i>✓</i></strong><span>{["4.6M", "2.1M", "812K", "1.3M", "398K"][current.id.charCodeAt(1) % 5]} subscribers</span></div>
              <button type="button" className={styles.subscribe}>Subscribe</button>
            </div>
            <div className={styles.actions}>
              <span className={liked ? styles.likedPill : styles.likePill}><b>Like</b> {short(likes)}<i /><b>Dislike</b></span>
              <span className={styles.action}>Share</span>
              <span className={styles.action}>Download</span>
              <span className={styles.action}>Clip</span>
              <span className={styles.more}>⋯</span>
            </div>
          </div>
          <div className={styles.description}>
            <strong>{current.views} · {current.age} · #{keyword.replace(/\s+/g, "")} #AI</strong>
            <p>Full conversation. Chapters below. {current.channel} on {keyword}, timelines, and what the next few years look like from the inside.</p>
            <span>...more</span>
          </div>
          <section className={styles.comments}>
            <div className={styles.commentsHead}><strong>{short(1842 + comments.length)} Comments</strong><span>Sort by</span></div>
            <div className={styles.composer}>
              <span className={styles.avatar}>J</span>
              <div>
                <input ref={input} value={draft} onChange={(event) => edit(event.target.value)} placeholder="Add a comment..." aria-label="Add a comment" />
                {draft ? <div className={styles.composerActions}><span onClick={() => edit("")}>Cancel</span><button type="button" onClick={submit}>Comment</button></div> : null}
              </div>
            </div>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <span className={styles.commentAvatar}>{comment.author[1]?.toUpperCase()}</span>
                <div>
                  <div className={styles.commentMeta}><strong>{comment.author}</strong><span>{comment.age}</span></div>
                  <p>{comment.text}</p>
                  <div className={styles.commentActions}><span>Like</span><span>{comment.likes}</span><span>Dislike</span><span>Reply</span></div>
                </div>
              </div>
            ))}
          </section>
        </main>
        <aside className={styles.secondary}>
          {related.map((other) => (
            <a key={other.id} className={styles.related} href={`https://www.youtube.com/watch?v=${other.id}`}>
              <span className={styles.thumb}><img src={`https://i.ytimg.com/vi/${other.id}/mqdefault.jpg`} alt="" /><em>{other.length}</em></span>
              <span className={styles.relatedText}><strong>{other.title}</strong><span>{other.channel}</span><span>{other.views} · {other.age}</span></span>
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
}
