'use client';

import { TikTok_Sans } from 'next/font/google';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { clips as seedClips, compact, creators, seedComments, type Clip, type Comment, type Creator } from '../model/data';
import { loadCommonsBatch } from '../model/commons';
import { feedStep } from '../model/feed-step';
import { Icon, type IconName } from './icons';
import s from './tiktok.module.css';
import { localRect, useCloneScale } from '../../scale';

// TikTok's own open-source typeface (OFL, Google Fonts), used by the 2026 app chrome.
const tiktokSans = TikTok_Sans({ subsets: ['latin'], display: 'swap', preload: false });

type Tab = 'home' | 'friends' | 'search' | 'inbox' | 'profile';
type Feed = 'For You' | 'Following';
type Burst = { id: number; x: number; y: number; tilt: number };
type Gesture = { x: number; y: number; t: number; axis: 'x' | 'y' | null };

const speeds = [0.5, 1, 1.5, 2] as const;
const trending = ['cat jump', 'dance practice', 'cozy', 'remix edit', 'flamingos', 'science'];

function Avatar({ creator, size = 'medium' }: { creator: Pick<Creator, 'avatar'>; size?: 'tiny' | 'small' | 'medium' | 'large' }) {
  return <span className={`${s.avatar} ${s[size]}`} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar photos stay plain DOM for the html2canvas transforms */}
    {creator.avatar ? <img src={creator.avatar} alt="" crossOrigin="anonymous" draggable={false}/> : <Icon name="profile" filled/>}
  </span>;
}

function NavButton({ tab, current, label, icon, badge, onClick }: { tab: Tab | 'create'; current: Tab; label: string; icon: IconName; badge?: number; onClick: () => void }) {
  if (tab === 'create') return <button type="button" className={s.navItem} onClick={onClick} aria-label={label}><span className={s.createIcon}><Icon name="plus"/></span></button>;
  return <button type="button" className={`${s.navItem} ${current === tab ? s.navActive : ''}`} onClick={onClick} aria-label={label} aria-current={current === tab ? 'page' : undefined}>
    <span className={s.navIcon}><Icon name={icon} filled={current === tab}/>{!!badge && <b className={s.navBadge}>{badge}</b>}</span><span className={s.navLabel}>{label}</span>
  </button>;
}

