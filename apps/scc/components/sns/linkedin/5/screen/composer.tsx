"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type KeyboardEvent, type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { LinkedinIcon } from "./icons";
import styles from "./composer.module.css";

type Post = { body: string; media?: string; mediaType?: string };

export function ComposerDialog({ onClose, onPublish, initialMode }: { onClose: () => void; onPublish: (post: Post) => void; initialMode?: string }) {
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<Post | null>(null);
  const [audience, setAudience] = useState(initialMode === "connections" ? "Connections only" : "Anyone");
  const [comments, setComments] = useState("Anyone");
  const [menu, setMenu] = useState<"audience" | "comments" | "emoji" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const closeRef = useRef<() => void>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const hasDraft = Boolean(body.trim() || media);

  useEffect(() => {
    closeRef.current = () => { if (hasDraft) setConfirming(true); else onClose(); };
  }, [hasDraft, onClose]);

  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input:not([type="hidden"]):not([disabled])') ?? []);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); const last = items.at(-1); if (last) last.focus(); }
        else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); const first = items[0]; if (first) first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); opener.current?.focus(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestClose() { if (hasDraft) setConfirming(true); else onClose(); }
  function backdrop(event: MouseEvent<HTMLDivElement>) { if (event.target === event.currentTarget) requestClose(); }
  function addMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMedia({ body, media: URL.createObjectURL(file), mediaType: file.type });
    event.target.value = "";
  }
  function publish() { if (!hasDraft) return; onPublish({ body, ...(media ? { media: media.media, mediaType: media.mediaType } : {}) }); onClose(); }
  function keyMenu(event: KeyboardEvent<HTMLButtonElement>, value: string, kind: "audience" | "comments") { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (kind === "audience") setAudience(value); else setComments(value); setMenu(null); } }

  return <div className={styles.scrim} onMouseDown={backdrop} role="presentation">
    <section aria-labelledby={titleId} aria-modal="true" className={styles.dialog} ref={dialogRef} role="dialog">
      <button aria-label="Close composer" className={styles.close} onClick={requestClose} type="button"><LinkedinIcon name="close" /></button>
      <div className={styles.identity}>
        <img alt="Jeanyoon Choi" src="/images/sns/linkedin/2/viewer.jpg" />
        <div><strong id={titleId}>Jeanyoon Choi</strong><div className={styles.pills}>
          <button aria-expanded={menu === "audience"} onClick={() => setMenu(menu === "audience" ? null : "audience")} type="button"><span className={styles.eye}>◉</span> Post to {audience} <LinkedinIcon name="chevron" /></button>
          <button aria-expanded={menu === "comments"} onClick={() => setMenu(menu === "comments" ? null : "comments")} type="button">Comments: {comments} <LinkedinIcon name="chevron" /></button>
          <button type="button"><LinkedinIcon name="plus" /> Add collaborators</button>
        </div></div>
      </div>
      {menu === "audience" ? <OptionMenu label="Who can see this post" options={["Anyone", "Connections only"]} selected={audience} onKeyDown={(e, value) => keyMenu(e, value, "audience")} onSelect={(value) => { setAudience(value); setMenu(null); }} /> : null}
      {menu === "comments" ? <OptionMenu label="Who can comment" options={["Anyone", "Connections only", "No one"]} selected={comments} onKeyDown={(e, value) => keyMenu(e, value, "comments")} onSelect={(value) => { setComments(value); setMenu(null); }} /> : null}
      {showTip ? <div className={styles.notice}><div><span>Collaborative Posts are here! Team up to put your post in front of more people.</span><button type="button">Show me how</button></div><button aria-label="Dismiss collaborative posts notice" onClick={() => setShowTip(false)} type="button"><LinkedinIcon name="close" /></button></div> : null}
      <textarea aria-label="Share your thoughts" autoFocus onChange={(event) => setBody(event.target.value)} placeholder="Share your thoughts ..." value={body} />
      {media ? <div className={styles.preview}>{media.mediaType?.startsWith("video/") ? <video controls src={media.media} /> : <img alt="Selected upload preview" src={media.media} />}<button aria-label="Remove selected media" onClick={() => setMedia(null)} type="button"><LinkedinIcon name="close" /></button></div> : null}
      <div className={styles.tools}><button aria-expanded={menu === "emoji"} aria-label="Add emoji" onClick={() => setMenu(menu === "emoji" ? null : "emoji")} type="button"><LinkedinIcon name="smile" /></button><label aria-label="Add media"><LinkedinIcon name="image" /><input accept="image/*,video/*" onChange={addMedia} ref={inputRef} type="file" /></label><button aria-label="Celebrate an occasion" type="button">♟</button><button aria-label="More post options" type="button"><LinkedinIcon name="plus" /></button>{menu === "emoji" ? <div className={styles.emojis}>{["😀", "👏", "💡", "🎉", "❤️", "🔥"].map((emoji) => <button key={emoji} onClick={() => { setBody(`${body}${emoji}`); setMenu(null); }} type="button">{emoji}</button>)}</div> : null}</div>
      <footer><button aria-label="Post scheduling is unavailable in this local composer" className={styles.schedule} disabled title="Post scheduling is unavailable in this local composer" type="button">◷</button><button className={styles.post} disabled={!hasDraft} onClick={publish} type="button">Post</button></footer>
      {confirming ? <div className={styles.confirm} role="alertdialog" aria-label="Discard post?"><strong>Discard post?</strong><span>Your draft will be lost.</span><div><button onClick={() => setConfirming(false)} type="button">Keep editing</button><button onClick={onClose} type="button">Discard</button></div></div> : null}
    </section>
  </div>;
}

function OptionMenu({ label, options, selected, onSelect, onKeyDown }: { label: string; options: string[]; selected: string; onSelect: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, value: string) => void }) {
  return <div aria-label={label} className={styles.optionMenu} role="menu">{options.map((option) => <button aria-checked={option === selected} key={option} onClick={() => onSelect(option)} onKeyDown={(event) => onKeyDown(event, option)} role="menuitemradio" type="button"><i>{option === selected ? "✓" : ""}</i>{option}</button>)}</div>;
}
