"use client";

import { useRef, useState } from "react";
import { adCopy } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./ad.module.css";

// A landing page in the grammar of a growth-stage SaaS site: promo bar,
// hero, logos, stats, features, testimonial, pricing, cookie banner, and a
// support chat bubble. The reader writes into the chat; liking accepts the cookies.

const logos = ["Nordlake", "Fintly", "Orbital", "Hexa", "Kumo", "Veldt"];

export default function Ad({ keyword }: WindowParams) {
  const copy = adCopy(keyword);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; mine: boolean; text: string }[]>([{ id: "hello", mine: false, text: `Hi! Questions about ${copy.brand}? We usually reply in a few minutes.` }]);
  const [draft, setDraft] = useState("");
  const [cookies, setCookies] = useState(true);
  const draftRef = useRef("");
  const input = useRef<HTMLInputElement>(null);

  useTitle(`${copy.brand} — ${copy.headline}`);
  const edit = (value: string) => { draftRef.current = value; setDraft(value); };
  const submit = () => {
    const text = draftRef.current.trim();
    if (!text) return;
    const id = `me-${Date.now()}`;
    setMessages((current) => [...current, { id, mine: true, text }]);
    edit("");
    window.setTimeout(() => setMessages((current) => [...current, { id: `${id}-reply`, mine: false, text: "Thanks! A specialist will reply shortly. Meanwhile, the free trial takes about a minute to start." }]), 1400);
  };
  useHypeApi({
    focus: () => { setChatOpen(true); window.setTimeout(() => input.current?.focus(), 50); },
    type: (character) => edit(draftRef.current + character),
    submit,
    act: (name) => { if (name === "like") setCookies(false); },
  });

  return (
    <div className={styles.page}>
      <div className={styles.promo}><span>{copy.deadline}</span><a href="#pricing">{copy.cta} →</a></div>
      <header className={styles.nav}>
        <span className={styles.brand}><i />{copy.brand}</span>
        <nav><a href="#">Product</a><a href="#pricing">Pricing</a><a href="#">Customers</a><a href="#">Docs</a><a href="#">Blog</a></nav>
        <div><a href="#">Log in</a><button type="button">{copy.cta}</button></div>
      </header>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.headline}</h1>
          <p>{copy.sub}</p>
          <div className={styles.ctas}><button type="button" className={styles.primary}>{copy.cta}</button><button type="button" className={styles.secondary}>{copy.secondary}</button></div>
          <small>No credit card required · Cancel anytime</small>
        </div>
        <div className={styles.shot}>
          <div className={styles.shotBar}><i /><i /><i /></div>
          <div className={styles.shotBody}>
            <div className={styles.shotSide}>{[1, 2, 3, 4, 5].map((n) => <span key={n} style={{ width: `${40 + n * 9}%` }} />)}</div>
            <div className={styles.shotMain}>
              <div className={styles.shotCards}>{copy.stat.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
              <div className={styles.shotChart}>{[34, 48, 41, 62, 70, 66, 84, 91].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.logos}><span>Trusted by teams at</span>{logos.map((logo) => <b key={logo}>{logo}</b>)}</section>
      <section className={styles.stats}>{copy.stat.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
      <section className={styles.features}>
        <h2>Everything you need, nothing you don&apos;t</h2>
        <div>{copy.bullets.map((bullet, index) => <div key={bullet} className={styles.feature}><i>{index + 1}</i><strong>{bullet}</strong><span>Set up once. It keeps working while you do something else, which is the point.</span></div>)}</div>
      </section>
      <section className={styles.quote}><blockquote>“{copy.quote}”</blockquote><cite>{copy.who}</cite></section>
      <section id="pricing" className={styles.pricing}>
        <div className={styles.card}>
          <span>Pro</span>
          <div className={styles.price}><strong>{copy.price}</strong>{copy.was ? <s>{copy.was}</s> : null}<em>/ month</em></div>
          <ul>{copy.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          <button type="button" className={styles.primary}>{copy.cta}</button>
          <small>{copy.deadline}</small>
        </div>
      </section>
      <footer className={styles.footer}><span className={styles.brand}><i />{copy.brand}</span><span>© 2026 {copy.brand}, Inc. · Privacy · Terms · Security · Status</span></footer>

      {cookies ? (
        <div className={styles.cookies}>
          <span>We use cookies to improve your experience, analyse traffic and show you relevant offers. <a href="#">Cookie policy</a></span>
          <div><button type="button" onClick={() => setCookies(false)}>Manage</button><button type="button" className={styles.primary} onClick={() => setCookies(false)}>Accept all</button></div>
        </div>
      ) : null}
      <div className={styles.chat}>
        {chatOpen ? (
          <div className={styles.chatPanel}>
            <div className={styles.chatHead}><span className={styles.agent} /><div><strong>{copy.brand} team</strong><span>Typically replies in a few minutes</span></div><i onClick={() => setChatOpen(false)}>✕</i></div>
            <div className={styles.chatBody}>{messages.map((message) => <p key={message.id} className={message.mine ? styles.mine : styles.theirs}>{message.text}</p>)}</div>
            <form className={styles.chatInput} onSubmit={(event) => { event.preventDefault(); submit(); }}><input ref={input} value={draft} onChange={(event) => edit(event.target.value)} placeholder="Write a message..." aria-label="Write a message" /><button type="submit" aria-label="Send">➤</button></form>
          </div>
        ) : null}
        <button type="button" className={styles.bubble} onClick={() => setChatOpen((open) => !open)} aria-label="Chat">{chatOpen ? "⌄" : "💬"}</button>
      </div>
    </div>
  );
}
