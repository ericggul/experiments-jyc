"use client";

import { useEffect, useRef, useState } from "react";
import { slackMessages, type SlackMessage } from "../model/corpus";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";
import styles from "./slack.module.css";

// A Slack desktop channel in the aubergine theme: rail, sidebar, channel,
// composer. The reader's messages arrive as the member "지안".

const channels = ["general", "ai-general", "eng", "hype-watch", "random", "investing"];
const people = ["민준", "서연", "도윤", "하은"];
const ME = { author: "지안", initials: "ㅈ", tone: "#7c3085" };
const tools = ["B", "I", "S", "<>", "•", "1.", "❝"];

export default function Slack({ keyword }: WindowParams) {
  const [messages, setMessages] = useState<SlackMessage[]>(() => slackMessages(keyword));
  const [draft, setDraft] = useState("");
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const draftRef = useRef("");
  const latest = useRef(messages);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useTitle("#ai-general - Goldfish Labs - Slack");
  useEffect(() => { latest.current = messages; end.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const edit = (value: string) => { draftRef.current = value; setDraft(value); };
  const submit = () => {
    const text = draftRef.current.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setMessages((current) => [...current, { id: `me-${Date.now()}`, ...ME, time, text }]);
    edit("");
  };
  useHypeApi({
    focus: () => input.current?.focus(),
    type: (character) => edit(draftRef.current + character),
    submit,
    act: (name) => {
      if (name !== "like") return;
      const last = latest.current[latest.current.length - 1];
      if (last) setReactions((current) => ({ ...current, [last.id]: (current[last.id] ?? 0) + 1 }));
    },
  });

  return (
    <div className={styles.app}>
      <div className={styles.top}>
        <div className={styles.history}>‹ ›</div>
        <div className={styles.search}>Search Goldfish Labs</div>
        <div className={styles.me} style={{ background: ME.tone }}>{ME.initials}</div>
      </div>
      <div className={styles.body}>
        <aside className={styles.rail}>
          <div className={styles.workspace}>GL</div>
          {["Home", "DMs", "Activity", "Later", "More"].map((item, index) => <div key={item} className={index === 0 ? styles.railActive : styles.railItem}><span /><small>{item}</small></div>)}
        </aside>
        <nav className={styles.sidebar}>
          <div className={styles.workspaceName}>Goldfish Labs <span>▾</span></div>
          <div className={styles.group}>Channels</div>
          {channels.map((channel) => <div key={channel} className={channel === "ai-general" ? styles.active : styles.item}><span className={styles.hash}>#</span> {channel}</div>)}
          <div className={styles.group}>Direct messages</div>
          {people.map((person) => <div key={person} className={styles.item}><span className={styles.dot} /> {person}</div>)}
          <div className={styles.group}>Apps</div>
          <div className={styles.item}><span className={styles.bot} /> Slackbot</div>
        </nav>
        <main className={styles.main}>
          <header className={styles.header}>
            <strong># ai-general</strong>
            <span>12 members · 요즘 {keyword} 얘기만 하는 곳</span>
          </header>
          <div className={styles.messages}>
            <div className={styles.divider}><span>Today</span></div>
            {messages.map((message) => (
              <div key={message.id} className={styles.message}>
                <div className={styles.avatar} style={{ background: message.tone }}>{message.initials}</div>
                <div className={styles.content}>
                  <div className={styles.meta}><strong>{message.author}</strong><time>{message.time}</time></div>
                  <div className={styles.text}>{message.text}</div>
                  {message.link ? (
                    <a className={styles.unfurl} href={message.link.url}>
                      <span>{message.link.site}</span>
                      <strong>{message.link.title}</strong>
                    </a>
                  ) : null}
                  {reactions[message.id] ? <div className={styles.reaction}>👍 {reactions[message.id]}</div> : null}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className={styles.composer}>
            <div className={styles.tools}>{tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
            <textarea ref={input} value={draft} onChange={(event) => edit(event.target.value)} placeholder="Message #ai-general" rows={1} aria-label="Message #ai-general" />
            <div className={styles.actions}>
              <span>＋</span><span>Aa</span><span>@</span><span>☺</span>
              <button type="button" onClick={submit} className={draft.trim() ? styles.send : styles.sendIdle} aria-label="Send">➤</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
