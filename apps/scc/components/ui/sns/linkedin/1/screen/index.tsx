"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  linkedinMember,
  linkedinNews,
  linkedinPosts,
  repeatLinkedinPosts,
  linkedinSuggestions,
  linkedinViewer,
} from "../model/data";
import type { LinkedinPost } from "../model/types";
import { LinkedinIcon } from "./icons";
import { LinkedinJobsScreen } from "./jobs";
import styles from "./linkedin.module.css";

type NavItem = "home" | "network" | "jobs" | "messaging" | "notifications";

const navigation: { id: NavItem; icon: "home" | "network" | "briefcase" | "message" | "bell"; label: string }[] = [
  { id: "home", icon: "home", label: "Home" },
  { id: "network", icon: "network", label: "My Network" },
  { id: "jobs", icon: "briefcase", label: "Jobs" },
  { id: "messaging", icon: "message", label: "Messaging" },
  { id: "notifications", icon: "bell", label: "Notifications" },
];

function Avatar({ alt, className, src }: { alt: string; className?: string; src: string }) {
  return <Image alt={alt} className={`${styles.avatar} ${className ?? ""}`} height={88} src={src} width={88} />;
}

function LinkedinMark() {
  return <span aria-label="LinkedIn" className={styles.mark}><i>in</i><b>Linked</b></span>;
}

function TopBar({
  activeNav,
  onNavigate,
  onSearch,
  query,
}: {
  activeNav: NavItem;
  onNavigate: (view: NavItem) => void;
  onSearch: (value: string) => void;
  query: string;
}) {
  return (
    <header className={styles.topBar}>
      <div className={styles.topInner}>
        <button aria-label="Open profile" className={styles.mobileProfile} type="button"><Avatar alt="Jiyoon Park" src={linkedinViewer.avatar} /></button>
        <button aria-label="LinkedIn home" className={styles.brandButton} onClick={() => onNavigate("home")} type="button"><LinkedinMark /></button>
        <label className={styles.searchBox}><LinkedinIcon name="search" /><input aria-label="Search" onChange={(event) => onSearch(event.target.value)} placeholder="Search" type="search" value={query} /></label>
        <nav aria-label="Primary navigation" className={styles.primaryNav}>
          {navigation.map((item) => (
            <button aria-current={activeNav === item.id ? "page" : undefined} className={activeNav === item.id ? styles.activeNav : ""} key={item.id} onClick={() => onNavigate(item.id)} type="button">
              <span className={styles.navIcon}><LinkedinIcon name={item.icon} />{item.id === "notifications" ? <i>3</i> : null}</span><span>{item.label}</span>
            </button>
          ))}
          <button className={styles.meMenu} type="button"><Avatar alt="Jiyoon Park" src={linkedinViewer.avatar} /><span>Me <LinkedinIcon name="chevron" /></span></button>
          <button className={styles.businessMenu} type="button"><span className={styles.gridGlyph}>▪▪<br />▪▪</span><span>For Business <LinkedinIcon name="chevron" /></span></button>
          <button className={styles.premiumLink} type="button">Try Premium for $0</button>
        </nav>
        <button aria-label="Messages" className={styles.mobileMessage} onClick={() => onNavigate("messaging")} type="button"><LinkedinIcon name="message" /></button>
      </div>
    </header>
  );
}

function LeftRail() {
  return (
    <aside className={styles.leftRail}>
      <section className={`${styles.card} ${styles.profileCard}`}>
        <div className={styles.profileCover} />
        <Avatar alt="Jiyoon Park" className={styles.viewerAvatar} src={linkedinViewer.avatar} />
        <button className={styles.profileIdentity} type="button"><strong>{linkedinViewer.name}</strong><span>{linkedinViewer.headline}</span></button>
        <button className={styles.profileMetric} type="button"><span>Profile viewers</span><b>97</b></button>
        <button className={styles.profileMetric} type="button"><span>Post impressions</span><b>1,346</b></button>
        <button className={styles.premiumRow} type="button"><span>Grow your career with Premium</span><b><i /> Try for $0</b></button>
        <button className={styles.savedRow} type="button">▣&nbsp; Saved items</button>
      </section>
      <section className={`${styles.card} ${styles.recentCard}`}>
        <button type="button">Recent</button>
        <button type="button"># design systems</button>
        <button type="button"># service design</button>
        <button type="button"># product strategy</button>
        <button className={styles.groupTitle} type="button">Groups</button>
        <button type="button">Designers in Seoul</button>
        <button className={styles.groupTitle} type="button">Events</button>
        <button type="button">+ Create event</button>
      </section>
    </aside>
  );
}

