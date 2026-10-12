'use client';
/* eslint-disable @next/next/no-img-element -- A bounded visual prototype with directly sourced Unsplash photos. */
import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { people, seedPosts, trends, type Person, type Post } from '../model/data';
import { compact, fullTime, shortTime, ageMinutes } from './format';
import { Icon, Verified, XLogo, type IconName } from './icons';
import s from './app.module.css';

type Kind = 'home' | 'explore' | 'grok' | 'notifications' | 'chat' | 'bookmarks' | 'communities' | 'profile' | 'post';
type View = { kind: Kind; id?: string; scroll?: number };
type Sheet = { kind: 'repost' | 'share' | 'more' | 'for-you' | 'following'; postId?: string } | null;
type Composer = { parentId?: string; quoteId?: string } | null;
type FeedTab = 'for-you' | 'following' | 'city' | 'culture' | 'everyday';
type Community = 'city' | 'culture' | 'everyday';

const LOCAL = 'Not available in this local prototype';
const streams: Record<Community, string[]> = {
 city:['atlas','owen','mar','yasmin','nora'],
 culture:['ravi','mika','felix','ana','hana','leah'],
 everyday:['imani','sol','dev','bee','field','sam'],
};
const feedTabs: { id: FeedTab; label: string }[] = [
 { id:'for-you', label:'For you' }, { id:'following', label:'Following' },
 { id:'city', label:'Cities' }, { id:'culture', label:'Culture' }, { id:'everyday', label:'Everyday' },
];
const exploreTabs = [
 { id:'for-you', label:'For You' }, { id:'trending', label:'Trending' }, { id:'news', label:'News' },
 { id:'sports', label:'Sports' }, { id:'entertainment', label:'Entertainment' },
] as const;
type ExploreTab = typeof exploreTabs[number]['id'];
const exploreFilter: Record<ExploreTab, (category: string) => boolean> = {
 'for-you':() => true, trending:c => c.startsWith('Trending'), news:c => /Weather|New York|United States/.test(c),
 sports:c => c.startsWith('Sports'), entertainment:c => /Music|Gaming/.test(c),
};
// A local mention of the signed-in account, kept out of the seed so the fixture counts stay as documented.
const mention: Post = { id:'m1', authorId:'leah', time:'3h', text:'@mayachen I thought you might like this conversation about maps and memory.', replies:1, reposts:0, likes:9, views:'412', parentId:'p7' };
const chats = [
 { id:'nora', time:'2h', opener:'The street sign photo you sent was useful. I’m taking another look today.' },
 { id:'ravi', time:'1d', opener:'Did you find the book?' },
 { id:'sam', time:'Oct 8', opener:'How was the walk?' },
];

const person = (id: string) => people.find(p => p.id === id) ?? people[0];
const me = people[0];
const nonZero = (n: number) => n ? compact(n) : '';
const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };

function Avatar({ user, size = 40, onClick }: { user: Person; size?: number; onClick?: () => void }) {
 const img = <img src={user.avatar} alt="" width={size} height={size} className={`${s.avatar} ${user.verified === 'gold' ? s.square : ''}`} style={{ width:size, height:size }}/>;
 return onClick ? <button type="button" className={s.avatarButton} onClick={stop(onClick)} aria-label={`Open ${user.name}'s profile`}>{img}</button> : img;
}

function Name({ user, big = false }: { user: Person; big?: boolean }) {
 return <span className={`${s.name} ${big ? s.nameBig : ''}`}><strong>{user.name}</strong>{user.verified && <Verified tone={user.verified}/>}</span>;
}

