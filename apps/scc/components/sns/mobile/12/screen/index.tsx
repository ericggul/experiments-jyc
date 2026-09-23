'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { clips as seedClips, compact, creators, seedComments, type Clip, type Comment, type Creator } from '../model/data';
import { loadCommonsBatch } from '../model/commons';
import { feedStep } from '../model/feed-step';
import s from './tiktok.module.css';

type Tab = 'home' | 'search' | 'inbox' | 'profile';
type Feed = 'For You' | 'Following';
type IconName = 'home' | 'search' | 'inbox' | 'profile' | 'plus' | 'heart' | 'comment' | 'bookmark' | 'share' | 'music' | 'play' | 'pause' | 'back' | 'close' | 'more' | 'grid' | 'lock' | 'send' | 'chevron' | 'volume' | 'mute' | 'eye' | 'check';

function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const common = { fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.85, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
    {name === 'home' ? <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/> :
    name === 'search' ? <><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/></> :
    name === 'inbox' ? <><path d="M3 4h18v13h-5l-4 4-4-4H3z"/><path d="M7 9h10M7 13h7"/></> :
    name === 'profile' ? <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></> :
    name === 'plus' ? <path d="M12 4v16M4 12h16"/> :
    name === 'heart' ? <path d="M20.8 8.5c0 4-8.8 11.2-8.8 11.2S3.2 12.5 3.2 8.5a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/> :
    name === 'comment' ? <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-4.5A8.5 8.5 0 1 1 21 11.5Z"/> :
    name === 'bookmark' ? <path d="M6 3h12v18l-6-4-6 4Z"/> :
    name === 'share' ? <><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M4 14v6h16v-6"/></> :
    name === 'music' ? <><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></> :
    name === 'play' ? <path d="m7 4 13 8-13 8z"/> :
    name === 'pause' ? <><path d="M7 4v16M17 4v16"/></> :
    name === 'back' ? <path d="m15 4-8 8 8 8"/> :
    name === 'close' ? <path d="M5 5 19 19M19 5 5 19"/> :
    name === 'more' ? <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></> :
    name === 'grid' ? <><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></> :
    name === 'lock' ? <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></> :
    name === 'send' ? <path d="m3 11 18-8-7 18-3-8-8-2Zm8 2L21 3"/> :
    name === 'chevron' ? <path d="m9 5 7 7-7 7"/> :
    name === 'volume' ? <><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8"/></> :
    name === 'mute' ? <><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6m0-6-4 6"/></> :
    name === 'eye' ? <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></> :
    <path d="m4 12 5 5L20 6"/>}
  </svg>;
}

function Avatar({ creator, size = 'medium' }: { creator: Creator; size?: 'small' | 'medium' | 'large' }) {
  return <span className={`${s.avatar} ${s[size]}`} style={{ '--avatar-color': creator.tone } as CSSProperties} aria-hidden="true">{creator.initials}</span>;
}

function NavButton({ tab, current, label, icon, onClick }: { tab: Tab | 'create'; current: Tab; label: string; icon: IconName; onClick: () => void }) {
  return <button type="button" className={`${s.navItem} ${current === tab ? s.navActive : ''}`} onClick={onClick} aria-label={label} aria-current={current === tab ? 'page' : undefined}>
    <span className={tab === 'create' ? s.createIcon : s.navIcon}><Icon name={icon} filled={current === tab}/></span><span className={s.navLabel}>{tab === 'create' ? '' : label}</span>
  </button>;
}