function Composer({ onOpen }: { onOpen: () => void }) {
  return (
    <section className={`${styles.card} ${styles.composer}`}>
      <div><Avatar alt="Jiyoon Park" src={linkedinViewer.avatar} /><button onClick={onOpen} type="button">Start a post</button></div>
      <nav aria-label="Create a post"><button onClick={onOpen} type="button"><LinkedinIcon name="image" /><span>Media</span></button><button onClick={onOpen} type="button"><LinkedinIcon name="calendar" /><span>Event</span></button><button onClick={onOpen} type="button"><LinkedinIcon name="write" /><span>Write article</span></button></nav>
    </section>
  );
}

function ReactionDots() {
  return <span className={styles.reactionDots}><i>●</i><b>●</b><em>♥</em></span>;
}

function PostCard({
  liked,
  onComment,
  onLike,
  onRepost,
  onSend,
  post,
  reposted,
}: {
  liked: boolean;
  onComment: () => void;
  onLike: () => void;
  onRepost: () => void;
  onSend: () => void;
  post: LinkedinPost;
  reposted: boolean;
}) {
  const author = linkedinMember(post.authorId);
  const reactionTotal = post.reactions + (liked ? 1 : 0);
  const repostTotal = post.reposts + (reposted ? 1 : 0);
  return (
    <article className={`${styles.card} ${styles.postCard}`}>
      {post.context ? <button className={styles.contextRow} type="button"><LinkedinIcon name="network" /> {post.context} <LinkedinIcon name="dots" /></button> : null}
      <header className={styles.postHeader}>
        <Avatar alt={author.name} src={author.avatar} />
        <button className={styles.authorMeta} type="button"><strong>{author.name} <span>• {post.audience}</span></strong><span>{author.headline}</span><span>{post.published} <i>•</i> ◉</span></button>
        <button aria-label={`More options for ${author.name}'s post`} className={styles.moreButton} type="button"><LinkedinIcon name="dots" /></button>
      </header>
      <p className={styles.postBody}>{post.body}</p>
      {post.image ? <div className={styles.postMedia}><Image alt={post.imageAlt ?? ""} fill sizes="(max-width: 760px) 100vw, 555px" src={post.image} /></div> : null}
      {post.link ? <button className={styles.linkPreview} type="button"><div><strong>{post.link.title}</strong><span>{post.link.description}</span><small>{post.link.source}</small></div></button> : null}
      <div className={styles.engagement}><span><ReactionDots /> {reactionTotal.toLocaleString()}</span><button type="button">{post.comments + (liked ? 0 : 0)} comments <i>•</i> {repostTotal} reposts</button></div>
      <div className={styles.postActions}>
        <button className={liked ? styles.liked : ""} onClick={onLike} type="button"><LinkedinIcon name="like" solid={liked} /><span>{liked ? "Like" : "Like"}</span></button>
        <button onClick={onComment} type="button"><LinkedinIcon name="comment" /><span>Comment</span></button>
        <button className={reposted ? styles.liked : ""} onClick={onRepost} type="button"><LinkedinIcon name="repost" /><span>Repost</span></button>
        <button onClick={onSend} type="button"><LinkedinIcon name="send" /><span>Send</span></button>
      </div>
    </article>
  );
}