export default function XMobile() {
  // Several phones can share one page (`/mobiles/2`), so the composer's submit button finds its own form.
  const composeId = useId();
 const [view, setView] = useState<View>({ kind:'home' });
 const [history, setHistory] = useState<View[]>([]);
 const [feed, setFeed] = useState<FeedTab>('for-you');
 const [followingSort, setFollowingSort] = useState<'recent' | 'popular'>('recent');
 const [posts, setPosts] = useState<Post[]>([...seedPosts, mention]);
 const [liked, setLiked] = useState<string[]>([]);
 const [burst, setBurst] = useState<string | null>(null);
 const [reposted, setReposted] = useState<string[]>([]);
 const [bookmarked, setBookmarked] = useState<string[]>([]);
 const [following, setFollowing] = useState<string[]>(['nora','sam']);
 const [search, setSearch] = useState('');
 const [query, setQuery] = useState('');
 const [searchTab, setSearchTab] = useState<'top' | 'latest' | 'people' | 'media'>('top');
 const [exploreTab, setExploreTab] = useState<ExploreTab>('for-you');
 const [noticeTab, setNoticeTab] = useState<'all' | 'verified' | 'mentions'>('all');
 const [noticeSeen, setNoticeSeen] = useState(false);
 const [profileTab, setProfileTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
 const [community, setCommunity] = useState<Community>('city');
 const [chatWith, setChatWith] = useState<string | null>(null);
 const [chatDraft, setChatDraft] = useState('');
 const [messages, setMessages] = useState<{ id: string; to: string; text: string }[]>([]);
 const [grokDraft, setGrokDraft] = useState('');
 const [grokLog, setGrokLog] = useState<{ id: string; text: string }[]>([]);
 const [composer, setComposer] = useState<Composer>(null);
 const [draft, setDraft] = useState('');
 const [sheet, setSheet] = useState<Sheet>(null);
 const [drawer, setDrawer] = useState(false);
 const [fab, setFab] = useState(false);
 const [chromeHidden, setChromeHidden] = useState(false);
 const [toast, setToast] = useState<{ text: string; postId?: string } | null>(null);
 const scrollRef = useRef<HTMLDivElement>(null);
 const lastY = useRef(0);
 const draftRef = useRef<HTMLTextAreaElement>(null);

 useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = view.scroll ?? 0; lastY.current = view.scroll ?? 0; setChromeHidden(false); }, [view]);
 useEffect(() => { if (composer) window.setTimeout(() => draftRef.current?.focus(), 60); }, [composer]);
 useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(t); }, [toast]);
 useEffect(() => { if (!burst) return; const t = window.setTimeout(() => setBurst(null), 700); return () => window.clearTimeout(t); }, [burst]);

 const here = (): View => ({ ...view, scroll:scrollRef.current?.scrollTop ?? 0 });
 function go(next: View) { if (next.kind === 'profile') setProfileTab('posts'); setSheet(null); setDrawer(false); setHistory(h => [...h, here()]); setView(next); }
 function root(kind: Kind) {
  setSheet(null); setDrawer(false); setFab(false); setChatWith(null);
  if (kind === 'notifications') setNoticeSeen(true);
  if (view.kind === kind && history.length === 0) { scrollRef.current?.scrollTo({ top:0, behavior:'smooth' }); return; }
  setHistory([]); setView({ kind });
 }
 function back() { setView(history.at(-1) ?? { kind:'home' }); setHistory(h => h.slice(0, -1)); setSheet(null); }
 function toggle(id: string, list: string[], update: (v: string[]) => void) { update(list.includes(id) ? list.filter(x => x !== id) : [...list, id]); }
 function like(id: string) { if (!liked.includes(id)) setBurst(id); toggle(id, liked, setLiked); }
 function openComposer(next: NonNullable<Composer>) { setDraft(''); setFab(false); setSheet(null); setComposer(next); }
 function onScroll() {
  const y = scrollRef.current?.scrollTop ?? 0;
  if (y > lastY.current + 6 && y > 80) setChromeHidden(true);
  else if (y < lastY.current - 6 || y < 80) setChromeHidden(false);
  lastY.current = y;
 }
 function submitPost(e: FormEvent) {
  e.preventDefault(); const text = draft.trim(); if (!text || !composer) return;
  const id = `s-${Date.now()}`;
  setPosts(p => [{ id, authorId:'you', time:'now', text, replies:0, reposts:0, likes:0, views:'0', ...(composer.parentId ? { parentId:composer.parentId } : {}), ...(composer.quoteId ? { quoteId:composer.quoteId } : {}) }, ...p]);
  setToast({ text:composer.parentId ? 'Your reply was sent.' : 'Your post was sent.', postId:id });
  setComposer(null); setDraft('');
 }

 const q = query.trim().toLowerCase();
 const typed = search.trim().toLowerCase();
 const postById = (id?: string) => posts.find(p => p.id === id);
 const childrenOf = (id: string) => posts.filter(p => p.parentId === id);
 const selectedPost = view.kind === 'post' ? postById(view.id) : undefined;
 const selectedPerson = person(view.id ?? 'you');

 let feedPosts = posts.filter(p => !p.parentId);
 if (feed === 'following') {
  feedPosts = feedPosts.filter(p => p.authorId === 'you' || following.includes(p.authorId))
   .sort(followingSort === 'recent' ? (a, b) => ageMinutes(a.time) - ageMinutes(b.time) : (a, b) => b.likes - a.likes);
 } else if (feed !== 'for-you') feedPosts = feedPosts.filter(p => streams[feed].includes(p.authorId));

 const matchedPosts = posts.filter(p => `${p.text} ${person(p.authorId).name} ${person(p.authorId).handle}`.toLowerCase().includes(q));
 const resultPosts = searchTab === 'media' ? matchedPosts.filter(p => p.image) : [...matchedPosts].sort(searchTab === 'top' ? (a, b) => b.likes - a.likes : (a, b) => ageMinutes(a.time) - ageMinutes(b.time));
 const matchPeople = (term: string) => people.filter(p => p.id !== 'you' && `${p.name} ${p.handle} ${p.bio}`.toLowerCase().includes(term));

 function actions(post: Post, detail = false) {
  const isLiked = liked.includes(post.id); const isReposted = reposted.includes(post.id); const isBookmarked = bookmarked.includes(post.id);
  const replyCount = post.replies + childrenOf(post.id).length;
  const button = (label: string, icon: IconName, onClick: () => void, count?: string, extra = '', pressed?: boolean) =>
   <button type="button" className={`${s.action} ${extra}`} aria-label={label} aria-pressed={pressed} onClick={stop(onClick)}><span className={s.actionIcon}><Icon name={icon}/></span>{count !== undefined && <span className={s.count}>{count}</span>}</button>;
  return <div className={`${s.actions} ${detail ? s.actionsDetail : ''}`} role="group" aria-label="Post actions">
   {button(`Reply, ${replyCount} replies`, 'reply', () => openComposer({ parentId:post.id }), replyCount ? compact(replyCount) : '', s.replyAction)}
   {button(isReposted ? 'Undo repost' : 'Repost', 'repost', () => setSheet({ kind:'repost', postId:post.id }), nonZero(post.reposts + Number(isReposted)), `${s.repostAction} ${isReposted ? s.reposted : ''}`, isReposted)}
   {button(isLiked ? 'Unlike' : 'Like', isLiked ? 'heartFill' : 'heart', () => like(post.id), nonZero(post.likes + Number(isLiked)), `${s.likeAction} ${isLiked ? s.liked : ''} ${burst === post.id ? s.burst : ''}`, isLiked)}
   {detail
    ? button(isBookmarked ? 'Remove Bookmark' : 'Bookmark', isBookmarked ? 'bookmarkFill' : 'bookmark', () => toggle(post.id, bookmarked, setBookmarked), compact(Math.round(post.likes / 9) + Number(isBookmarked)), `${s.blueAction} ${isBookmarked ? s.bookmarked : ''}`, isBookmarked)
    : button(`${post.views} views`, 'views', () => go({ kind:'post', id:post.id }), post.views, s.blueAction)}
   <span className={s.actionPair}>
    {!detail && button(isBookmarked ? 'Remove Bookmark' : 'Bookmark', isBookmarked ? 'bookmarkFill' : 'bookmark', () => toggle(post.id, bookmarked, setBookmarked), undefined, `${s.blueAction} ${isBookmarked ? s.bookmarked : ''}`, isBookmarked)}
    {button('Share post', 'share', () => setSheet({ kind:'share', postId:post.id }), undefined, s.blueAction)}
   </span>
  </div>;
 }

 function quoteCard(id: string) {
  const quoted = postById(id); if (!quoted) return null; const author = person(quoted.authorId);
  return <button type="button" className={s.quote} onClick={stop(() => go({ kind:'post', id }))} aria-label={`Open quoted post by ${author.name}`}>
   <span className={s.quoteHead}><Avatar user={author} size={20}/><Name user={author}/><span className={s.muted}>@{author.handle} · {shortTime(quoted.time)}</span></span>
   <span className={s.quoteText}>{quoted.text}</span>
   {quoted.image && <img src={quoted.image} alt={quoted.imageAlt ?? ''} loading="lazy" className={s.quoteImage}/>}
  </button>;
 }

 function renderPost(post: Post, opts: { threadDown?: boolean; threadUp?: boolean; replyTo?: string } = {}) {
  const author = person(post.authorId); const isReposted = reposted.includes(post.id);
  const open = () => go({ kind:'post', id:post.id });
  return <article key={post.id} className={`${s.post} ${opts.threadDown ? s.threadDown : ''} ${opts.threadUp ? s.threadUp : ''}`} onClick={open}>
   {isReposted && <div className={s.social}><Icon name="repost"/>You reposted</div>}
   <div className={s.postGrid}>
    <div className={s.gutter}><Avatar user={author} onClick={() => go({ kind:'profile', id:author.id })}/></div>
    <div className={s.postMain}>
     <div className={s.postHead}>
      <button type="button" className={s.identity} onClick={stop(() => go({ kind:'profile', id:author.id }))}><Name user={author}/><span className={s.muted}>@{author.handle}</span><span className={s.muted}>· {shortTime(post.time)}</span></button>
      <button type="button" className={s.more} aria-label={`More options for ${author.name}'s post`} onClick={stop(() => setSheet({ kind:'more', postId:post.id }))}><Icon name="more"/></button>
     </div>
     {opts.replyTo && <p className={s.replyingTo}>Replying to <span>@{opts.replyTo}</span></p>}
     <p className={s.text}>{post.text}</p>
     {post.image && <div className={s.media}><img src={post.image} alt={post.imageAlt ?? ''} loading="lazy"/></div>}
     {post.quoteId && quoteCard(post.quoteId)}
     {actions(post)}
    </div>
   </div>
  </article>;
 }

 function underlineTabs<T extends string>(tabs: readonly { id: T; label: string }[], current: T, pick: (id: T) => void, opts: { scroll?: boolean; plus?: boolean; chevron?: (id: T) => boolean; label: string }) {
  return <div className={`${s.tabs} ${opts.scroll ? s.tabsScroll : ''}`} role="tablist" aria-label={opts.label}>
   {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={current === t.id} onClick={() => pick(t.id)}>
    <span className={s.tabLabel}>{t.label}{opts.chevron?.(t.id) && current === t.id && <Icon name="chevronDown"/>}</span>
   </button>)}
   {opts.plus && <button type="button" className={s.tabPlus} aria-label="Manage timelines" onClick={() => setToast({ text:LOCAL })}><Icon name="plus"/></button>}
  </div>;
 }

 function topBar(title: ReactNode, right?: ReactNode) {
  return <div className={s.topBar}>
   <button type="button" className={s.selfButton} onClick={() => setDrawer(true)} aria-label="Open account menu"><Avatar user={me} size={32}/></button>
   <div className={s.topTitle}>{title}</div>
   <div className={s.topRight}>{right}</div>
  </div>;
 }

 function backBar(title: ReactNode, right?: ReactNode, sub?: string) {
  return <header className={s.backBar}>
   <button type="button" className={s.iconBtn} onClick={back} aria-label="Back"><Icon name="back"/></button>
   <div className={s.backTitle}><h1>{title}</h1>{sub && <small>{sub}</small>}</div>
   <div className={s.topRight}>{right}</div>
  </header>;
 }

 function personRow(user: Person) {
  const isFollowing = following.includes(user.id);
  return <div key={user.id} className={s.personRow} onClick={() => go({ kind:'profile', id:user.id })}>
   <Avatar user={user}/>
   <div className={s.personText}><Name user={user}/><span className={s.muted}>@{user.handle}</span><p>{user.bio}</p></div>
   <button type="button" className={`${s.pill} ${isFollowing ? s.pillOutline : s.pillLight}`} onClick={stop(() => toggle(user.id, following, setFollowing))}>{isFollowing ? 'Following' : 'Follow'}</button>
  </div>;
 }

 function empty(title: string, detail: string) { return <div className={s.empty}><h2>{title}</h2><p>{detail}</p></div>; }

 function thread(post: Post, depth = 0): ReactNode[] {
  const kids = childrenOf(post.id);
  const rows: ReactNode[] = [renderPost(post, { threadDown:kids.length > 0 && depth < 2, threadUp:depth > 0 })];
  if (kids.length && depth < 2) rows.push(...thread(kids[0], depth + 1));
  return rows;
 }

 // ---------- screens ----------
 function home() {
  return <>
   <div className={`${s.chrome} ${chromeHidden ? s.chromeHidden : ''}`}>
    {topBar(<span className={s.logo} aria-label="X"><XLogo/></span>)}
    {underlineTabs(feedTabs, feed, id => {
     if (id === feed && (id === 'for-you' || id === 'following')) setSheet({ kind:id });
     else setFeed(id);
    }, { scroll:true, plus:true, chevron:id => id === 'for-you' || id === 'following', label:'Timelines' })}
   </div>
   {feedPosts.map(p => renderPost(p))}
   {!feedPosts.length && empty('Nothing to see here — yet', 'Posts from accounts you follow will show up here.')}
  </>;
 }

 function explore() {
  const results = q.length > 0 && search === query;
  const typing = typed.length > 0 && search !== query;
  return <>
   <div className={`${s.chrome} ${chromeHidden ? s.chromeHidden : ''}`}>
    <div className={s.topBar}>
     {results || typing
      ? <button type="button" className={s.iconBtn} aria-label="Back" onClick={() => { setSearch(''); setQuery(''); }}><Icon name="back"/></button>
      : <button type="button" className={s.selfButton} onClick={() => setDrawer(true)} aria-label="Open account menu"><Avatar user={me} size={32}/></button>}
     <form className={s.searchField} onSubmit={e => { e.preventDefault(); setQuery(search); setSearchTab('top'); }} role="search">
      <Icon name="search"/>
      <input aria-label="Search" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} enterKeyHint="search"/>
      {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); setQuery(''); }}><Icon name="close"/></button>}
     </form>
     <div className={s.topRight}><button type="button" className={s.iconBtn} aria-label="Explore settings" onClick={() => setToast({ text:LOCAL })}><Icon name="settings"/></button></div>
    </div>
    {results
     ? underlineTabs([{ id:'top', label:'Top' }, { id:'latest', label:'Latest' }, { id:'people', label:'People' }, { id:'media', label:'Media' }] as const, searchTab, setSearchTab, { label:'Search results' })
     : !typing && underlineTabs(exploreTabs, exploreTab, setExploreTab, { label:'Explore', scroll:true })}
   </div>
   {typing && <div className={s.typeahead}>
    <button type="button" className={s.typeRow} onClick={() => { setQuery(search); setSearchTab('top'); }}><Icon name="search"/><span>Search for “{search.trim()}”</span></button>
    {matchPeople(typed).slice(0, 6).map(p => <button type="button" key={p.id} className={s.typePerson} onClick={() => go({ kind:'profile', id:p.id })}><Avatar user={p}/><span><Name user={p}/><span className={s.muted}>@{p.handle}</span></span></button>)}
   </div>}
   {results && (searchTab === 'people'
    ? (matchPeople(q).length ? matchPeople(q).map(personRow) : empty(`No results for “${query}”`, 'Try searching for something else.'))
    : (resultPosts.length ? resultPosts.map(p => renderPost(p)) : empty(`No results for “${query}”`, 'Try searching for something else, or check your Search settings.')))}
   {!results && !typing && <>
    {trends.filter(t => exploreFilter[exploreTab](t.category)).map((t, i) => <div key={t.id} className={s.trend} onClick={() => { setSearch(t.title); setQuery(t.title); setSearchTab('top'); }}>
     <span><small>{exploreTab === 'trending' ? `${i + 1} · ` : ''}{t.category}</small><strong>{t.title}</strong><small>{t.count}</small></span>
     <button type="button" className={s.more} aria-label={`More about ${t.title}`} onClick={stop(() => setToast({ text:LOCAL }))}><Icon name="more"/></button>
    </div>)}
    {exploreTab === 'for-you' && <><h2 className={s.sectionHead}>Who to follow</h2>{people.filter(p => !['you','nora','sam'].includes(p.id)).slice(0, 3).map(personRow)}</>}
   </>}
  </>;
 }

 function notifications() {
  const rows = [
   { id:'n-like', icon:'heartFill' as IconName, tone:s.pink, actors:['nora','sam','leah'], text:<><strong>Nora Park</strong> and 2 others liked your post</>, quote:postById('p7')?.text, open:() => go({ kind:'post', id:'p7' }) },
   { id:'n-follow', icon:'personFill' as IconName, tone:s.blue, actors:['field'], text:<><strong>Field Notes</strong> followed you</>, open:() => go({ kind:'profile', id:'field' }) },
   { id:'n-repost', icon:'repost' as IconName, tone:s.green, actors:['atlas'], text:<><strong>Atlas Archive</strong> reposted your post</>, quote:postById('p7')?.text, open:() => go({ kind:'post', id:'p7' }) },
   { id:'n-star', icon:'star' as IconName, tone:s.purple, actors:['yasmin'], text:<>New post notification for <strong>Yasmin Ali</strong></>, quote:postById('n1')?.text, open:() => go({ kind:'post', id:'n1' }) },
  ];
  const visible = noticeTab === 'verified' ? rows.filter(r => r.actors.some(a => person(a).verified)) : rows;
  return <>
   <div className={`${s.chrome} ${chromeHidden ? s.chromeHidden : ''}`}>
    {topBar(<h1 className={s.screenTitle}>Notifications</h1>, <button type="button" className={s.iconBtn} aria-label="Notification settings" onClick={() => setToast({ text:LOCAL })}><Icon name="settings"/></button>)}
    {underlineTabs([{ id:'all', label:'All' }, { id:'verified', label:'Verified' }, { id:'mentions', label:'Mentions' }] as const, noticeTab, setNoticeTab, { label:'Notification filters' })}
   </div>
   {noticeTab === 'mentions'
    ? renderPost(mention, { replyTo:'mayachen' })
    : visible.map(r => <div key={r.id} className={s.notice} onClick={r.open}>
     <span className={`${s.noticeIcon} ${r.tone}`}><Icon name={r.icon}/></span>
     <div className={s.noticeBody}>
      <div className={s.noticeFaces}>{r.actors.map(a => <Avatar key={a} user={person(a)} size={32} onClick={() => go({ kind:'profile', id:a })}/>)}</div>
      <p>{r.text}</p>
      {r.quote && <p className={s.noticeQuote}>{r.quote}</p>}
     </div>
    </div>)}
  </>;
 }

 function chat() {
  if (chatWith) {
   const other = person(chatWith); const opener = chats.find(c => c.id === chatWith)?.opener ?? '';
   return <>
    <header className={s.backBar}>
     <button type="button" className={s.iconBtn} onClick={() => setChatWith(null)} aria-label="Back to Chat"><Icon name="back"/></button>
     <button type="button" className={s.chatPeer} onClick={() => go({ kind:'profile', id:other.id })}><Avatar user={other} size={28}/><Name user={other}/></button>
     <div className={s.topRight}><button type="button" className={s.iconBtn} aria-label="Conversation info" onClick={() => setToast({ text:LOCAL })}><Icon name="more"/></button></div>
    </header>
    <div className={s.conversation}>
     <div className={s.peerCard}><Avatar user={other} size={64}/><Name user={other} big/><span className={s.muted}>@{other.handle}</span><span className={s.muted}>Joined {other.joined} · {other.followers} Followers</span></div>
     <p className={s.dayLabel}>Today</p>
     <div className={s.bubbleRow}><Avatar user={other} size={28}/><p className={s.received}>{opener}</p></div>
     {messages.filter(m => m.to === chatWith).map(m => <p key={m.id} className={s.sent}>{m.text}</p>)}
     {messages.some(m => m.to === chatWith) && <p className={s.seen}>Sent</p>}
    </div>
    <form className={s.messageBar} onSubmit={e => { e.preventDefault(); const text = chatDraft.trim(); if (!text) return; setMessages(v => [...v, { id:`${chatWith}-${v.length}`, to:chatWith, text }]); setChatDraft(''); }}>
     <button type="button" className={s.iconBtnBlue} aria-label="Add media" onClick={() => setToast({ text:LOCAL })}><Icon name="plus"/></button>
     <input aria-label="Write a message" placeholder="Message" value={chatDraft} onChange={e => setChatDraft(e.target.value)}/>
     <button type="submit" className={s.sendButton} disabled={!chatDraft.trim()} aria-label="Send"><Icon name="back"/></button>
    </form>
   </>;
  }
  return <>
   <div className={`${s.chrome} ${chromeHidden ? s.chromeHidden : ''}`}>
    {topBar(<h1 className={s.screenTitle}>Chat</h1>, <><button type="button" className={s.iconBtn} aria-label="Chat settings" onClick={() => setToast({ text:LOCAL })}><Icon name="settings"/></button><button type="button" className={s.iconBtn} aria-label="New chat" onClick={() => setToast({ text:LOCAL })}><Icon name="newChat"/></button></>)}
    <div className={s.chatSearch}><Icon name="search"/><span>Search</span></div>
   </div>
   {chats.map(c => { const p = person(c.id); const last = messages.filter(m => m.to === c.id).at(-1)?.text; return <button type="button" key={c.id} className={s.chatRow} onClick={() => setChatWith(c.id)}>
    <Avatar user={p} size={48}/>
    <span className={s.chatText}><span className={s.chatTop}><Name user={p}/><span className={s.muted}>@{p.handle} · {last ? 'now' : c.time}</span></span><span className={s.chatLast}>{last ? `You: ${last}` : c.opener}</span></span>
   </button>; })}
  </>;
 }

 function grok() {
  return <>
   <header className={s.backBar}>
    <button type="button" className={s.iconBtn} aria-label="Expand" onClick={() => setToast({ text:LOCAL })}><Icon name="expand"/></button>
    <div className={s.backTitle}><h1>Grok</h1></div>
    <div className={s.topRight}><button type="button" className={s.iconBtn} aria-label="New chat" onClick={() => setGrokLog([])}><Icon name="newChat"/></button><button type="button" className={s.iconBtn} aria-label="History" onClick={() => setToast({ text:LOCAL })}><Icon name="history"/></button></div>
   </header>
   {grokLog.length === 0
    ? <div className={s.grokEmpty}><span className={s.grokMark}><Icon name="grokFill"/></span><h2>Grok</h2>
     <div className={s.grokChips}>{['Explain this trend: library', 'Summarize today’s posts about transit', 'What should I read next?'].map(text => <button type="button" key={text} onClick={() => setGrokDraft(text)}>{text}</button>)}</div></div>
    : <div className={s.conversation}>{grokLog.map(m => <div key={m.id}><p className={s.sent}>{m.text}</p><p className={s.grokNote}>This local study is not connected to Grok. Your question stays in this browser session.</p></div>)}</div>}
   <form className={s.grokDock} onSubmit={e => { e.preventDefault(); const text = grokDraft.trim(); if (!text) return; setGrokLog(v => [...v, { id:`g${v.length}`, text }]); setGrokDraft(''); }}>
    <input aria-label="Ask Grok" placeholder="Ask anything" value={grokDraft} onChange={e => setGrokDraft(e.target.value)}/>
    <div className={s.grokTools}>
     <button type="button" className={s.grokTool} aria-label="Attach" onClick={() => setToast({ text:LOCAL })}><Icon name="link"/></button>
     <button type="button" className={s.grokMode} onClick={() => setToast({ text:LOCAL })}><Icon name="sparkles"/>Auto<Icon name="chevronDown"/></button>
     <span className={s.grokSpacer}/>
     <button type="button" className={s.grokTool} aria-label="Dictate" onClick={() => setToast({ text:LOCAL })}><Icon name="mic"/></button>
     {grokDraft.trim() ? <button type="submit" className={s.grokSpeak}>Ask</button> : <button type="button" className={s.grokSpeak} onClick={() => setToast({ text:LOCAL })}>Speak</button>}
    </div>
   </form>
  </>;
 }

 function postDetail(post: Post) {
  const author = person(post.authorId); const parent = postById(post.parentId);
  const replies = childrenOf(post.id).sort((a, b) => b.likes - a.likes);
  return <>
   {backBar('Post', <button type="button" className={s.iconBtn} aria-label="More" onClick={() => setSheet({ kind:'more', postId:post.id })}><Icon name="more"/></button>)}
   {parent && renderPost(parent, { threadDown:true })}
   <article className={`${s.detail} ${parent ? s.detailThreaded : ''}`}>
    <div className={s.detailHead}>
     <Avatar user={author} onClick={() => go({ kind:'profile', id:author.id })}/>
     <button type="button" className={s.detailWho} onClick={() => go({ kind:'profile', id:author.id })}><Name user={author}/><span className={s.muted}>@{author.handle}</span></button>
     {author.id !== 'you' && !following.includes(author.id) && <button type="button" className={`${s.pill} ${s.pillLight} ${s.pillSmall}`} onClick={() => toggle(author.id, following, setFollowing)}>Follow</button>}
    </div>
    <p className={s.detailText}>{post.text}</p>
    {post.image && <div className={s.media}><img src={post.image} alt={post.imageAlt ?? ''}/></div>}
    {post.quoteId && quoteCard(post.quoteId)}
    <p className={s.detailMeta}>{fullTime(post.time)} · <strong>{post.views}</strong> Views</p>
    {actions(post, true)}
   </article>
   <div className={s.replySort}><button type="button" onClick={() => setToast({ text:LOCAL })}>Relevant <Icon name="chevronDown"/></button><button type="button" onClick={() => setToast({ text:LOCAL })}>View quotes <Icon name="chevronRight"/></button></div>
   {replies.flatMap(r => thread(r))}
   {!replies.length && <p className={s.quietNote}>Be the first to reply.</p>}
   <div className={s.replyBarSpace}/>
  </>;
 }

 function profile(user: Person) {
  const isMe = user.id === 'you'; const isFollowing = following.includes(user.id);
  const list = profileTab === 'likes' ? posts.filter(p => liked.includes(p.id))
   : posts.filter(p => p.authorId === user.id && (profileTab === 'posts' ? !p.parentId : profileTab === 'replies' ? !!p.parentId : !!p.image));
  const tabs: { id: typeof profileTab; label: string; icon: IconName }[] = [
   { id:'posts', label:'Posts', icon:'pencil' }, { id:'replies', label:'Replies', icon:'reply' }, { id:'media', label:'Media', icon:'image' },
   ...(isMe ? [{ id:'likes' as const, label:'Likes', icon:'heart' as IconName }] : []),
  ];
  const mutuals = ['nora','sam'].filter(id => id !== user.id).map(person);
  return <>
   <div className={s.banner}><img src={user.banner} alt=""/>
    <button type="button" className={`${s.glass} ${s.glassLeft}`} onClick={back} aria-label="Back"><Icon name="back"/></button>
    <div className={s.glassRight}>
     <button type="button" className={s.glass} aria-label="Ask Grok about this profile" onClick={() => root('grok')}><Icon name="grok"/></button>
     <button type="button" className={s.glass} aria-label="Search posts" onClick={() => { setSearch(`from:${user.handle}`); root('explore'); }}><Icon name="search"/></button>
     <button type="button" className={s.glass} aria-label="More" onClick={() => setToast({ text:LOCAL })}><Icon name="more"/></button>
    </div>
   </div>
   <section className={s.profileInfo}>
    <div className={s.profileTop}>
     <span className={`${s.profileAvatar} ${user.verified === 'gold' ? s.square : ''}`}><Avatar user={user} size={80}/></span>
     <div className={s.profileButtons}>
      {isMe
       ? <button type="button" className={`${s.pill} ${s.pillOutline}`} onClick={() => setToast({ text:LOCAL })}>Edit profile</button>
       : <>
        <button type="button" className={s.circleBtn} aria-label={`Message ${user.name}`} onClick={() => { root('chat'); if (chats.some(c => c.id === user.id)) setChatWith(user.id); }}><Icon name="chat"/></button>
        <button type="button" className={s.circleBtn} aria-label="Turn on post notifications" onClick={() => setToast({ text:`You’ll get notified when @${user.handle} posts.` })}><Icon name="bellPlus"/></button>
        <button type="button" className={`${s.pill} ${isFollowing ? s.pillOutline : s.pillLight}`} onClick={() => toggle(user.id, following, setFollowing)}>{isFollowing ? 'Following' : user.followsYou ? 'Follow back' : 'Follow'}</button>
       </>}
     </div>
    </div>
    <h1 className={s.profileName}><Name user={user} big/></h1>
    <p className={s.profileHandle}>@{user.handle}{user.followsYou && <span className={s.followsYou}>Follows you</span>}</p>
    <p className={s.bio}>{user.bio}</p>
    <p className={s.metaLine}><span><Icon name="location"/>{user.location}</span><span><Icon name="calendar"/>Joined {user.joined}</span></p>
    <p className={s.counts}><span><strong>{user.following}</strong> Following</span><span><strong>{user.followers}</strong> Followers</span></p>
    {!isMe && mutuals.length > 0 && <p className={s.mutuals}><span className={s.mutualFaces}>{mutuals.map(m => <Avatar key={m.id} user={m} size={20}/>)}</span>Followed by {mutuals.map(m => m.name).join(', ')} and 12 others</p>}
   </section>
   <div className={s.iconTabs} role="tablist" aria-label="Profile sections">
    {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={profileTab === t.id} aria-label={t.label} onClick={() => setProfileTab(t.id)}><Icon name={t.icon}/>{profileTab === t.id && <span>{t.label}</span>}</button>)}
   </div>
   {list.map(p => renderPost(p))}
   {!list.length && empty(profileTab === 'likes' ? 'You don’t have any likes yet' : `@${user.handle} hasn’t posted ${profileTab === 'media' ? 'media' : profileTab === 'replies' ? 'replies' : ''} yet`, profileTab === 'likes' ? 'Tap the heart on any post to show it some love. When you do, it’ll show up here.' : 'When they do, those posts will show up here.')}
  </>;
 }

 function communities() {
  const chips: { id: Community; label: string; intro: string }[] = [
   { id:'city', label:'City & transit', intro:'Conversations about streets, movement, and public places.' },
   { id:'culture', label:'Books & culture', intro:'Readers, makers, music, and films.' },
   { id:'everyday', label:'Everyday', intro:'Food, gardens, weather, and small routines.' },
  ];
  return <>
   {backBar('Communities')}
   <div className={s.chips} role="group" aria-label="Local communities">{chips.map(c => <button key={c.id} type="button" aria-pressed={community === c.id} onClick={() => setCommunity(c.id)}>{c.label}</button>)}</div>
   <p className={s.quietNote}>{chips.find(c => c.id === community)?.intro}</p>
   {posts.filter(p => !p.parentId && streams[community].includes(p.authorId)).map(p => renderPost(p))}
  </>;
 }

 // ---------- overlays ----------
 const sheetPost = postById(sheet?.postId);
 function sheetRows(): { id: string; icon: IconName; label: string; run: () => void; danger?: boolean; active?: boolean }[] {
  if (!sheet) return [];
  if (sheet.kind === 'for-you') return [{ id:'snooze', icon:'history', label:'Snooze topics', run:() => setToast({ text:LOCAL }) }, { id:'settings', icon:'settings', label:'Timeline settings', run:() => setToast({ text:LOCAL }) }];
  if (sheet.kind === 'following') return [
   { id:'recent', icon:'history', label:'Recent', active:followingSort === 'recent', run:() => setFollowingSort('recent') },
   { id:'popular', icon:'sparkles', label:'Popular', active:followingSort === 'popular', run:() => setFollowingSort('popular') },
  ];
  if (!sheetPost) return [];
  const author = person(sheetPost.authorId); const id = sheetPost.id;
  if (sheet.kind === 'repost') return [
   { id:'repost', icon:'repost', label:reposted.includes(id) ? 'Undo repost' : 'Repost', run:() => toggle(id, reposted, setReposted) },
   { id:'quote', icon:'pencil', label:'Quote', run:() => openComposer({ quoteId:id }) },
  ];
  if (sheet.kind === 'share') return [
   { id:'copy', icon:'link', label:'Copy link', run:() => setToast({ text:'Copied to clipboard' }) },
   { id:'chat', icon:'chat', label:'Send via Chat', run:() => root('chat') },
   { id:'bookmark', icon:bookmarked.includes(id) ? 'bookmarkFill' : 'bookmark', label:bookmarked.includes(id) ? 'Remove Bookmark' : 'Bookmark', run:() => toggle(id, bookmarked, setBookmarked) },
   { id:'via', icon:'share', label:'Share post via …', run:() => setToast({ text:LOCAL }) },
  ];
  if (author.id === 'you') return [
   { id:'pin', icon:'star', label:'Pin to your profile', run:() => setToast({ text:LOCAL }) },
   { id:'delete', icon:'close', label:'Delete', danger:true, run:() => { setPosts(p => p.filter(x => x.id !== id)); if (view.kind === 'post' && view.id === id) back(); setToast({ text:'Your post was deleted' }); } },
  ];
  return [
   { id:'interest', icon:'emoji', label:'Not interested in this post', run:() => setToast({ text:'Thanks. You’ll see fewer posts like this.' }) },
   { id:'follow', icon:'personFollow', label:`${following.includes(author.id) ? 'Unfollow' : 'Follow'} @${author.handle}`, run:() => toggle(author.id, following, setFollowing) },
   { id:'lists', icon:'lists', label:`Add/remove @${author.handle} from Lists`, run:() => setToast({ text:LOCAL }) },
   { id:'mute', icon:'bell', label:`Mute @${author.handle}`, run:() => setToast({ text:LOCAL }) },
   { id:'report', icon:'more', label:'Report post', danger:true, run:() => setToast({ text:LOCAL }) },
  ];
 }

 const drawerItems: { id: string; icon: IconName; label: string; run: () => void }[] = [
  { id:'profile', icon:'person', label:'Profile', run:() => go({ kind:'profile', id:'you' }) },
  { id:'premium', icon:'star', label:'Premium', run:() => setToast({ text:LOCAL }) },
  { id:'bookmarks', icon:'bookmark', label:'Bookmarks', run:() => go({ kind:'bookmarks' }) },
  { id:'lists', icon:'lists', label:'Lists', run:() => setToast({ text:LOCAL }) },
  { id:'communities', icon:'communities', label:'Communities', run:() => go({ kind:'communities' }) },
  { id:'history', icon:'history', label:'History', run:() => setToast({ text:LOCAL }) },
 ];

 const parentPost = postById(composer?.parentId);
 const tabbar = !(view.kind === 'chat' && chatWith);
 const showFab = ['home','explore','notifications','communities','profile'].includes(view.kind) || (view.kind === 'chat' && !chatWith);
 const tabIs = (k: Kind) => view.kind === k && history.length === 0;
 const navItem = (kind: Kind, label: string, icon: IconName, active: IconName, badge?: string) =>
  <button type="button" aria-label={label} aria-current={tabIs(kind) ? 'page' : undefined} onClick={() => root(kind)}>
   <Icon name={tabIs(kind) ? active : icon}/>{badge && <span className={s.badge}>{badge}</span>}
  </button>;
 const remaining = 280 - draft.length;

 return <main className={s.outer} lang="en"><div className={s.app}>
  <div className={`${s.scroller} ${view.kind === 'post' ? s.withReplyBar : ''}`} ref={scrollRef} onScroll={onScroll}>
   {view.kind === 'home' && home()}
   {view.kind === 'explore' && explore()}
   {view.kind === 'grok' && grok()}
   {view.kind === 'notifications' && notifications()}
   {view.kind === 'chat' && chat()}
   {view.kind === 'post' && selectedPost && postDetail(selectedPost)}
   {view.kind === 'profile' && profile(selectedPerson)}
   {view.kind === 'communities' && communities()}
   {view.kind === 'bookmarks' && <>{backBar('Bookmarks', undefined, '@mayachen')}{bookmarked.length ? posts.filter(p => bookmarked.includes(p.id)).map(p => renderPost(p)) : empty('Save posts for later', 'Bookmark posts to easily find them again in the future.')}</>}
  </div>

  {view.kind === 'post' && selectedPost && <button type="button" className={s.replyBar} onClick={() => openComposer({ parentId:selectedPost.id })}><span>Post your reply</span><Icon name="image"/></button>}

  {showFab && <>
   {fab && <div className={s.fabScrim} onClick={() => setFab(false)}/>}
   {fab && <div className={s.dial}>
    {([['live','Go Live'], ['spaces','Spaces'], ['image','Photos']] as const).map(([icon, label]) => <button type="button" key={icon} onClick={() => { setFab(false); setToast({ text:LOCAL }); }}><span>{label}</span><span className={s.dialIcon}><Icon name={icon}/></span></button>)}
   </div>}
   <button type="button" className={`${s.fab} ${chromeHidden ? s.fabDim : ''}`} onClick={() => fab ? openComposer({}) : setFab(true)} aria-label={fab ? 'Post' : 'Create'} aria-expanded={fab}><Icon name={fab ? 'feather' : 'compose'}/></button>
  </>}

  {tabbar && <nav className={`${s.tabbar} ${chromeHidden ? s.tabbarDim : ''}`} aria-label="Main navigation">
   {navItem('home', 'Home', 'home', 'homeFill')}
   {navItem('explore', 'Search and Explore', 'search', 'search')}
   {navItem('grok', 'Grok', 'grok', 'grokFill')}
   {navItem('notifications', 'Notifications', 'bell', 'bellFill', noticeSeen ? undefined : '3')}
   {navItem('chat', 'Chat', 'chat', 'chatFill')}
  </nav>}

  <div className={`${s.scrim} ${drawer ? s.scrimOn : ''}`} onClick={() => setDrawer(false)} aria-hidden="true"/>
  <aside className={`${s.drawer} ${drawer ? s.drawerOn : ''}`} aria-label="Account menu" inert={!drawer}>
   <div className={s.drawerHead}>
    <Avatar user={me} onClick={() => go({ kind:'profile', id:'you' })}/>
    <button type="button" className={s.circleBtn} aria-label="Switch accounts" onClick={() => setToast({ text:LOCAL })}><Icon name="more"/></button>
   </div>
   <button type="button" className={s.drawerWho} onClick={() => go({ kind:'profile', id:'you' })}><Name user={me} big/><span className={s.muted}>@{me.handle}</span></button>
   <p className={s.counts}><span><strong>{me.following}</strong> Following</span><span><strong>{me.followers}</strong> Followers</span></p>
   <nav className={s.drawerNav}>{drawerItems.map(i => <button type="button" key={i.id} onClick={i.run}><Icon name={i.icon}/>{i.label}</button>)}</nav>
   <div className={s.drawerFoot}><button type="button" onClick={() => setToast({ text:LOCAL })}><Icon name="settings"/>Settings and privacy</button></div>
  </aside>

  <div className={`${s.scrim} ${sheet ? s.scrimOn : ''}`} onClick={() => setSheet(null)} aria-hidden="true"/>
  <div className={`${s.sheet} ${sheet ? s.sheetOn : ''}`} role="dialog" aria-label="Options" inert={!sheet}>
   <span className={s.grabber}/>
   {sheetRows().map(r => <button type="button" key={r.id} className={`${s.sheetRow} ${r.danger ? s.danger : ''}`} onClick={() => { setSheet(null); r.run(); }}><Icon name={r.icon}/><span>{r.label}</span>{r.active && <span className={s.check}>✓</span>}</button>)}
   <button type="button" className={s.sheetCancel} onClick={() => setSheet(null)}>Cancel</button>
  </div>

  <div className={`${s.composer} ${composer ? s.composerOn : ''}`} role="dialog" aria-label={composer?.parentId ? 'Reply' : 'Compose post'} inert={!composer}>
   <header className={s.composerHead}>
    <button type="button" className={s.cancel} onClick={() => setComposer(null)}>Cancel</button>
    <button type="button" className={s.drafts} onClick={() => setToast({ text:LOCAL })}>Drafts</button>
    <button type="submit" form={composeId} className={`${s.pill} ${s.pillBlue}`} disabled={!draft.trim() || remaining < 0}>{composer?.parentId ? 'Reply' : 'Post'}</button>
   </header>
   {parentPost && <div className={s.replyContext}>
    <div className={s.gutter}><Avatar user={person(parentPost.authorId)}/></div>
    <div><Name user={person(parentPost.authorId)}/> <span className={s.muted}>@{person(parentPost.authorId).handle} · {shortTime(parentPost.time)}</span><p className={s.text}>{parentPost.text}</p><p className={s.replyingTo}>Replying to <span>@{person(parentPost.authorId).handle}</span></p></div>
   </div>}
   <form id={composeId} className={s.composeForm} onSubmit={submitPost}>
    <Avatar user={me}/>
    <div className={s.composeBody}>
     <textarea ref={draftRef} aria-label={composer?.parentId ? 'Post your reply' : 'Post text'} placeholder={composer?.parentId ? 'Post your reply' : composer?.quoteId ? 'Add a comment' : 'What’s happening?'} value={draft} onChange={e => setDraft(e.target.value)}/>
     {composer?.quoteId && quoteCard(composer.quoteId)}
    </div>
   </form>
   <div className={s.composeFoot}>
    {!composer?.parentId && <button type="button" className={s.audience} onClick={() => setToast({ text:LOCAL })}><Icon name="globe"/>Everyone can reply</button>}
    <div className={s.composeTools}>
     {(['image','gif','sparkles','poll','emoji','location'] as const).map(t => <button type="button" key={t} aria-label={{ image:'Add photos or video', gif:'Add a GIF', sparkles:'Enhance with Grok', poll:'Add poll', emoji:'Add emoji', location:'Tag location' }[t]} onClick={() => setToast({ text:LOCAL })}><Icon name={t}/></button>)}
     <span className={s.toolSpacer}/>
     {draft.length > 0 && <svg className={s.ring} viewBox="0 0 24 24" aria-label={`${remaining} characters remaining`} role="img"><circle cx="12" cy="12" r="10" className={s.ringTrack}/><circle cx="12" cy="12" r="10" className={`${s.ringFill} ${remaining < 20 ? s.ringWarn : ''}`} strokeDasharray={`${Math.min(1, draft.length / 280) * 62.83} 62.83`}/></svg>}
     <span className={s.toolDivider}/>
     <button type="button" className={s.addThread} aria-label="Add another post" onClick={() => setToast({ text:LOCAL })}><Icon name="plus"/></button>
    </div>
   </div>
  </div>

  {toast && <div className={s.toast} role="status"><span>{toast.text}</span>{toast.postId && <button type="button" onClick={() => { const id = toast.postId; setToast(null); if (id) go({ kind:'post', id }); }}>View</button>}</div>}
 </div></main>;
}