function VideoGrid({ items, onOpen }: { items: Clip[]; onOpen: (id: string) => void }) {
  return <div className={s.videoGrid}>{items.map(clip => <button key={clip.id} className={s.gridItem} onClick={() => onOpen(clip.id)} aria-label={`Watch ${clip.caption}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- video frame posters are local generated assets */}
    {clip.poster ? <img src={clip.poster} alt="" draggable={false}/> : <span className={s.localTile}><Icon name="play"/></span>}<span className={s.viewCount}><Icon name="play" filled={false}/> {clip.views}</span>
  </button>)}</div>;
}

function Frame({ src, className }: { src: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- poster frames stay plain DOM for the html2canvas transforms
  return <img className={className} src={src} alt="" draggable={false}/>;
}

function formatTime(seconds: number) { const whole = Math.max(0, Math.floor(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; }

export default function TikTokMobile() {
  const scale = useCloneScale();
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
  const [commentDislikes, setCommentDislikes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchKind, setSearchKind] = useState<'Top' | 'Users' | 'Videos'>('Top');
  const [profileKind, setProfileKind] = useState<'posts' | 'liked' | 'saved'>('posts');
  const [soundOn, setSoundOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [toast, setToast] = useState('');
  const [composer, setComposer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [slide, setSlide] = useState({ offset: 0, animate: false });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [pressMenu, setPressMenu] = useState(false);
  const [clearMode, setClearMode] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [sheetDrag, setSheetDrag] = useState<number | null>(null);
  const [seenActivity, setSeenActivity] = useState(0);
  const createdUrls = useRef<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const tapTimer = useRef(0);
  const pressTimer = useRef(0);
  const settleTimer = useRef(0);
  const settling = useRef(false);
  const longPressed = useRef(false);
  const burstSeq = useRef(0);
  const sheetStart = useRef<{ y: number; t: number } | null>(null);
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
  const ownCreator: Creator = { id: 'you', handle: 'your.profile', name: 'Your profile', bio: '', following: String(followed.length), followers: '0', likes: compact(allClips.filter(clip => clip.creatorId === 'you').reduce((total, clip) => total + clip.likes, 0)) };
  const creatorOf = (id: string) => allCreators.find(person => person.id === id) ?? ownCreator;
  const activeCreator = creatorOf(active.creatorId);
  const viewedCreator = allCreators.find(person => person.id === creatorId) ?? null;
  const currentComments = comments.filter(comment => comment.clipId === commentFor);
  const pageList = detail ? allClips : activeFeed;
  const pageIndex = pageList.findIndex(clip => clip.id === displayedId);
  const previousClip = pageIndex > 0 ? pageList[pageIndex - 1] : null;
  const nextClip = pageIndex >= 0 ? pageList[pageIndex + 1] ?? null : null;
  const activity = [...comments.filter(comment => comment.own).map(comment => ({ id: comment.id, text: `You commented: “${comment.body}”`, clipId: comment.clipId })), ...liked.map(id => ({ id: `like-${id}`, text: 'You liked a video', clipId: id })), ...followed.filter(id => id !== 'milo').map(id => ({ id: `follow-${id}`, text: `You followed ${allCreators.find(person => person.id === id)?.handle}`, clipId: '' }))];
  const unseen = Math.max(0, activity.length - seenActivity);

  useEffect(() => { const video = videoRef.current; if (!video) return; if (tab === 'home' && !composer && !paused && !pressMenu) { video.play().catch(() => { if (video.muted) { setPaused(true); return; } video.muted = true; setSoundOn(false); video.play().catch(() => setPaused(true)); }); } else video.pause(); }, [active.id, tab, composer, paused, pressMenu]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed, active.id]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const urls = createdUrls.current; return () => { urls.forEach(url => URL.revokeObjectURL(url)); }; }, []);
  useEffect(() => () => { requestRef.current?.abort(); window.clearTimeout(tapTimer.current); window.clearTimeout(pressTimer.current); window.clearTimeout(settleTimer.current); }, []);
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
    const step = feedStep(pageList.map(clip => clip.id), displayedId, direction > 0 ? 1 : -1, !detail && feed === 'For You' && !feedExhausted);
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
  // Snap paging: the page slides a full screen height, then the next item becomes the active one.
  function settle(direction: -1 | 1) {
    const height = feedRef.current?.clientHeight ?? 0;
    if (!(direction > 0 ? nextClip : previousClip) || !height) { move(direction); setSlide({ offset: 0, animate: true }); return; }
    settling.current = true;
    setSlide({ offset: -direction * height, animate: true });
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => { settling.current = false; move(direction); setSlide({ offset: 0, animate: false }); }, 280);
  }
  function go(direction: -1 | 1) { if (!settling.current) settle(direction); }
  function addBurst(x: number, y: number) {
    burstSeq.current += 1;
    const burst = { id: burstSeq.current, x, y, tilt: Math.round(Math.random() * 30 - 15) };
    setBursts(previous => [...previous, burst]);
    window.setTimeout(() => setBursts(previous => previous.filter(item => item.id !== burst.id)), 950);
  }
  function tap(x: number, y: number) {
    const now = Date.now();
    const previous = lastTap.current;
    if (previous && now - previous.t < 300 && Math.hypot(previous.x - x, previous.y - y) < 80) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = null;
      setLiked(list => list.includes(active.id) ? list : [...list, active.id]);
      addBurst(x, y);
      return;
    }
    lastTap.current = { t: now, x, y };
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => { lastTap.current = null; setPaused(value => !value); }, 280);
  }
  function feedPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (commentFor || pressMenu || settling.current || (event.target instanceof Element && event.target.closest('button,input,textarea,a'))) return;
    gesture.current = { x: event.clientX / scale, y: event.clientY / scale, t: Date.now(), axis: null };
    longPressed.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => { longPressed.current = true; gesture.current = null; window.clearTimeout(tapTimer.current); lastTap.current = null; setPressMenu(true); }, 520);
  }
  function feedPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (!start) return;
    const dx = event.clientX / scale - start.x;
    const dy = event.clientY / scale - start.y;
    if (!start.axis && Math.hypot(dx, dy) > 8) { start.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'; window.clearTimeout(pressTimer.current); }
    if (start.axis === 'y') setSlide({ offset: (dy < 0 ? nextClip : previousClip) ? dy : dy * 0.28, animate: false });
  }
  function feedPointerUp(event: ReactPointerEvent<HTMLElement>) {
    window.clearTimeout(pressTimer.current);
    const start = gesture.current;
    gesture.current = null;
    if (longPressed.current || !start) { longPressed.current = false; return; }
    const dy = event.clientY / scale - start.y;
    if (start.axis === 'y') {
      const height = feedRef.current?.clientHeight ?? 1;
      const velocity = dy / Math.max(1, Date.now() - start.t);
      if (Math.abs(dy) > height * 0.18 || Math.abs(velocity) > 0.45) settle(dy < 0 ? 1 : -1);
      else setSlide({ offset: 0, animate: true });
      return;
    }
    if (!start.axis) { const box = localRect(event.currentTarget, scale); tap(event.clientX / scale - box.left, event.clientY / scale - box.top); }
  }
  function feedPointerCancel() { window.clearTimeout(pressTimer.current); gesture.current = null; setSlide({ offset: 0, animate: true }); }

  function closeComments() { setCommentFor(null); setSheetDrag(null); sheetStart.current = null; }
  function sheetPointerDown(event: ReactPointerEvent<HTMLElement>) { if (event.target instanceof Element && event.target.closest('button')) return; sheetStart.current = { y: event.clientY / scale, t: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); setSheetDrag(0); }
  function sheetPointerMove(event: ReactPointerEvent<HTMLElement>) { if (sheetStart.current) setSheetDrag(Math.max(0, event.clientY / scale - sheetStart.current.y)); }
  function sheetPointerUp(event: ReactPointerEvent<HTMLElement>) { const start = sheetStart.current; sheetStart.current = null; if (!start) return; const dy = event.clientY / scale - start.y; if (dy > 110 || dy / Math.max(1, Date.now() - start.t) > 0.5) closeComments(); else setSheetDrag(null); }

  function navigate(next: Tab) { setTab(next); setCreatorId(null); setDetail(false); setCommentFor(null); setPressMenu(false); setPaused(false); if (next === 'inbox') setSeenActivity(activity.length); }
  function openVideo(id: string) { setReturnTab(tab); setReturnCreatorId(creatorId); setActiveId(id); setProgress(0); setDetail(true); setTab('home'); setCreatorId(null); setPaused(false); }
  function backVideo() { setDetail(false); setTab(returnTab); setCreatorId(returnCreatorId); setPaused(true); }
  function openCreator(id: string) { setReturnTab(tab); setCreatorId(id); setTab('profile'); setDetail(false); setPaused(true); }
  function toggle(list: string[], setter: (value: string[]) => void, id: string) { setter(list.includes(id) ? list.filter(value => value !== id) : [...list, id]); }
  function submitComment(event: FormEvent) { event.preventDefault(); if (!commentFor || !commentText.trim()) return; setComments(previous => [...previous, { id: crypto.randomUUID(), clipId: commentFor, author: 'you', body: commentText.trim(), likes: 0, time: 'now', own: true }]); setCommentText(''); }
  function search(term: string) { setQuery(term); setSearchTerm(term.trim()); }
  function submitSearch(event: FormEvent) { event.preventDefault(); setSearchTerm(query.trim()); }
  function publish(event: FormEvent) { event.preventDefault(); if (!file || !file.type.startsWith('video/') || !caption.trim()) { setToast('Choose a video and add a description.'); return; } const url = URL.createObjectURL(file); createdUrls.current.push(url); const id = crypto.randomUUID(); setAllClips(previous => [{ id, creatorId: 'you', src: url, poster: '', caption: caption.trim(), sound: 'original sound - your.profile', tags: [], likes: 0, comments: 0, saves: 0, shares: 0, views: '0' }, ...previous]); setActiveId(id); setProgress(0); setFeed('For You'); setComposer(false); setFile(null); setCaption(''); navigate('home'); setToast('Posted to this preview only'); }
  async function share() { const text = `${active.caption} — ${activeCreator.handle}`; try { if (navigator.share) await navigator.share({ title: text, url: window.location.href }); else { await navigator.clipboard.writeText(text); setToast('Link copied'); } } catch { setToast('Sharing cancelled'); } }
  const profile = viewedCreator ?? ownCreator;
  const profileClips = profileKind === 'liked' && !viewedCreator ? allClips.filter(clip => liked.includes(clip.id)) : profileKind === 'saved' && !viewedCreator ? allClips.filter(clip => saved.includes(clip.id)) : allClips.filter(clip => clip.creatorId === profile.id);
  const normalized = searchTerm.toLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.some(term => text.toLowerCase().includes(term));
  const results = terms.length ? allClips.filter(clip => matches(`${clip.caption} ${clip.tags.join(' ')} ${creatorOf(clip.creatorId).handle}`)) : [];
  const users = terms.length ? [...allCreators, ownCreator].filter(person => matches(`${person.name} ${person.handle} ${person.bio}`)) : [];
  const followedClips = allClips.filter(clip => followed.includes(clip.creatorId));
  const suggested = allCreators.filter(person => !person.sourceUrl);
  const isLiked = liked.includes(active.id);
  const isSaved = saved.includes(active.id);
  const chromeHidden = clearMode || !!commentFor;
  // Search and pushed creator profiles stay inside the tab they were opened from.
  const navTab: Tab = tab === 'search' ? 'home' : tab === 'profile' && viewedCreator ? returnTab : tab;

  function followButton(person: Creator, compactStyle = false) {
    const following = followed.includes(person.id);
    return <button className={`${compactStyle ? s.smallFollow : s.followButton} ${following ? s.followingState : ''}`} onClick={() => toggle(followed, setFollowed, person.id)}>{following ? 'Following' : 'Follow'}</button>;
  }

  function peek(clip: Clip | null, place: 'previous' | 'next') {
    if (!clip) return null;
    // eslint-disable-next-line @next/next/no-img-element -- neighbouring poster frame shown while the page is dragged
    return <div className={`${s.peek} ${place === 'previous' ? s.peekPrevious : s.peekNext}`} aria-hidden="true">{clip.poster && <img src={clip.poster} alt="" draggable={false}/>}</div>;
  }

  return <main className={`${s.app} ${tiktokSans.className} ${tab === 'home' ? s.dark : ''}`} onPointerDownCapture={() => { if (!soundOn) setSoundOn(true); }} onKeyDown={event => { if (tab !== 'home' || commentFor || !(event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'PageDown' || event.key === 'PageUp')) return; if (event.target instanceof Element && event.target.closest('input,textarea,button')) return; event.preventDefault(); go(event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1); }} tabIndex={-1}>
    {tab === 'home' && <section ref={feedRef} className={`${s.feed} ${commentFor ? s.withSheet : ''}`} aria-label={detail ? 'Video detail' : `${feed} video feed`} onPointerDown={feedPointerDown} onPointerMove={feedPointerMove} onPointerUp={feedPointerUp} onPointerCancel={feedPointerCancel} onContextMenu={event => event.preventDefault()} onWheel={event => { if (commentFor || pressMenu || event.target instanceof Element && event.target.closest('input,textarea')) return; if (Date.now() - wheelAt.current < 420) { wheelDelta.current = 0; return; } const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1); wheelDelta.current += delta; if (Math.abs(wheelDelta.current) < 45) return; const direction = wheelDelta.current > 0 ? 1 : -1; wheelDelta.current = 0; wheelAt.current = Date.now(); go(direction); }}>
      {(!activeFeed.length && !detail) ? <div className={s.emptyFollowing}><h2>No videos from accounts you follow</h2><p>Follow a creator from For You to see their videos here.</p><button onClick={() => setFeed('For You')}>Watch For You</button></div> : <>
        <div className={s.track} style={{ transform: `translate3d(0, ${slide.offset}px, 0)`, transition: slide.animate ? 'transform .28s cubic-bezier(.22,.7,.28,1)' : 'none' }}>
          {peek(previousClip, 'previous')}
          <div className={s.slide}>
            <video key={active.id} ref={videoRef} className={s.video} src={active.src} poster={active.poster || undefined} muted={!soundOn} loop playsInline preload="metadata" onError={() => { setFailedVideoId(active.id); setPaused(true); }} onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={event => { const video = event.currentTarget; setProgress(video.duration ? video.currentTime / video.duration : 0); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPaused(value => !value); } }} tabIndex={0} aria-label={`${paused ? 'Play' : 'Pause'} video: ${active.caption}`} />
            {!commentFor && <div className={s.videoShade} aria-hidden="true"/>}
            {mediaError ? <div className={s.feedNotice} role="status"><strong>Video unavailable</strong><span>This source could not play here.</span><button onClick={() => go(1)}>Next video</button></div> : paused && !commentFor && <span className={s.centerPlay} aria-hidden="true"><Icon name="play"/></span>}
            {!chromeHidden && <>
              <div className={s.actionRail}>
                <div className={s.avatarAction}><button className={s.railAvatar} onClick={() => openCreator(activeCreator.id)} aria-label={`Open ${activeCreator.handle} profile`}><Avatar creator={activeCreator} size="medium"/></button>{activeCreator.id !== 'you' && <button className={`${s.followPlus} ${followed.includes(activeCreator.id) ? s.followDone : ''}`} onClick={() => { if (!followed.includes(activeCreator.id)) setFollowed(list => [...list, activeCreator.id]); }} aria-label={followed.includes(activeCreator.id) ? `Following ${activeCreator.handle}` : `Follow ${activeCreator.handle}`}><Icon name={followed.includes(activeCreator.id) ? 'check' : 'plus'}/></button>}</div>
                <button className={isLiked ? s.heartActive : ''} onClick={() => toggle(liked, setLiked, active.id)} aria-label={isLiked ? 'Unlike video' : 'Like video'} aria-pressed={isLiked}><Icon name="heart"/><span>{compact(active.likes + Number(isLiked))}</span></button>
                <button onClick={() => setCommentFor(active.id)} aria-label="Open comments"><Icon name="comment"/><span>{compact(active.comments + comments.filter(comment => comment.clipId === active.id && comment.own).length)}</span></button>
                <button className={isSaved ? s.saveActive : ''} onClick={() => toggle(saved, setSaved, active.id)} aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isSaved}><Icon name="bookmark"/><span>{compact(active.saves + Number(isSaved))}</span></button>
                <button onClick={share} aria-label="Share video"><Icon name="share"/><span>{active.shares ? compact(active.shares) : 'Share'}</span></button>
                <button className={s.record} onClick={() => setToast(active.sound)} aria-label={`Sound: ${active.sound}`}><span className={s.notes} aria-hidden="true"><i>♪</i><i>♫</i></span><span className={`${s.disc} ${paused ? s.discPaused : ''}`}><Avatar creator={activeCreator} size="tiny"/></span></button>
              </div>
              <div className={s.videoInfo}><button className={s.creatorName} onClick={() => openCreator(activeCreator.id)}>{activeCreator.handle}</button><p>{active.caption} {active.tags.map(tag => <button key={tag} onClick={() => { search(tag); navigate('search'); }}>#{tag}</button>)}</p><div className={s.sound}><Icon name="note"/><span className={s.marquee}><span className={paused ? s.marqueePaused : ''}><span>{active.sound}</span><span aria-hidden="true">{active.sound}</span></span></span></div></div>
            </>}
            {!detail && !commentFor && activeFeed.indexOf(active) === activeFeed.length - 1 && <div className={s.feedEdge} role="status">{feed === 'Following' ? 'You’re all caught up' : loadingMore ? 'Loading more videos…' : feedError ? <>Couldn’t load more videos. <button onClick={() => void loadMore()}>Retry</button></> : feedExhausted ? 'You’re all caught up' : null}</div>}
          </div>
          {peek(nextClip, 'next')}
        </div>
        {bursts.map(burst => <span key={burst.id} className={s.burst} style={{ left: burst.x, top: burst.y, '--tilt': `${burst.tilt}deg` } as CSSProperties} aria-hidden="true"><Icon name="heart"/></span>)}
        {!chromeHidden && <header className={s.feedTop}>{detail ? <button className={s.topIcon} onClick={backVideo} aria-label="Back"><Icon name="back"/></button> : <button className={s.topIcon} onClick={() => setToast('LIVE isn’t available in this preview')} aria-label="LIVE"><Icon name="live"/></button>}{!detail && <div className={s.feedTabs}><button className={feed === 'Following' ? s.selectedFeed : ''} onClick={() => { pendingAdvance.current = false; setFeed('Following'); setProgress(0); setPaused(false); }}>Following{feed !== 'Following' && followedClips.length > 0 && <i className={s.tabDot} aria-hidden="true"/>}</button><span aria-hidden="true"/><button className={feed === 'For You' ? s.selectedFeed : ''} onClick={() => { pendingAdvance.current = false; setFeed('For You'); setProgress(0); setPaused(false); }}>For You</button></div>}<button className={s.topIcon} onClick={() => navigate('search')} aria-label="Search"><Icon name="search"/></button></header>}
        {clearMode && <button className={s.exitClear} onClick={() => setClearMode(false)}>Exit clear mode</button>}
        {!commentFor && <input className={`${s.progress} ${scrubbing || paused ? s.progressActive : ''}`} type="range" min="0" max="1000" value={Math.round(progress * 1000)} onPointerDown={() => setScrubbing(true)} onPointerUp={() => setScrubbing(false)} onBlur={() => setScrubbing(false)} onChange={event => { const video = videoRef.current; const value = Number(event.target.value) / 1000; setProgress(value); if (video && video.duration) video.currentTime = video.duration * value; }} aria-label="Video position" style={{ '--progress': `${progress * 100}%` } as CSSProperties}/>}
        {scrubbing && duration > 0 && <div className={s.scrubTime} aria-hidden="true"><b>{formatTime(progress * duration)}</b> / {formatTime(duration)}</div>}
      </>}
    </section>}

    {tab === 'friends' && <section className={s.page} aria-label="Friends"><header className={s.pageHeader}><button onClick={() => navigate('search')} aria-label="Find friends"><Icon name="addUser"/></button><h1>Friends</h1><button onClick={() => navigate('search')} aria-label="Search"><Icon name="search"/></button></header><div className={s.pageScroll}>{followedClips.length > 0 && <><h2 className={s.listHeading}>From accounts you follow</h2><VideoGrid items={followedClips} onOpen={openVideo}/></>}<h2 className={s.listHeading}>Suggested accounts</h2>{suggested.map(person => <div key={person.id} className={s.userRow}><button className={s.userOpen} onClick={() => openCreator(person.id)}><Avatar creator={person} size="medium"/><span><strong>{person.name}</strong><small>{person.handle} · {person.followers} followers</small></span></button>{followButton(person, true)}</div>)}</div></section>}

    {tab === 'search' && <section className={s.page} aria-label="Search"><form className={s.searchHeader} onSubmit={submitSearch}><button type="button" className={s.searchBack} onClick={() => navigate('home')} aria-label="Back"><Icon name="back"/></button><label className={s.searchBox}><Icon name="search"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search videos and creators" autoFocus/>{query && <button type="button" onClick={() => { setQuery(''); setSearchTerm(''); }} aria-label="Clear search"><Icon name="close"/></button>}</label><button type="submit" className={s.searchGo}>Search</button></form>{searchTerm ? <><div className={s.tabStrip}>{(['Top', 'Users', 'Videos'] as const).map(kind => <button key={kind} className={kind === searchKind ? s.stripActive : ''} onClick={() => setSearchKind(kind)}>{kind}</button>)}</div><div className={s.pageScroll}>{(searchKind === 'Top' || searchKind === 'Users') && users.length > 0 && <div className={s.userResults}>{(searchKind === 'Top' ? users.slice(0, 2) : users).map(person => <div key={person.id} className={s.userRow}><button className={s.userOpen} onClick={() => openCreator(person.id)}><Avatar creator={person} size="medium"/><span><strong>{person.handle}</strong><small>{person.name} · {person.followers} followers</small></span></button>{person.id !== 'you' && followButton(person, true)}</div>)}</div>}{(searchKind === 'Top' || searchKind === 'Videos') && (results.length ? <div className={s.cardGrid}>{results.map(clip => { const author = creatorOf(clip.creatorId); return <button key={clip.id} className={s.resultCard} onClick={() => openVideo(clip.id)} aria-label={`Watch ${clip.caption}`}><span className={s.cardPoster}>{clip.poster ? <Frame src={clip.poster}/> : <span className={s.localTile}><Icon name="play"/></span>}</span><span className={s.cardCaption}>{clip.caption} {clip.tags.map(tag => `#${tag}`).join(' ')}</span><span className={s.cardMeta}><Avatar creator={author} size="tiny"/><span>{author.handle}</span><Icon name="heart" filled={false}/><span>{compact(clip.likes)}</span></span></button>; })}</div> : <p className={s.emptyText}>No results for “{searchTerm}”.</p>)}{searchKind === 'Users' && !users.length && <p className={s.emptyText}>No accounts match “{searchTerm}”.</p>}</div></> : <div className={s.pageScroll}><h2 className={s.listHeading}>You may like</h2>{trending.map((term, index) => <button key={term} className={s.suggestion} onClick={() => search(term)}><i className={index < 2 ? s.hotDot : s.dot} aria-hidden="true"/><span>{term}</span>{index < 2 && <Icon name="trend"/>}</button>)}</div>}</section>}

    {tab === 'inbox' && <section className={s.page} aria-label="Inbox"><header className={s.pageHeader}><span className={s.headerBalance}/><h1>Inbox</h1><button onClick={() => setToast('Messages aren’t available in this preview')} aria-label="New message"><Icon name="message"/></button></header><div className={s.pageScroll}>
      <div className={s.inboxRow}><span className={`${s.inboxCircle} ${s.followerCircle}`}><Icon name="follower"/></span><span><strong>New followers</strong><small>No new followers in this preview</small></span></div>
      <div className={s.inboxRow}><span className={`${s.inboxCircle} ${s.activityCircle}`}><Icon name="bell" filled/></span><span><strong>Activity</strong><small>{activity.length ? activity[activity.length - 1].text : 'Likes, comments and follows appear here'}</small></span>{activity.length > 0 && <b className={s.rowCount}>{activity.length}</b>}</div>
      <div className={s.inboxRow}><span className={`${s.inboxCircle} ${s.systemCircle}`}><Icon name="system"/></span><span><strong>System notifications</strong><small>Posts stay on this device in this preview</small></span></div>
      {activity.length > 0 && <><h2 className={s.listHeading}>Activity</h2>{activity.map(item => <button key={item.id} className={s.activityItem} onClick={() => item.clipId && openVideo(item.clipId)}><Avatar creator={ownCreator} size="medium"/><span>{item.text}<small>now</small></span>{item.clipId && (() => { const clip = allClips.find(entry => entry.id === item.clipId); return clip?.poster ? <Frame src={clip.poster} className={s.activityThumb}/> : null; })()}</button>)}</>}
    </div></section>}

    {tab === 'profile' && <section className={s.page} aria-label={viewedCreator ? `${profile.name} profile` : 'Your profile'}><header className={s.pageHeader}>{viewedCreator ? <button onClick={() => { setCreatorId(null); setTab(returnTab); }} aria-label="Back"><Icon name="back"/></button> : <button onClick={() => navigate('friends')} aria-label="Add friends"><Icon name="addUser"/></button>}<h1>{profile.name}{!viewedCreator && <Icon name="caret"/>}</h1>{viewedCreator ? <span className={s.headerPair}><button onClick={() => setToast('Notifications aren’t available in this preview')} aria-label="Post notifications"><Icon name="bell"/></button><button onClick={() => setToast(`${profile.handle} · ${profile.bio}`)} aria-label="Share profile"><Icon name="shareOut"/></button></span> : <button onClick={() => setToast('Settings aren’t available in this preview')} aria-label="Menu"><Icon name="menu"/></button>}</header><div className={s.pageScroll}><div className={s.profileSummary}><span className={s.profileAvatar}><Avatar creator={profile} size="large"/>{!viewedCreator && <i className={s.addStory} aria-hidden="true"><Icon name="plus"/></i>}</span><span className={s.profileHandle}>@{profile.handle}</span><div className={s.stats}><span><b>{profile.following}</b><small>Following</small></span><span><b>{profile.followers}</b><small>Followers</small></span><span><b>{profile.likes}</b><small>Likes</small></span></div><div className={s.profileActions}>{viewedCreator ? <>{followed.includes(profile.id) ? <button className={s.grayButton} onClick={() => setToast('Messages aren’t available in this preview')}>Message</button> : followButton(profile)}{followed.includes(profile.id) ? <button className={s.squareButton} onClick={() => toggle(followed, setFollowed, profile.id)} aria-label="Unfollow"><Icon name="userCheck"/></button> : <button className={s.grayButton} onClick={() => setToast('Messages aren’t available in this preview')}>Message</button>}<button className={s.squareButton} onClick={() => navigate('friends')} aria-label="Suggested accounts"><Icon name="caret"/></button></> : <><button className={s.grayButton} onClick={() => setToast('Profile editing isn’t available in this preview')}>Edit profile</button><button className={s.grayButton} onClick={() => setToast('Profile link copied')}>Share profile</button><button className={s.squareButton} onClick={() => navigate('friends')} aria-label="Add friends"><Icon name="addUser"/></button></>}</div>{profile.bio ? <p>{profile.bio}</p> : <button className={s.addBio} onClick={() => setToast('Profile editing isn’t available in this preview')}>+ Add bio</button>}{profile.sourceUrl && <a className={s.sourceLink} href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">Original video and license on Wikimedia Commons</a>}</div><div className={s.profileTabs}><button className={profileKind === 'posts' ? s.profileTabActive : ''} onClick={() => setProfileKind('posts')} aria-label="Videos"><Icon name="grid"/></button>{!viewedCreator && <><button className={profileKind === 'saved' ? s.profileTabActive : ''} onClick={() => setProfileKind('saved')} aria-label="Favorites"><Icon name="bookmark" filled={false}/></button><button className={profileKind === 'liked' ? s.profileTabActive : ''} onClick={() => setProfileKind('liked')} aria-label="Liked videos"><Icon name="heart" filled={false}/></button></>}</div>{profileClips.length ? <VideoGrid items={profileClips} onOpen={openVideo}/> : <div className={s.emptyState}><Icon name={profileKind === 'posts' ? 'grid' : profileKind === 'liked' ? 'lock' : 'bookmark'} filled={false}/><h2>{profileKind === 'posts' ? (viewedCreator ? 'No videos yet' : 'Share a fun video you’ve recorded recently') : profileKind === 'liked' ? 'This user’s liked videos are private' : 'Favorite posts'}</h2><p>{profileKind === 'posts' ? (viewedCreator ? 'Videos posted by this account will appear here.' : 'Use + to add a local video to this preview.') : profileKind === 'liked' ? 'Videos liked in this preview appear here.' : 'Favorites you add while browsing appear here.'}</p>{profileKind === 'posts' && !viewedCreator && <button onClick={() => setComposer(true)}>Upload</button>}</div>}</div></section>}

    <nav className={s.bottomNav} aria-label="Main navigation"><NavButton tab="home" current={navTab} label="Home" icon="home" onClick={() => navigate('home')}/><NavButton tab="friends" current={navTab} label="Friends" icon="friends" onClick={() => navigate('friends')}/><NavButton tab="create" current={navTab} label="Create" icon="plus" onClick={() => { setComposer(true); setPaused(true); }}/><NavButton tab="inbox" current={navTab} label="Inbox" icon="inbox" badge={tab === 'inbox' ? 0 : unseen} onClick={() => navigate('inbox')}/><NavButton tab="profile" current={navTab} label="Profile" icon="profile" onClick={() => navigate('profile')}/></nav>

    {commentFor && <div className={s.sheetLayer}><button className={s.sheetScrim} onClick={closeComments} aria-label="Close comments"/><section className={`${s.commentsSheet} ${sheetDrag === null ? s.sheetRest : ''}`} style={{ transform: `translateY(${sheetDrag ?? 0}px)` }} role="dialog" aria-modal="true" aria-label="Comments"><header onPointerDown={sheetPointerDown} onPointerMove={sheetPointerMove} onPointerUp={sheetPointerUp} onPointerCancel={() => { sheetStart.current = null; setSheetDrag(null); }}><strong>{compact((allClips.find(clip => clip.id === commentFor)?.comments ?? 0) + currentComments.filter(comment => comment.own).length)} comments</strong><button onClick={closeComments} aria-label="Close comments"><Icon name="close"/></button></header><div className={s.commentList}>{currentComments.length ? currentComments.map(comment => <div className={s.comment} key={comment.id}><Avatar creator={{ avatar: comment.avatar }} size="small"/><div><strong>{comment.own ? ownCreator.handle : comment.author}</strong><p>{comment.body}</p><small>{comment.time}<button onClick={() => setCommentText(`@${comment.author} `)}>Reply</button></small></div><div className={s.commentActions}><button className={commentLikes.includes(comment.id) ? s.commentLiked : ''} onClick={() => toggle(commentLikes, setCommentLikes, comment.id)} aria-label={`Like comment by ${comment.author}`} aria-pressed={commentLikes.includes(comment.id)}><Icon name="heart" filled={commentLikes.includes(comment.id)}/><small>{comment.likes + Number(commentLikes.includes(comment.id)) || ''}</small></button><button className={commentDislikes.includes(comment.id) ? s.commentDisliked : ''} onClick={() => toggle(commentDislikes, setCommentDislikes, comment.id)} aria-label={`Dislike comment by ${comment.author}`} aria-pressed={commentDislikes.includes(comment.id)}><Icon name="dislike" filled={false}/></button></div></div>) : <p className={s.noComments}>Be the first to comment</p>}</div><form className={s.commentForm} onSubmit={submitComment}><Avatar creator={ownCreator} size="small"/><label className={s.commentInput}><input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Add comment..." aria-label="Add comment"/><button type="button" onClick={() => setToast('Photo comments aren’t available in this preview')} aria-label="Add photo"><Icon name="image"/></button><button type="button" onClick={() => setCommentText(text => `${text}😂`)} aria-label="Add emoji"><Icon name="emoji"/></button><button type="button" onClick={() => setCommentText(text => `${text}@`)} aria-label="Mention"><Icon name="at"/></button></label>{commentText.trim() && <button className={s.sendComment} aria-label="Post comment"><Icon name="arrowUp"/></button>}</form></section></div>}

    {pressMenu && <div className={s.sheetLayer}><button className={`${s.sheetScrim} ${s.dimScrim}`} onClick={() => setPressMenu(false)} aria-label="Close options"/><section className={`${s.pressSheet} ${s.sheetRest}`} role="dialog" aria-modal="true" aria-label="Video options"><div className={s.pressSpeed}><span className={s.pressIcon}><Icon name="speed"/></span><strong>Speed</strong><span className={s.speedPills}>{speeds.map(value => <button key={value} className={speed === value ? s.speedActive : ''} onClick={() => setSpeed(value)}>{value}x</button>)}</span></div><button onClick={() => { setPressMenu(false); setClearMode(true); }}><span className={s.pressIcon}><Icon name="clear"/></span>Clear mode</button><button onClick={() => { toggle(saved, setSaved, active.id); setPressMenu(false); }}><span className={s.pressIcon}><Icon name="bookmark" filled={false}/></span>{isSaved ? 'Remove from Favorites' : 'Add to Favorites'}</button><button onClick={() => { setPressMenu(false); setToast('You’ll see fewer videos like this'); go(1); }}><span className={s.pressIcon}><Icon name="notInterested"/></span>Not interested</button></section></div>}

    {composer && <div className={s.composeOverlay}><section className={s.compose} role="dialog" aria-modal="true" aria-label="Post"><header><button onClick={() => { setComposer(false); setFile(null); }} aria-label="Close"><Icon name="back"/></button></header><form onSubmit={publish}><div className={s.composeTop}><textarea value={caption} onChange={event => setCaption(event.target.value)} placeholder="Add description..." maxLength={160} aria-label="Description"/><label className={s.uploadBox}><Icon name="plus"/><strong>{file ? file.name : 'Select video'}</strong><input type="file" accept="video/*" onChange={event => setFile(event.target.files?.[0] ?? null)}/></label></div><div className={s.composeChips}><button type="button" onClick={() => setCaption(text => `${text}#`)}># Hashtags</button><button type="button" onClick={() => setCaption(text => `${text}@`)}>@ Mention</button></div><p className={s.composeNote}>Local preview only · nothing is uploaded</p><div className={s.composeActions}><button type="button" className={s.drafts} onClick={() => setToast('Drafts aren’t saved in this preview')}>Drafts</button><button className={s.publish} disabled={!file || !caption.trim()}><Icon name="arrowUp"/>Post</button></div></form></section></div>}
    {toast && <div className={s.toast} role="status">{toast}</div>}
  </main>;
}