function RightRail({ onConnect }: { onConnect: (name: string) => void }) {
  return (
    <aside className={styles.rightRail}>
      <section className={`${styles.card} ${styles.newsCard}`}><header><h2>LinkedIn News</h2><button aria-label="News information" type="button">i</button></header><p>Top stories</p><ol>{linkedinNews.map((item) => <li key={item.id}><button type="button"><strong>{item.headline}</strong><span>{item.readers}</span></button></li>)}</ol><button className={styles.showMoreNews} type="button">Show more <LinkedinIcon name="chevron" /></button></section>
      <section className={`${styles.card} ${styles.suggestionsCard}`}><header><h2>People you may know</h2><button aria-label="More suggestions" type="button"><LinkedinIcon name="dots" /></button></header>{linkedinSuggestions.slice(0, 3).map((suggestion) => { const member = linkedinMember(suggestion.memberId); return <article key={suggestion.id}><Avatar alt={member.name} src={member.avatar} /><div><strong>{member.name}</strong><span>{member.headline}</span><small>{member.mutuals}</small><button onClick={() => onConnect(member.name)} type="button"><LinkedinIcon name="plus" /> Connect</button></div></article>; })}<button className={styles.showMoreNews} type="button">Show more <LinkedinIcon name="chevron" /></button></section>
      <section className={`${styles.card} ${styles.puzzleCard}`}><span>Today’s puzzles</span><strong>Take a quick break with your network</strong><div><button type="button">Queens</button><button type="button">Zip</button><button type="button">Tango</button></div></section>
    </aside>
  );
}

