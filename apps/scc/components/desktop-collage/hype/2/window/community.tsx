"use client";

import { communityFor } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./community.module.css";

// An anonymous workplace community post, in Blind's grammar: company badge,
// anonymous author, counts, comments with company badges.

export default function Community({ keyword }: WindowParams) {
  const post = communityFor(keyword);
  useTitle(`${post.title} | 블라인드`);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <span className={styles.wordmark}>blind</span>
        <nav>{["홈", "토픽", "채용", "회사리뷰", "연봉"].map((item, index) => <span key={item} className={index === 1 ? styles.navActive : undefined}>{item}</span>)}</nav>
        <span className={styles.me} />
      </header>
      <div className={styles.layout}>
        <main className={styles.post}>
          <div className={styles.topic}>토픽 · 개발자 · AI</div>
          <h1>{post.title}</h1>
          <div className={styles.author}><span className={styles.badge}>{post.company}</span><span>{post.author}</span><span>· {post.age}</span></div>
          <div className={styles.body}>{post.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <div className={styles.counts}><span>좋아요 {post.likes}</span><span>댓글 {post.comments.length * 18 + 4}</span><span>공유</span></div>
          <section className={styles.comments}>
            {post.comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.commentHead}><span className={styles.badge}>{comment.company}</span><span>익명</span></div>
                <p>{comment.text}</p>
                <div className={styles.commentActions}><span>좋아요 {comment.likes}</span><span>답글</span></div>
              </div>
            ))}
            <div className={styles.composer}><span className={styles.badge}>익명</span><input placeholder="댓글을 남겨주세요" aria-label="댓글" /><button type="button">등록</button></div>
          </section>
        </main>
        <aside className={styles.side}>
          <h3>지금 인기 글</h3>
          {post.related.map((item) => <a key={item.title} href="#"><span className={styles.badge}>{item.company}</span><strong>{item.title}</strong><em>{item.count}</em></a>)}
          <div className={styles.promo}><strong>내 회사 연봉, 다른 회사는?</strong><span>AI 직군 연봉 데이터 12,804건</span></div>
        </aside>
      </div>
    </div>
  );
}