function VideoGrid({ items, onOpen }: { items: Clip[]; onOpen: (id: string) => void }) {
  return <div className={s.videoGrid}>{items.map(clip => <button key={clip.id} className={s.gridItem} onClick={() => onOpen(clip.id)} aria-label={`Watch ${clip.caption}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- video frame posters are local generated assets */}
    {clip.poster ? <img src={clip.poster} alt=""/> : <span className={s.localTile}><Icon name="play" filled/></span>}<span className={s.viewCount}><Icon name="play" filled/> {clip.views}</span>
  </button>)}</div>;
}

export default function TikTokMobile() {
  const [tab, setTab] = useState<Tab>('home');
  const [feed, setFeed] = useState<Feed>('For You');
  const [allClips, setAllClips] = useState<Clip[]>(seedClips);
  const [remoteCreators, setRemoteCreators] = useState<Creator[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [feedExhausted, setFeedExhausted] = useState(false);
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(seedClips[0].id);
  const [detail, setDetail] = useState(false);
  const [returnTab, setReturnTab] = useState<Tab>('home');
  const [returnCreatorId, setReturnCreatorId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string[]>(['milo']);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>(seedComments);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentLikes, setCommentLikes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKind, setSearchKind] = useState<'Top' | 'Videos' | 'Users'>('Top');
  const [profileKind, setProfileKind] = useState<'posts' | 'liked' | 'saved'>('posts');
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState('');
  const [composer, setComposer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const createdUrls = useRef<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);
  const wheelAt = useRef(0);
  const wheelDelta = useRef(0);
  const feedCursor = useRef<number | null>(0);
  const loadingRef = useRef(false);
  const pendingAdvance = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  const allCreators = useMemo(() => [...creators, ...remoteCreators], [remoteCreators]);

  const activeFeed = useMemo(() => feed === 'Following' ? allClips.filter(clip => followed.includes(clip.creatorId)) : allClips, [allClips, feed, followed]);
  const displayedId = !detail && feed === 'Following' && !activeFeed.some(clip => clip.id === activeId) ? activeFeed[0]?.id : activeId;
  const active = allClips.find(clip => clip.id === displayedId) ?? allClips[0];
  const mediaError = failedVideoId === active.id;
  const ownCreator: Creator = { id: 'you', handle: 'your.profile', name: 'Your profile', bio: 'A space for your videos', followers: '0', likes: String(allClips.filter(clip => clip.creatorId === 'you').reduce((total, clip) => total + clip.likes, 0)), tone: '#777', initials: 'Y' };
  const activeCreator = allCreators.find(person => person.id === active.creatorId) ?? ownCreator;
  const viewedCreator = allCreators.find(person => person.id === creatorId) ?? null;
  const currentComments = comments.filter(comment => comment.clipId === commentFor);

  useEffect(() => { const video = videoRef.current; if (!video) return; if (tab === 'home' && !commentFor && !composer && !paused) { video.play().catch(() => setPaused(true)); } else video.pause(); }, [active.id, tab, commentFor, composer, paused]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const urls = createdUrls.current; return () => { urls.forEach(url => URL.revokeObjectURL(url)); }; }, []);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (tab !== 'home' || detail || feed !== 'For You') pendingAdvance.current = false; }, [tab, detail, feed]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || feedExhausted) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setFeedError(false);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      let cursor = feedCursor.current;
      for (let page = 0; page < 6 && cursor !== null; page += 1) {
        const batch = await loadCommonsBatch(cursor, controller.signal);
        cursor = batch.cursor;
        feedCursor.current = cursor;
        if (batch.clips.length) {
          setAllClips(previous => {
            const ids = new Set(previous.map(clip => clip.id));
            const urls = new Set(previous.map(clip => clip.src));
            return [...previous, ...batch.clips.filter(clip => !ids.has(clip.id) && !urls.has(clip.src))];
          });
          setRemoteCreators(previous => {
            const ids = new Set(previous.map(person => person.id));
            return [...previous, ...batch.creators.filter(person => !ids.has(person.id))];
          });
          if (pendingAdvance.current) {
            pendingAdvance.current = false;
            setActiveId(batch.clips[0].id);
            setProgress(0);
            setPaused(false);
          }
          break;
        }
        if (!cursor) break;
      }
      if (cursor === null) setFeedExhausted(true);
    } catch {
      if (!controller.signal.aborted) setFeedError(true);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [feedExhausted]);

  useEffect(() => {
    if (tab === 'home' && !detail && feed === 'For You' && !feedError && !feedExhausted && allClips.findIndex(clip => clip.id === activeId) >= allClips.length - 3) void loadMore();
  }, [activeId, allClips, detail, feed, feedError, feedExhausted, loadMore, tab]);

  function move(direction: number) {
    const list = detail ? allClips : activeFeed;
    const step = feedStep(list.map(clip => clip.id), displayedId, direction > 0 ? 1 : -1, !detail && feed === 'For You' && !feedExhausted);
    if (!step.nextId) {
      if (step.requestMore) {
        pendingAdvance.current = true;
        if (!feedError) void loadMore();
      }
      return;
    }
    pendingAdvance.current = false;
    setActiveId(step.nextId);
    setProgress(0);
    setPaused(false);
  }
  function navigate(next: Tab) { setTab(next); setCreatorId(null); setDetail(false); setCommentFor(null); setPaused(false); }
  function openVideo(id: string) { setReturnTab(tab); setReturnCreatorId(creatorId); setActiveId(id); setProgress(0); setDetail(true); setTab('home'); setCreatorId(null); setPaused(false); }
  function backVideo() { setDetail(false); setTab(returnTab); setCreatorId(returnCreatorId); setPaused(true); }
  function openCreator(id: string) { setReturnTab(tab); setCreatorId(id); setTab('profile'); setDetail(false); setPaused(true); }
  function toggle(list: string[], setter: (value: string[]) => void, id: string) { setter(list.includes(id) ? list.filter(value => value !== id) : [...list, id]); }
  function submitComment(event: FormEvent) { event.preventDefault(); if (!commentFor || !commentText.trim()) return; setComments(previous => [...previous, { id: crypto.randomUUID(), clipId: commentFor, author: 'you', body: commentText.trim(), likes: 0, time: 'now', own: true }]); setCommentText(''); }
  function submitSearch(event: FormEvent) { event.preventDefault(); setSearchTerm(query.trim()); }
  function publish(event: FormEvent) { event.preventDefault(); if (!file || !file.type.startsWith('video/') || !caption.trim()) { setToast('Choose a video and add a caption.'); return; } const url = URL.createObjectURL(file); createdUrls.current.push(url); const id = crypto.randomUUID(); setAllClips(previous => [{ id, creatorId: 'you', src: url, poster: '', caption: caption.trim(), sound: 'original sound - you', tags: [], likes: 0, comments: 0, saves: 0, views: '0' }, ...previous]); setActiveId(id); setProgress(0); setFeed('For You'); setComposer(false); setFile(null); setCaption(''); navigate('home'); setToast('Posted to this preview only'); }
  async function share() { const text = `${active.caption} — @${activeCreator.handle}`; try { if (navigator.share) await navigator.share({ title: text, url: window.location.href }); else { await navigator.clipboard.writeText(text); setToast('Video details copied'); } } catch { setToast('Sharing cancelled'); } }
  const profile = viewedCreator ?? ownCreator;
  const profileClips = profileKind === 'liked' && !viewedCreator ? allClips.filter(clip => liked.includes(clip.id)) : profileKind === 'saved' && !viewedCreator ? allClips.filter(clip => saved.includes(clip.id)) : allClips.filter(clip => clip.creatorId === profile.id);
  const normalized = searchTerm.toLowerCase();
  const results = normalized ? allClips.filter(clip => `${clip.caption} ${clip.tags.join(' ')} ${allCreators.find(person => person.id === clip.creatorId)?.handle ?? 'you'}`.toLowerCase().includes(normalized)) : [];
  const users = normalized ? [...allCreators, ownCreator].filter(person => `${person.name} ${person.handle} ${person.bio}`.toLowerCase().includes(normalized)) : [];
  const activity = [...comments.filter(comment => comment.own).map(comment => ({ id: comment.id, text: `You commented: “${comment.body}”`, clipId: comment.clipId })), ...liked.map(id => ({ id: `like-${id}`, text: `You liked a video`, clipId: id })), ...followed.filter(id => id !== 'milo').map(id => ({ id: `follow-${id}`, text: `You followed @${allCreators.find(person => person.id === id)?.handle}`, clipId: '' }))];

  return <main className={`${s.app} ${tab === 'home' ? s.dark : ''}`} onKeyDown={event => { if (tab !== 'home' || commentFor || !(event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'PageDown' || event.key === 'PageUp')) return; if (event.target instanceof Element && event.target.closest('input,textarea,button')) return; event.preventDefault(); move(event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1); }} tabIndex={-1}>
    {tab === 'home' && <section className={s.feed} aria-label={detail ? 'Video detail' : `${feed} video feed`} onTouchStart={event => { if (event.target instanceof Element && event.target.closest('button,input,textarea')) return; touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start || commentFor) return; const dx = start.x - event.changedTouches[0].clientX; const dy = start.y - event.changedTouches[0].clientY; if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) { swipedAt.current = Date.now(); move(dy > 0 ? 1 : -1); } }} onTouchCancel={() => { touchStart.current = null; }} onWheel={event => { if (commentFor || event.target instanceof Element && event.target.closest('input,textarea')) return; if (Date.now() - wheelAt.current < 420) { wheelDelta.current = 0; return; } const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1); wheelDelta.current += delta; if (Math.abs(wheelDelta.current) < 45) return; const direction = wheelDelta.current > 0 ? 1 : -1; wheelDelta.current = 0; wheelAt.current = Date.now(); move(direction); }}>
      {(!activeFeed.length && !detail) ? <div className={s.emptyFollowing}><h2>Your Following feed is empty</h2><p>Follow a creator from For You to see their videos here.</p><button onClick={() => setFeed('For You')}>Explore For You</button></div> : <>
        <video key={active.id} ref={videoRef} className={s.video} src={active.src} poster={active.poster || undefined} muted={muted} loop playsInline preload="metadata" onError={() => { setFailedVideoId(active.id); setPaused(true); }} onTimeUpdate={event => { const video = event.currentTarget; setProgress(video.duration ? video.currentTime / video.duration : 0); }} onClick={() => { if (Date.now() - swipedAt.current > 400) setPaused(value => !value); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPaused(value => !value); } }} tabIndex={0} aria-label={`${paused ? 'Play' : 'Pause'} video: ${active.caption}`} />
        <div className={s.videoShade} aria-hidden="true"/>
        {mediaError ? <div className={s.feedNotice} role="status"><strong>Video unavailable</strong><span>This source could not play here.</span><button onClick={() => move(1)}>Next video</button></div> : paused && <button className={s.centerPlay} onClick={() => setPaused(false)} aria-label="Play video"><Icon name="play" filled/></button>}
        {!detail && activeFeed.indexOf(active) === activeFeed.length - 1 && <div className={s.feedEdge} role="status">{feed === 'Following' ? 'You’re caught up with followed creators' : loadingMore ? 'Loading more videos…' : feedError ? <>More videos could not load. <button onClick={() => void loadMore()}>Retry</button></> : feedExhausted ? 'You’re caught up' : null}</div>}
        <header className={s.feedTop}>{detail ? <button className={s.topBack} onClick={backVideo} aria-label="Back"><Icon name="back"/></button> : <span className={s.topSpacer}/>}{detail ? <strong>Video</strong> : <div className={s.feedTabs}><button className={feed === 'Following' ? s.selectedFeed : ''} onClick={() => { pendingAdvance.current = false; setFeed('Following'); setProgress(0); setPaused(false); }}>Following</button><span aria-hidden="true"/> <button className={feed === 'For You' ? s.selectedFeed : ''} onClick={() => { pendingAdvance.current = false; setFeed('For You'); setProgress(0); setPaused(false); }}>For You</button></div>}<button className={s.topSearch} onClick={() => navigate('search')} aria-label="Search"><Icon name="search"/></button></header>
        <div className={s.actionRail}>
          <button className={s.avatarAction} onClick={() => openCreator(activeCreator.id)} aria-label={`Open ${activeCreator.handle} profile`}><Avatar creator={activeCreator}/>{!followed.includes(activeCreator.id) && <span className={s.followPlus}>+</span>}</button>
          <button className={liked.includes(active.id) ? s.heartActive : ''} onClick={() => toggle(liked, setLiked, active.id)} aria-label={liked.includes(active.id) ? 'Unlike video' : 'Like video'} aria-pressed={liked.includes(active.id)}><Icon name="heart" filled/><span>{compact(active.likes + Number(liked.includes(active.id)))}</span></button>
          <button onClick={() => { setCommentFor(active.id); setPaused(true); }} aria-label="Open comments"><Icon name="comment" filled/><span>{compact(active.comments + comments.filter(comment => comment.clipId === active.id && comment.own).length)}</span></button>
          <button className={saved.includes(active.id) ? s.saveActive : ''} onClick={() => toggle(saved, setSaved, active.id)} aria-label={saved.includes(active.id) ? 'Remove from favorites' : 'Save to favorites'} aria-pressed={saved.includes(active.id)}><Icon name="bookmark" filled/><span>{compact(active.saves + Number(saved.includes(active.id)))}</span></button>
          <button onClick={share} aria-label="Share video"><Icon name="share" filled/><span>Share</span></button>
          <button className={s.record} onClick={() => setToast(active.sound)} aria-label={`Sound: ${active.sound}`}><span><Icon name="music"/></span></button>
        </div>
        <div className={s.videoInfo}><button className={s.creatorName} onClick={() => openCreator(activeCreator.id)}>@{activeCreator.handle}</button><p>{active.caption} {active.tags.map(tag => <button key={tag} onClick={() => { setQuery(tag); setSearchTerm(tag); navigate('search'); }}>#{tag}</button>)}</p><div className={s.sound}><Icon name="music"/><span>{active.sound}</span></div></div>
        <button className={s.mute} onClick={() => setMuted(value => !value)} aria-label={muted ? 'Unmute' : 'Mute'}><Icon name={muted ? 'mute' : 'volume'}/></button>
        <input className={s.progress} type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={event => { const video = videoRef.current; if (video && video.duration) video.currentTime = video.duration * Number(event.target.value) / 100; }} aria-label="Video position" style={{ '--progress': `${progress * 100}%` } as CSSProperties}/>
      </>}
    </section>}

    {tab === 'search' && <section className={s.page} aria-label="Search"><form className={s.searchHeader} onSubmit={submitSearch}><label className={s.searchBox}><Icon name="search"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search videos and creators" autoFocus/>{query && <button type="button" onClick={() => { setQuery(''); setSearchTerm(''); }} aria-label="Clear search"><Icon name="close"/></button>}</label><button type="submit" className={s.searchGo}>Search</button></form>{searchTerm ? <><div className={s.tabStrip}>{(['Top', 'Videos', 'Users'] as const).map(kind => <button key={kind} className={kind === searchKind ? s.stripActive : ''} onClick={() => setSearchKind(kind)}>{kind}</button>)}</div><div className={s.pageScroll}>{(searchKind === 'Top' || searchKind === 'Users') && users.length > 0 && <><h2 className={s.listHeading}>Accounts</h2>{users.map(person => <button key={person.id} className={s.userResult} onClick={() => openCreator(person.id)}><Avatar creator={person}/><span><strong>{person.name}</strong><small>@{person.handle} · {person.followers} followers</small></span><Icon name="chevron"/></button>)}</>}{(searchKind === 'Top' || searchKind === 'Videos') && <><h2 className={s.listHeading}>Videos</h2>{results.length ? <VideoGrid items={results} onOpen={openVideo}/> : <p className={s.emptyText}>No videos match “{searchTerm}”.</p>}</>}{searchKind === 'Users' && !users.length && <p className={s.emptyText}>No accounts match “{searchTerm}”.</p>}</div></> : <div className={s.pageScroll}><h2 className={s.listHeading}>Try searching for</h2>{['cat', 'dance', 'remix', 'cozy'].map(term => <button key={term} className={s.suggestion} onClick={() => { setQuery(term); setSearchTerm(term); }}><Icon name="search"/><span>{term}</span><Icon name="chevron"/></button>)}</div>}</section>}

    {tab === 'inbox' && <section className={s.page} aria-label="Inbox"><header className={s.pageHeader}><h1>Inbox</h1><button onClick={() => setToast('Activity is local to this preview')} aria-label="Inbox information"><Icon name="more"/></button></header><div className={s.pageScroll}><div className={s.inboxIntro}><span className={s.inboxCircle}><Icon name="inbox"/></span><span><strong>Activity</strong><small>Likes, comments and follows from this preview</small></span><Icon name="chevron"/></div><h2 className={s.listHeading}>Recent</h2>{activity.length ? activity.map(item => <button key={item.id} className={s.activityItem} onClick={() => item.clipId && openVideo(item.clipId)}><span className={s.activityGlyph}><Icon name={item.id.startsWith('like-') ? 'heart' : item.id.startsWith('follow-') ? 'profile' : 'comment'}/></span><span>{item.text}</span>{item.clipId && <Icon name="chevron"/>}</button>) : <div className={s.emptyState}><Icon name="inbox"/><h2>Nothing here yet</h2><p>Your likes, comments and follows in this preview will appear here.</p><button onClick={() => navigate('home')}>Watch videos</button></div>}</div></section>}

    {tab === 'profile' && <section className={s.page} aria-label={viewedCreator ? `${profile.name} profile` : 'Your profile'}><header className={s.pageHeader}>{viewedCreator ? <button onClick={() => { setCreatorId(null); setTab(returnTab); }} aria-label="Back"><Icon name="back"/></button> : <span className={s.headerBalance}/>}<h1>{profile.handle}</h1><button onClick={() => setToast('This is a local profile preview')} aria-label="More profile options"><Icon name="more"/></button></header><div className={s.pageScroll}><div className={s.profileSummary}><Avatar creator={profile} size="large"/><strong>{profile.name}</strong><span>@{profile.handle}</span><div className={s.stats}><span><b>{profile.id === 'you' ? '0' : '213'}</b><small>Following</small></span><span><b>{profile.followers}</b><small>Followers</small></span><span><b>{profile.likes}</b><small>Likes</small></span></div><div className={s.profileActions}>{viewedCreator ? <button className={followed.includes(profile.id) ? s.followingButton : s.followButton} onClick={() => toggle(followed, setFollowed, profile.id)}>{followed.includes(profile.id) ? 'Following' : 'Follow'}</button> : <button className={s.followingButton} onClick={() => setToast('Profile editing is unavailable in this preview')}>Edit profile</button>}<button className={s.profileIconButton} onClick={() => setToast(`@${profile.handle} · ${profile.bio}`)} aria-label="About profile"><Icon name="chevron"/></button></div><p>{profile.bio}</p>{profile.sourceUrl && <a className={s.sourceLink} href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">Original video and license on Wikimedia Commons</a>}</div><div className={s.profileTabs}><button className={profileKind === 'posts' ? s.profileTabActive : ''} onClick={() => setProfileKind('posts')} aria-label="Posts"><Icon name="grid"/></button>{!viewedCreator && <><button className={profileKind === 'saved' ? s.profileTabActive : ''} onClick={() => setProfileKind('saved')} aria-label="Favorites"><Icon name="bookmark"/></button><button className={profileKind === 'liked' ? s.profileTabActive : ''} onClick={() => setProfileKind('liked')} aria-label="Liked videos"><Icon name="heart"/></button></>}</div>{profileClips.length ? <VideoGrid items={profileClips} onOpen={openVideo}/> : <div className={s.emptyState}><Icon name={profileKind === 'posts' ? 'grid' : profileKind === 'liked' ? 'heart' : 'bookmark'}/><h2>{profileKind === 'posts' ? 'No videos yet' : profileKind === 'liked' ? 'No liked videos yet' : 'No favorites yet'}</h2><p>{profileKind === 'posts' ? 'Use the + button to add a local video.' : 'Videos you collect while browsing will appear here.'}</p></div>}</div></section>}

    <nav className={s.bottomNav} aria-label="Main navigation"><NavButton tab="home" current={tab} label="Home" icon="home" onClick={() => navigate('home')}/><NavButton tab="search" current={tab} label="Discover" icon="search" onClick={() => navigate('search')}/><NavButton tab="create" current={tab} label="Create" icon="plus" onClick={() => { setComposer(true); setPaused(true); }}/><NavButton tab="inbox" current={tab} label="Inbox" icon="inbox" onClick={() => navigate('inbox')}/><NavButton tab="profile" current={tab} label="Profile" icon="profile" onClick={() => navigate('profile')}/></nav>

    {commentFor && <div className={s.sheetScrim} onClick={() => { setCommentFor(null); setPaused(false); }}><section className={s.commentsSheet} role="dialog" aria-modal="true" aria-label="Comments" onClick={event => event.stopPropagation()}><div className={s.sheetHandle}/><header><strong>{compact((allClips.find(clip => clip.id === commentFor)?.comments ?? 0) + currentComments.filter(comment => comment.own).length)} comments</strong><button onClick={() => { setCommentFor(null); setPaused(false); }} aria-label="Close comments"><Icon name="close"/></button></header><div className={s.commentList}>{currentComments.map(comment => <div className={s.comment} key={comment.id}><span className={s.commentAvatar}>{comment.author.charAt(0).toUpperCase()}</span><div><strong>{comment.author}</strong><p>{comment.body}</p><small>{comment.time} · <button onClick={() => { setCommentText(`@${comment.author} `); }}>Reply</button></small></div><button className={commentLikes.includes(comment.id) ? s.commentLiked : ''} onClick={() => toggle(commentLikes, setCommentLikes, comment.id)} aria-label={`Like comment by ${comment.author}`} aria-pressed={commentLikes.includes(comment.id)}><Icon name="heart" filled/><small>{comment.likes + Number(commentLikes.includes(comment.id))}</small></button></div>)}</div><form className={s.commentForm} onSubmit={submitComment}><span className={s.commentAvatar}>Y</span><input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Add comment..." aria-label="Add comment"/><button disabled={!commentText.trim()} aria-label="Post comment"><Icon name="send"/></button></form></section></div>}

    {composer && <div className={s.composeOverlay}><section className={s.compose} role="dialog" aria-modal="true" aria-label="Create post"><header><button onClick={() => { setComposer(false); setFile(null); }} aria-label="Close"><Icon name="close"/></button><h2>New post</h2><span/></header><form onSubmit={publish}><label className={s.uploadBox}><Icon name="plus"/><strong>{file ? file.name : 'Select a video'}</strong><small>Video files on your device · local preview only</small><input type="file" accept="video/*" onChange={event => setFile(event.target.files?.[0] ?? null)}/></label><label className={s.captionLabel}>Caption<textarea value={caption} onChange={event => setCaption(event.target.value)} placeholder="Describe your video..." maxLength={160}/></label><button className={s.publish} disabled={!file || !caption.trim()}>Post to preview</button></form></section></div>}
    {toast && <div className={s.toast} role="status">{toast}</div>}
  </main>;
}