function MessageDock({ onSend }: { onSend: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    onSend("Message sent");
    setMessage("");
  }

  return <section className={`${styles.messageDock} ${open ? styles.messageDockOpen : ""}`}><header><button onClick={() => setOpen((value) => !value)} type="button"><LinkedinIcon name="message" /><span>Messaging</span><b>2</b></button><span><button aria-label="More messaging options" type="button"><LinkedinIcon name="dots" /></button><button aria-label="Open composer" type="button"><LinkedinIcon name="write" /></button><button aria-label="Minimize messages" onClick={() => setOpen((value) => !value)} type="button"><LinkedinIcon name="chevron" /></button></span></header>{open ? <div className={styles.messageBody}>{chat ? <><button className={styles.backToInbox} onClick={() => setChat(false)} type="button">‹&nbsp; Messages</button><div className={styles.chatPerson}><Avatar alt="Maria Chen" src={linkedinMember("maria").avatar} /><strong>Maria Chen</strong><span>Active now</span></div><div className={styles.chatBubbles}><p>Thanks for sharing the notes — especially the part about decisions.</p><p>Of course. I’m glad it was useful.</p></div><form onSubmit={submit}><input aria-label="Write a message" onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" value={message} /><button aria-label="Send message" type="submit"><LinkedinIcon name="send" /></button></form></> : <>{["Maria Chen", "Eunseo Lee", "Atelier Haze"].map((name, index) => <button className={styles.messageThread} key={name} onClick={() => setChat(true)} type="button"><Avatar alt="" src={index === 0 ? linkedinMember("maria").avatar : index === 1 ? linkedinViewer.avatar : linkedinMember("hale").avatar} /><span><strong>{name}</strong><em>{index === 0 ? "Thanks for sharing the notes..." : index === 1 ? "You: I’ll send it today." : "New role: Interaction Designer"}</em></span><small>{index === 0 ? "9:41 AM" : "Yesterday"}</small></button>)}</>}</div> : null}</section>;
}

function MobileNav({ activeNav, onNavigate, onPost }: { activeNav: NavItem; onNavigate: (view: NavItem) => void; onPost: () => void }) {
  const beforeCreate = [navigation[0], navigation[1]];
  const afterCreate = [navigation[4], navigation[2]];
  const itemButton = (item: (typeof navigation)[number]) => <button aria-current={activeNav === item.id ? "page" : undefined} className={activeNav === item.id ? styles.activeMobileNav : ""} key={item.id} onClick={() => onNavigate(item.id)} type="button"><span><LinkedinIcon name={item.icon} />{item.id === "notifications" ? <i /> : null}</span><small>{item.label === "My Network" ? "Network" : item.label}</small></button>;
  return <nav aria-label="Mobile navigation" className={styles.mobileNav}>{beforeCreate.map(itemButton)}<button aria-label="Create post" className={styles.mobileCreate} onClick={onPost} type="button"><LinkedinIcon name="plus" /></button>{afterCreate.map(itemButton)}</nav>;
}

function PostDialog({ onClose, onPublish }: { onClose: () => void; onPublish: () => void }) {
  const [draft, setDraft] = useState("");
  return <div className={styles.dialogScrim} onMouseDown={onClose} role="presentation"><section aria-label="Create a post" className={styles.postDialog} onMouseDown={(event) => event.stopPropagation()} role="dialog"><header><button aria-label="Close" onClick={onClose} type="button">×</button><strong>Create a post</strong></header><div className={styles.dialogIdentity}><Avatar alt="Jiyoon Park" src={linkedinViewer.avatar} /><span><b>{linkedinViewer.name}</b><button type="button">◉ Anyone <LinkedinIcon name="chevron" /></button></span></div><textarea aria-label="What do you want to talk about?" autoFocus onChange={(event) => setDraft(event.target.value)} placeholder="What do you want to talk about?" value={draft} /><footer><span><button aria-label="Add media" type="button"><LinkedinIcon name="image" /></button><button aria-label="Add video" type="button"><LinkedinIcon name="video" /></button><button aria-label="Add event" type="button"><LinkedinIcon name="calendar" /></button><button aria-label="More options" type="button"><LinkedinIcon name="dots" /></button></span><button disabled={!draft.trim()} onClick={onPublish} type="button">Post</button></footer></section></div>;
}

export default function LinkedinOneScreen() {
  const [activeNav, setActiveNav] = useState<NavItem>("home");
  const [composerOpen, setComposerOpen] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<"Top" | "Recent">("Top");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [visiblePostCount, setVisiblePostCount] = useState(6);

  const posts = useMemo(() => {
    const matching = search.trim().toLowerCase();
    const source = sort === "Recent" ? [...linkedinPosts].reverse() : linkedinPosts;
    const eligible = matching ? source.filter((post) => `${linkedinMember(post.authorId).name} ${post.body}`.toLowerCase().includes(matching)) : source;
    return repeatLinkedinPosts(eligible, visiblePostCount, `${sort.toLowerCase()}-${matching || "feed"}`);
  }, [search, sort, visiblePostCount]);

  useEffect(() => {
    const extend = () => {
      if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 920) {
        setVisiblePostCount((count) => count + 6);
      }
    };
    window.addEventListener("scroll", extend, { passive: true });
    return () => window.removeEventListener("scroll", extend);
  }, []);

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function publish() {
    setComposerOpen(false);
    announce("Post published");
  }

  function toggleSort() {
    setSort((value) => value === "Top" ? "Recent" : "Top");
    setVisiblePostCount(6);
  }

  return <main className={styles.linkedinShell}>
    <TopBar activeNav={activeNav} onNavigate={(view) => { setActiveNav(view); if (view !== "home") announce(`${navigation.find((item) => item.id === view)?.label} selected`); }} onSearch={(value) => { setSearch(value); setVisiblePostCount(6); }} query={search} />
    {activeNav === "jobs" ? <LinkedinJobsScreen onQueryChange={setSearch} onToast={announce} query={search} /> : <div className={styles.pageGrid}>
      <LeftRail />
      <section className={styles.feed} aria-label="LinkedIn feed">
        <Composer onOpen={() => setComposerOpen(true)} />
        <div className={styles.sortRow}><i /><button onClick={toggleSort} type="button">Sort by: <b>{sort}</b> <LinkedinIcon name="chevron" /></button></div>
        {posts.length ? posts.map((entry) => <PostCard liked={Boolean(liked[entry.id])} key={entry.id} onComment={() => announce("Comment box opened")} onLike={() => setLiked((current) => ({ ...current, [entry.id]: !current[entry.id] }))} onRepost={() => setReposted((current) => ({ ...current, [entry.id]: !current[entry.id] }))} onSend={() => announce("Share options opened")} post={entry.post} reposted={Boolean(reposted[entry.id])} />) : <section className={`${styles.card} ${styles.emptyFeed}`}><strong>No posts found</strong><span>Try another search.</span></section>}
      </section>
      <RightRail onConnect={(name) => announce(`Invitation sent to ${name}`)} />
    </div>}
    <MessageDock onSend={announce} />
    <MobileNav activeNav={activeNav} onNavigate={setActiveNav} onPost={() => setComposerOpen(true)} />
    {composerOpen ? <PostDialog onClose={() => setComposerOpen(false)} onPublish={publish} /> : null}
    {toast ? <div aria-live="polite" className={styles.toast}>{toast}</div> : null}
  </main>;
}
