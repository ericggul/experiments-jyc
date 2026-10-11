'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { channels as seedChannels, chips, exploreDestinations, me, notices, qualities, replyLines, searchChips, seedComments, seedPlaylists, seedPosts, seedSearchHistory, seedSubscriptions, shorts as seedShorts, speeds, subscriptionChips, trendingSearches, videos as seedVideos, type Channel, type Comment, type Playlist, type Post, type Short, type Video } from '../model/data';
import { clock, compact, highlight, resumeAt, subscribers, views, watchedFraction } from '../model/format';
import { filterHome, matches, pushRecent, suggestions, toggle, upNext } from '../model/feed';
import { accumulateSeek, dragProgress, headerOffset, pagerOffset, pagerStep, scrubTime, seekSide, seekTarget, settleHeader, snapMini } from '../model/gesture';
import { Icon, LogoMark, type IconName } from './icons';
import s from './youtube.module.css';

type Tab = 'home' | 'shorts' | 'subs' | 'you';
type Bell = 'all' | 'personalized' | 'none';
type Screen =
  | { kind: 'search'; draft: string }
  | { kind: 'results'; query: string }
  | { kind: 'notifications' }
  | { kind: 'channel'; id: string }
  | { kind: 'list'; list: string }
  | { kind: 'explore' }
  | { kind: 'topic'; id: string };
type Sheet =
  | { kind: 'create' }
  | { kind: 'menu'; id: string; from?: string }
  | { kind: 'share'; id: string }
  | { kind: 'save'; id: string }
  | { kind: 'subscribed'; channelId: string }
  | { kind: 'unsubscribe'; channelId: string }
  | { kind: 'remix'; id: string }
  | { kind: 'shortComments'; id: string }
  | { kind: 'cast' }
  | { kind: 'post' }
  | { kind: 'time' }
  | { kind: 'settings' }
  | { kind: 'newPlaylist'; id?: string };
type Toast = { text: string; action?: { label: string; run: () => void } };
type Session = {
  liked: string[]; disliked: string[]; subs: string[]; bells: Record<string, Bell>; later: string[]; history: string[];
  progress: Record<string, number>; searches: string[]; downloads: string[]; playlists: Playlist[]; hidden: string[]; blocked: string[];
  myComments: Comment[]; commentLikes: string[]; commentDislikes: string[]; read: string[]; seenNotices: boolean; posts: Post[]; postLikes: string[];
  incognito: boolean; autoplay: boolean;
};

const STORE = 'scc-clone14-youtube';
const initialSession: Session = {
  liked: [], disliked: [], subs: seedSubscriptions, bells: {}, later: ['v-colorado', 'v-piano'], history: ['v-ocean', 'v-volcano'],
  progress: { 'v-ocean': 21, 'v-volcano': 24 }, searches: seedSearchHistory, downloads: [], playlists: seedPlaylists, hidden: [], blocked: [],
  myComments: [], commentLikes: [], commentDislikes: [], read: [], seenNotices: false, posts: [], postLikes: [], incognito: false, autoplay: true,
};
const meChannel: Channel = { id: 'me', name: me.name, handle: me.handle, subscribers: 3, avatar: me.avatar, tone: me.tone, about: 'Videos and Shorts from this phone.' };
const allChannels = [meChannel, ...seedChannels];
const channelOf = (id: string) => allChannels.find(channel => channel.id === id) ?? meChannel;

type Ctx = {
  session: Session;
  patch: (fn: (prev: Session) => Partial<Session>) => void;
  videoOf: (id: string) => Video | undefined;
  shortOf: (id: string) => Short | undefined;
  allVideos: Video[];
  allShorts: Short[];
  uploads: Video[];
  openVideo: (id: string) => void;
  openShort: (id: string) => void;
  openChannel: (id: string) => void;
  push: (screen: Screen) => void;
  openSheet: (sheet: Sheet) => void;
  setToast: (toast: Toast) => void;
  toggleSubscribe: (channelId: string) => void;
  toggleLike: (id: string) => void;
  toggleDislike: (id: string) => void;
  commentsFor: (targetId: string) => Comment[];
  addComment: (targetId: string, body: string) => void;
  download: (id: string) => void;
  downloading: Record<string, number>;
};

/* ------------------------------------------------------------------ atoms */

function capture(el: Element, pointerId: number) {
  try { el.setPointerCapture(pointerId); } catch { /* pointer already released */ }
}

function Avatar({ channel, size = 36, src, name, tone }: { channel?: Channel; size?: number; src?: string; name?: string; tone?: string }) {
  const image = src ?? channel?.avatar;
  const label = name ?? channel?.name ?? '';
  return <span className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.42, '--tone': tone ?? channel?.tone } as CSSProperties} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar frames */}
    {image ? <img src={image} alt="" loading="lazy" /> : label.slice(0, 1).toUpperCase()}
  </span>;
}

function Media({ src, poster }: { src: string; poster: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- remote video frames and local posters
  if (poster) return <img src={poster} alt="" loading="lazy" draggable={false} />;
  return <video src={`${src}#t=0.5`} muted playsInline preload="metadata" />;
}

function Verified({ channel }: { channel: Channel }) {
  return channel.verified ? <span className={s.verified}><Icon name="verified" /></span> : null;
}

function Thumb({ video, progress, small }: { video: Video; progress?: number; small?: boolean }) {
  const fraction = watchedFraction(progress, video.seconds);
  return <span className={small ? s.rowThumb : s.thumb}>
    <Media src={video.src} poster={video.poster} />
    {video.seconds ? <span className={s.duration}>{clock(video.seconds)}</span> : null}
    {fraction > 0 ? <span className={s.watched}><span style={{ width: `${fraction * 100}%` }} /></span> : null}
  </span>;
}

function VideoCard({ ctx, video }: { ctx: Ctx; video: Video }) {
  const channel = channelOf(video.channelId);
  if (ctx.session.hidden.includes(video.id)) {
    return <div className={s.removed}><span>Video removed</span><button type="button" onClick={() => ctx.patch(prev => ({ hidden: prev.hidden.filter(id => id !== video.id) }))}>Undo</button></div>;
  }
  return <article className={s.card}>
    <button type="button" className={s.thumbButton} onClick={() => ctx.openVideo(video.id)} aria-label={video.title}>
      <Thumb video={video} progress={ctx.session.progress[video.id]} />
    </button>
    <div className={s.cardBody}>
      <button type="button" onClick={() => ctx.openChannel(channel.id)} aria-label={channel.name}><Avatar channel={channel} /></button>
      <button type="button" className={s.cardText} onClick={() => ctx.openVideo(video.id)}>
        <h3 className={s.cardTitle}>{video.title}</h3>
        <div className={s.meta}>{channel.name}<Verified channel={channel} /><span className={s.dot}>{views(video.viewCount)}</span><span className={s.dot}>{video.age}</span></div>
      </button>
      <button type="button" className={s.kebab} aria-label="More actions" onClick={() => ctx.openSheet({ kind: 'menu', id: video.id })}><Icon name="kebab" /></button>
    </div>
  </article>;
}

function VideoRow({ ctx, video, from }: { ctx: Ctx; video: Video; from?: string }) {
  const channel = channelOf(video.channelId);
  return <div className={s.row}>
    <button type="button" onClick={() => ctx.openVideo(video.id)} aria-label={video.title}><Thumb video={video} progress={ctx.session.progress[video.id]} small /></button>
    <button type="button" className={s.rowText} onClick={() => ctx.openVideo(video.id)}>
      <h3 className={s.cardTitle}>{video.title}</h3>
      <div className={s.meta}>{channel.name}</div>
      <div className={s.meta}>{views(video.viewCount)}<span className={s.dot}>{video.age}</span></div>
    </button>
    <button type="button" className={s.kebab} aria-label="More actions" onClick={() => ctx.openSheet({ kind: 'menu', id: video.id, from })}><Icon name="kebab" /></button>
  </div>;
}

function ShortCard({ ctx, item }: { ctx: Ctx; item: Short }) {
  return <button type="button" className={s.shortCard} onClick={() => ctx.openShort(item.id)} aria-label={item.title}>
    <Media src={item.src} poster={item.poster} />
    <span className={s.shortCardText}><strong>{item.title}</strong><span>{views(item.viewCount)}</span></span>
  </button>;
}

function ShortsShelf({ ctx, items }: { ctx: Ctx; items: Short[] }) {
  if (!items.length) return null;
  return <section className={s.shelf}>
    <h2 className={s.shelfHead}><Icon name="shorts-fill" />Shorts</h2>
    <div className={s.shelfScroll}>{items.map(item => <ShortCard key={item.id} ctx={ctx} item={item} />)}</div>
  </section>;
}

function PostCard({ ctx, post }: { ctx: Ctx; post: Post }) {
  const channel = channelOf(post.channelId);
  const image = post.imageId ? ctx.videoOf(post.imageId) : undefined;
  const liked = ctx.session.postLikes.includes(post.id);
  return <article className={s.post}>
    <div className={s.postHead}>
      <button type="button" onClick={() => ctx.openChannel(channel.id)} aria-label={channel.name}><Avatar channel={channel} size={32} /></button>
      <div><strong>{channel.name}</strong><div className={s.meta}>{post.time}</div></div>
    </div>
    <p className={s.postBody}>{post.body}</p>
    {image ? <button type="button" className={s.postImage} onClick={() => ctx.openVideo(image.id)} aria-label={image.title}><Media src={image.src} poster={image.poster} /></button> : null}
    <div className={s.postActions}>
      <button type="button" aria-pressed={liked} onClick={() => ctx.patch(prev => ({ postLikes: toggle(prev.postLikes, post.id) }))}><Icon name={liked ? 'like-fill' : 'like'} />{compact(post.likes + (liked ? 1 : 0))}</button>
      <button type="button" aria-label="Dislike"><Icon name="dislike" /></button>
      <button type="button" aria-label="Share" onClick={() => ctx.openSheet({ kind: 'share', id: post.imageId ?? '' })}><Icon name="share" /></button>
    </div>
  </article>;
}

function ChipRow({ items, value, onChange, explore }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; explore?: () => void }) {
  return <div className={s.chipRow} role="tablist">
    {explore ? <button type="button" className={`${s.chip} ${s.chipIcon}`} onClick={explore} aria-label="Explore"><Icon name="compass" /></button> : null}
    {items.map(chip => <button key={chip.id} type="button" role="tab" aria-selected={value === chip.id} className={`${s.chip} ${value === chip.id ? s.chipActive : ''}`} onClick={() => onChange(chip.id)}>{chip.label}</button>)}
  </div>;
}

function SubscribeButton({ ctx, channelId, compactLabel }: { ctx: Ctx; channelId: string; compactLabel?: boolean }) {
  if (channelId === 'me') return null;
  const on = ctx.session.subs.includes(channelId);
  const bell = ctx.session.bells[channelId] ?? 'personalized';
  if (!on) return <button type="button" className={s.subscribe} onClick={() => ctx.toggleSubscribe(channelId)}>Subscribe</button>;
  return <button type="button" className={s.subscribed} onClick={() => ctx.openSheet({ kind: 'subscribed', channelId })} aria-label="Subscribed, notification settings">
    <Icon name={bell === 'all' ? 'bell-ring' : bell === 'none' ? 'bell-off' : 'bell'} />{compactLabel ? null : <span>Subscribed</span>}<Icon name="chevron-down" />
  </button>;
}

function SheetFrame({ title, onClose, children, tall, footer }: { title?: string; onClose: () => void; children: ReactNode; tall?: boolean; footer?: ReactNode }) {
  const start = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const down = (event: ReactPointerEvent<HTMLDivElement>) => { start.current = event.clientY; capture(event.currentTarget, event.pointerId); };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => { if (start.current !== null) setOffset(Math.max(0, event.clientY - start.current)); };
  const up = () => { if (offset > 90) onClose(); start.current = null; setOffset(0); };
  return <>
    <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
    <div className={`${s.sheet} ${tall ? s.sheetTall : ''}`} role="dialog" aria-modal="true" aria-label={title ?? 'Options'} style={offset ? { transform: `translateY(${offset}px)` } : undefined}>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className={s.grabber} />
        {title ? <div className={s.sheetHead}><h2>{title}</h2><button type="button" className={s.iconButton} onClick={onClose} aria-label="Close"><Icon name="close" /></button></div> : null}
      </div>
      <div className={s.sheetBody}>{children}</div>
      {footer}
    </div>
  </>;
}

function MenuItem({ icon, label, detail, onClick, trailing }: { icon: IconName; label: string; detail?: string; onClick: () => void; trailing?: ReactNode }) {
  return <button type="button" className={s.menuItem} onClick={onClick}><Icon name={icon} /><span className={s.grow}>{label}{detail ? <small>{detail}</small> : null}</span>{trailing}</button>;
}

/* --------------------------------------------------------------- comments */

function CommentsView({ ctx, targetId, ownerId, onClose, count }: { ctx: Ctx; targetId: string; ownerId: string; onClose: () => void; count: number }) {
  const [sort, setSort] = useState<'top' | 'newest'>('top');
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  const owner = channelOf(ownerId);
  const list = useMemo(() => {
    const all = ctx.commentsFor(targetId);
    return sort === 'top' ? [...all].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || Number(Boolean(b.own)) - Number(Boolean(a.own)) || b.likes - a.likes) : [...all].sort((a, b) => a.days - b.days);
  }, [ctx, targetId, sort]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    ctx.addComment(targetId, draft.trim());
    setDraft('');
    setSort('newest');
  };
  return <>
    <div className={s.panelHead}><h2>Comments<span>{compact(count + ctx.session.myComments.filter(item => item.targetId === targetId).length)}</span></h2><button type="button" className={s.iconButton} aria-label="Close" onClick={onClose}><Icon name="close" /></button></div>
    <div className={s.sortRow}>
      <button type="button" className={`${s.chip} ${sort === 'top' ? s.chipActive : ''}`} onClick={() => setSort('top')}>Top</button>
      <button type="button" className={`${s.chip} ${sort === 'newest' ? s.chipActive : ''}`} onClick={() => setSort('newest')}>Newest</button>
    </div>
    <div className={s.panelScroll}>
      {list.map(comment => {
        const liked = ctx.session.commentLikes.includes(comment.id);
        const disliked = ctx.session.commentDislikes.includes(comment.id);
        const expanded = open.includes(comment.id);
        return <div key={comment.id} className={s.comment}>
          <Avatar src={comment.avatar} name={comment.name} tone={comment.tone} size={28} />
          <div className={s.commentMain}>
            {comment.pinned ? <div className={s.pinned}><Icon name="pin" />Pinned by {owner.handle}</div> : null}
            <div className={s.commentHead}><strong>{comment.handle}</strong><span className={s.dot}>{comment.time}</span></div>
            <p className={s.commentBody}>{comment.body}</p>
            <div className={s.commentActions}>
              <button type="button" aria-pressed={liked} aria-label="Like comment" onClick={() => ctx.patch(prev => ({ commentLikes: toggle(prev.commentLikes, comment.id), commentDislikes: prev.commentDislikes.filter(id => id !== comment.id) }))}><Icon name={liked ? 'like-fill' : 'like'} />{comment.likes + (liked ? 1 : 0) ? compact(comment.likes + (liked ? 1 : 0)) : ''}</button>
              <button type="button" aria-pressed={disliked} aria-label="Dislike comment" onClick={() => ctx.patch(prev => ({ commentDislikes: toggle(prev.commentDislikes, comment.id), commentLikes: prev.commentLikes.filter(id => id !== comment.id) }))}><Icon name={disliked ? 'dislike-fill' : 'dislike'} /></button>
              <button type="button" aria-label="Reply" onClick={() => setDraft(`${comment.handle} `)}><Icon name="comment" /></button>
              {comment.creatorHeart ? <span className={s.heartBadge} title="Hearted by creator"><Avatar channel={owner} size={18} /><Icon name="heart" /></span> : null}
            </div>
            {comment.replies ? <button type="button" className={s.replies} onClick={() => setOpen(prev => toggle(prev, comment.id))}><Icon name="chevron-down" />{expanded ? 'Hide replies' : `${comment.replies} replies`}</button> : null}
            {expanded ? <div className={s.replyList}>{replyLines.slice(0, Math.min(3, comment.replies)).map((line, index) => <div key={`${comment.id}-r${index}`} className={s.comment}>
              <Avatar name={['Ari', 'Noor', 'Jules'][index]} tone={['#5e35b1', '#00897b', '#f4511e'][index]} size={24} />
              <div className={s.commentMain}><div className={s.commentHead}><strong>{['@ari.k', '@noor.films', '@julesdraws'][index]}</strong><span className={s.dot}>1 day ago</span></div><p className={s.commentBody}>{line}</p></div>
            </div>)}</div> : null}
          </div>
        </div>;
      })}
    </div>
    <form className={s.composer} onSubmit={submit}>
      <Avatar src={me.avatar} name={me.name} tone={me.tone} size={28} />
      <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a comment..." aria-label="Add a comment" enterKeyHint="send" />
      <button type="submit" disabled={!draft.trim()} aria-label="Send comment"><Icon name="send" /></button>
    </form>
  </>;
}

/* ------------------------------------------------------------ watch panel */

type WatchProps = {
  ctx: Ctx; video: Video; mini: boolean; fullscreen: boolean; setFullscreen: (value: boolean) => void; suspended: boolean;
  setP: (p: number) => void; settle: (target: 0 | 1) => void; travel: () => number; onClose: () => void;
};

function WatchPanel({ ctx, video, mini, fullscreen, setFullscreen, suspended, setP, settle, travel, onClose }: WatchProps) {
  const channel = channelOf(video.channelId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.seconds);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [controls, setControls] = useState(false);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [seekFx, setSeekFx] = useState<{ side: 'back' | 'forward'; amount: number; at: number } | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [panel, setPanel] = useState<'description' | 'comments' | null>(null);
  const [settings, setSettings] = useState<null | 'root' | 'quality' | 'speed'>(null);
  const [quality, setQuality] = useState('auto');
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState('');
  const seekRef = useRef<{ side: 'back' | 'forward'; amount: number; at: number } | null>(null);
  const lastTap = useRef(0);
  const singleTimer = useRef(0);
  const seekTimer = useRef(0);
  const savedAt = useRef(0);
  const timeRef = useRef(0);
  const drag = useRef<{ x: number; y: number; p0: 0 | 1; active: boolean; p: number; lastP: number; lastT: number; v: number; dy: number; id: number } | null>(null);
  const { patch, session } = ctx;
  const next = useMemo(() => upNext(ctx.allVideos.filter(item => !session.blocked.includes(item.channelId)), video), [ctx.allVideos, session.blocked, video]);
  const isCommons = video.src.includes('.480p.vp9.webm');
  const file = qualities.find(item => item.id === quality)?.file ?? '480p';
  const src = isCommons ? video.src.replace('.480p.vp9.webm', `.${file}.vp9.webm`) : video.src;
  const liked = session.liked.includes(video.id);
  const disliked = session.disliked.includes(video.id);
  const downloaded = session.downloads.includes(video.id);
  const downloading = ctx.downloading[video.id];
  const comments = ctx.commentsFor(video.id);
  const topComment = comments.find(item => item.own) ?? comments[0];

  const save = useCallback((value: number) => {
    savedAt.current = value;
    patch(prev => ({ progress: { ...prev.progress, [video.id]: value } }));
  }, [patch, video.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const start = () => {
      el.play().catch(() => { el.muted = true; el.play().catch(() => setPlaying(false)); setNote('Muted autoplay — tap the player for sound'); });
    };
    start();
    return () => { save(timeRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mounted video
  }, []);

  useEffect(() => { if (suspended) videoRef.current?.pause(); }, [suspended]);
  useEffect(() => { const el = videoRef.current; if (el) { el.defaultPlaybackRate = speed; el.playbackRate = speed; } }, [speed]);
  useEffect(() => { if (videoRef.current) videoRef.current.loop = loop; }, [loop]);
  useEffect(() => {
    if (!controls || !playing || scrub !== null || settings) return;
    const timer = window.setTimeout(() => setControls(false), 3000);
    return () => window.clearTimeout(timer);
  }, [controls, playing, scrub, settings]);
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(''), 2600);
    return () => window.clearTimeout(timer);
  }, [note]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { if (next[0]) ctx.openVideo(next[0].id); return; }
    const timer = window.setTimeout(() => setCountdown(value => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, ctx, next]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (ended) { el.currentTime = 0; setEnded(false); setCountdown(null); }
    if (el.muted) el.muted = false;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  };

  const seek = (side: 'back' | 'forward') => {
    const el = videoRef.current;
    if (!el) return;
    const fx = accumulateSeek(seekRef.current, side, Date.now());
    seekRef.current = fx;
    setSeekFx(fx);
    el.currentTime = seekTarget(el.currentTime, el.duration, side);
    setTime(el.currentTime);
    window.clearTimeout(seekTimer.current);
    seekTimer.current = window.setTimeout(() => { setSeekFx(null); seekRef.current = null; }, 750);
  };

  const tap = (x: number, width: number) => {
    const now = Date.now();
    const side = seekSide(x, width);
    if (seekRef.current && now - seekRef.current.at < 700 && side) { seek(side); return; }
    if (now - lastTap.current < 300) {
      window.clearTimeout(singleTimer.current);
      lastTap.current = 0;
      if (side) seek(side);
      return;
    }
    lastTap.current = now;
    singleTimer.current = window.setTimeout(() => setControls(value => !value), 250);
  };

  const headDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button, [data-scrub]') || event.button > 0) return;
    drag.current = { x: event.clientX, y: event.clientY, p0: mini ? 1 : 0, active: false, p: mini ? 1 : 0, lastP: mini ? 1 : 0, lastT: performance.now(), v: 0, dy: 0, id: event.pointerId };
  };
  const headMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dy = event.clientY - d.y;
    const dx = event.clientX - d.x;
    d.dy = dy;
    if (!d.active) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
      d.active = true;
      capture(event.currentTarget, event.pointerId);
      window.clearTimeout(singleTimer.current);
    }
    if (fullscreen || (d.p0 === 0 && dy < 0)) return;
    const p = dragProgress(d.p0, dy, travel());
    const now = performance.now();
    d.v = (p - d.lastP) / Math.max(1, now - d.lastT);
    d.lastP = p; d.lastT = now; d.p = p;
    setP(p);
  };
  const headUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId) return;
    if (!d.active) {
      if (mini) { settle(0); return; }
      const rect = event.currentTarget.getBoundingClientRect();
      tap(event.clientX - rect.left, rect.width);
      return;
    }
    if (fullscreen) { if (d.dy > 60) setFullscreen(false); return; }
    if (d.p0 === 0 && d.dy < -60) { setFullscreen(true); return; }
    const target = snapMini(d.p, d.v);
    if (target === 1) { setPanel(null); setSettings(null); setControls(false); }
    settle(target);
  };
  const headCancel = () => { const d = drag.current; drag.current = null; if (d?.active) settle(d.p > 0.5 ? 1 : 0); };

  const scrubAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect ? scrubTime(clientX, rect.left, rect.width, duration) : 0;
  };
  const scrubDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    capture(event.currentTarget, event.pointerId);
    setScrub(scrubAt(event.clientX));
    setControls(true);
  };
  const scrubMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (scrub !== null) setScrub(scrubAt(event.clientX)); };
  const scrubUp = () => {
    if (scrub === null) return;
    if (videoRef.current) videoRef.current.currentTime = scrub;
    setTime(scrub);
    setEnded(false); setCountdown(null);
    setScrub(null);
  };

  const shown = scrub ?? time;
  const fraction = duration ? shown / duration : 0;
  const changeQuality = (id: string) => {
    const at = videoRef.current?.currentTime ?? 0;
    setQuality(id);
    setSettings(null);
    window.setTimeout(() => {
      const el = videoRef.current;
      if (!el) return;
      const resume = () => { el.currentTime = at; el.play().catch(() => {}); el.removeEventListener('loadedmetadata', resume); };
      el.addEventListener('loadedmetadata', resume);
    }, 0);
  };

  return <>
    <div className={s.head} onPointerDown={headDown} onPointerMove={headMove} onPointerUp={headUp} onPointerCancel={headCancel}>
      <div className={s.playerBox}>
        <video
          ref={videoRef} src={src} poster={video.poster || undefined} playsInline preload="auto"
          onPlay={() => { setPlaying(true); setEnded(false); }}
          onPause={() => { setPlaying(false); save(videoRef.current?.currentTime ?? 0); }}
          onTimeUpdate={event => {
            const t = event.currentTarget.currentTime;
            timeRef.current = t;
            setTime(t);
            if (Math.abs(t - savedAt.current) > 5) save(t);
          }}
          onLoadedMetadata={event => {
            const el = event.currentTarget;
            if (Number.isFinite(el.duration)) setDuration(el.duration);
            const at = resumeAt(session.progress[video.id], el.duration);
            if (at && el.currentTime < 1) el.currentTime = at;
            setFailed(false);
          }}
          onDurationChange={event => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration); }}
          onProgress={event => { const b = event.currentTarget.buffered; if (b.length) setBuffered(b.end(b.length - 1)); }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onEnded={() => {
            setEnded(true); setPlaying(false); save(0);
            if (session.autoplay && next[0] && !loop) setCountdown(5); else setControls(true);
          }}
          onError={() => { setFailed(true); setWaiting(false); }}
        />
        {waiting && !failed && !ended && !mini ? <span className={s.spinner} /> : null}
        {failed && !mini ? <span className={s.playerNote}>This video is unavailable right now</span> : null}
        {note && !mini && !controls ? <span className={s.playerNote}>{note}</span> : null}
        <div className={s.seekLayer} aria-hidden="true">
          {seekFx ? <div key={`${seekFx.side}-${seekFx.amount}`} className={`${s.seekRipple} ${seekFx.side === 'back' ? s.seekBack : s.seekForward}`}>
            <span className={s.seekArrows}><Icon name="play" /><Icon name="play" /><Icon name="play" /></span>
            <span>{seekFx.amount} seconds</span>
          </div> : null}
        </div>
        <div className={`${s.controls} ${controls && !ended ? s.controlsOn : ''}`}>
          <div className={s.ctrlTop}>
            <button type="button" className={s.ctrlButton} aria-label={fullscreen ? 'Exit full screen' : 'Minimise'} onClick={() => { if (fullscreen) setFullscreen(false); else { setControls(false); setPanel(null); settle(1); } }}><Icon name="chevron-down" /></button>
            <span className={s.grow}>{fullscreen ? video.title : ''}</span>
            <button type="button" className={`${s.autoplay} ${session.autoplay ? s.autoplayOn : ''}`} role="switch" aria-checked={session.autoplay} aria-label="Autoplay" onClick={() => { patch(prev => ({ autoplay: !prev.autoplay })); setNote(session.autoplay ? 'Autoplay is off' : 'Autoplay is on'); }}><span><Icon name={session.autoplay ? 'play' : 'pause'} /></span></button>
            <button type="button" className={s.ctrlButton} aria-label="Cast" onClick={() => ctx.openSheet({ kind: 'cast' })}><Icon name="cast" /></button>
            <button type="button" className={s.ctrlButton} aria-label="Captions" onClick={() => setNote("Captions aren't available for this video")}><Icon name="cc" /></button>
            <button type="button" className={s.ctrlButton} aria-label="Settings" onClick={() => setSettings('root')}><Icon name="settings" /></button>
          </div>
          <div className={s.ctrlCenter}>
            <button type="button" className={s.ctrlButton} aria-label="Previous" onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}><Icon name="prev" /></button>
            <button type="button" className={`${s.ctrlButton} ${s.bigPlay}`} aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}><Icon name={ended ? 'replay' : playing ? 'pause' : 'play'} /></button>
            <button type="button" className={s.ctrlButton} aria-label="Next" disabled={!next[0]} onClick={() => next[0] && ctx.openVideo(next[0].id)}><Icon name="next" /></button>
          </div>
          <div className={s.ctrlBottom}>
            <span>{clock(shown)} <b>/ {clock(duration)}</b></span>
            <button type="button" className={s.ctrlButton} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => setFullscreen(!fullscreen)}><Icon name={fullscreen ? 'exit-fullscreen' : 'fullscreen'} /></button>
          </div>
        </div>
        {ended && countdown !== null && next[0] ? <div className={s.endCard}>
          <small>Up next in {countdown}</small>
          <strong>{next[0].title}</strong>
          <span className={s.meta} style={{ color: 'rgba(255,255,255,.7)' }}>{channelOf(next[0].channelId).name}</span>
          <div className={s.endActions}>
            <button type="button" onClick={() => { setCountdown(null); setControls(true); }}>Cancel</button>
            <button type="button" onClick={() => ctx.openVideo(next[0].id)}>Play now</button>
          </div>
        </div> : null}
      </div>
      <div
        data-scrub="" className={`${s.scrub} ${controls ? s.scrubShow : ''} ${scrub !== null ? s.scrubbing : ''}`}
        onPointerDown={scrubDown} onPointerMove={scrubMove} onPointerUp={scrubUp} onPointerCancel={scrubUp}
        role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(shown)} tabIndex={0}
        onKeyDown={event => {
          if (!videoRef.current) return;
          if (event.key === 'ArrowRight') videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          if (event.key === 'ArrowLeft') videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }}
      >
        <div ref={trackRef} className={s.scrubTrack}>
          <span className={s.scrubLoaded} style={{ width: `${duration ? Math.min(100, (buffered / duration) * 100) : 0}%` }} />
          <span className={s.scrubFill} style={{ width: `${fraction * 100}%` }} />
          <span className={s.scrubKnob} style={{ left: `${fraction * 100}%` }} />
        </div>
        {scrub !== null ? <span className={s.scrubTip} style={{ left: `${fraction * 100}%` }}>{clock(scrub)}</span> : null}
      </div>
      <div className={s.miniBar}>
        <div className={s.miniText}><strong>{video.title}</strong><span>{channel.name}</span></div>
        <button type="button" className={s.iconButton} aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} /></button>
        <button type="button" className={s.iconButton} aria-label="Close player" onClick={onClose}><Icon name="close" /></button>
        <span className={s.miniProgress}><span style={{ width: `${fraction * 100}%` }} /></span>
      </div>
      {mini ? <button type="button" className={s.srOnly} onClick={() => settle(0)}>Expand player</button> : null}
    </div>

    <div className={s.watchBody} aria-hidden={mini}>
      <div className={s.watchScroll}>
        <button type="button" className={s.watchInfo} onClick={() => setPanel('description')}>
          <h2 className={s.watchTitle}>{video.title}</h2>
          <div className={s.watchMeta}>{views(video.viewCount)}<span className={s.dot}>{video.age}</span>{video.tags.slice(0, 2).map(tag => <span key={tag}> #{tag}</span>)}<b>...more</b></div>
        </button>
        <div className={s.channelRow}>
          <button type="button" className={s.channelLink} onClick={() => ctx.openChannel(channel.id)}>
            <Avatar channel={channel} size={36} /><strong>{channel.name}</strong><span>{compact(channel.subscribers)}</span>
          </button>
          <SubscribeButton ctx={ctx} channelId={channel.id} />
        </div>
        <div className={s.actions}>
          <span className={s.likeGroup}>
            <button type="button" aria-pressed={liked} aria-label="Like" onClick={() => ctx.toggleLike(video.id)}><Icon name={liked ? 'like-fill' : 'like'} />{compact(video.likeCount + (liked ? 1 : 0))}</button>
            <i />
            <button type="button" aria-pressed={disliked} aria-label="Dislike" onClick={() => ctx.toggleDislike(video.id)}><Icon name={disliked ? 'dislike-fill' : 'dislike'} /></button>
          </span>
          <button type="button" className={s.pill} onClick={() => ctx.openSheet({ kind: 'share', id: video.id })}><Icon name="share" />Share</button>
          <button type="button" className={s.pill} onClick={() => ctx.openSheet({ kind: 'remix', id: video.id })}><Icon name="remix" />Remix</button>
          <button type="button" className={s.pill} onClick={() => ctx.download(video.id)}>
            {downloading !== undefined ? <span className={s.ring} style={{ '--d': downloading } as CSSProperties} /> : <Icon name={downloaded ? 'downloaded' : 'download'} />}
            {downloading !== undefined ? `${downloading}%` : downloaded ? 'Downloaded' : 'Download'}
          </button>
          <button type="button" className={s.pill} onClick={() => ctx.openSheet({ kind: 'save', id: video.id })}><Icon name={session.later.includes(video.id) || session.playlists.some(list => list.ids.includes(video.id)) ? 'save-fill' : 'save'} />Save</button>
        </div>
        <button type="button" className={s.commentsTeaser} onClick={() => setPanel('comments')}>
          <header>Comments<span>{compact(video.commentCount + session.myComments.filter(item => item.targetId === video.id).length)}</span></header>
          {topComment ? <div className={s.teaserLine}><Avatar src={topComment.avatar} name={topComment.name} tone={topComment.tone} size={24} /><p>{topComment.body}</p></div>
            : <div className={s.teaserLine}><Avatar src={me.avatar} name={me.name} size={24} /><span className={s.teaserInput}>Add a comment...</span></div>}
        </button>
        {next.slice(0, 10).map((item, index) => <div key={item.id}>
          {index === 2 ? <ShortsShelf ctx={ctx} items={ctx.allShorts.filter(short => !session.hidden.includes(short.id)).slice(3, 8)} /> : null}
          <VideoCard ctx={ctx} video={item} />
        </div>)}
      </div>

      {panel === 'description' ? <div className={s.panel}>
        <div className={s.grabber} />
        <div className={s.panelHead}><h2>Description</h2><button type="button" className={s.iconButton} aria-label="Close" onClick={() => setPanel(null)}><Icon name="close" /></button></div>
        <div className={s.panelScroll}>
          <h3 className={s.descTitle}>{video.title}</h3>
          <div className={s.stats}>
            <div><strong>{compact(video.likeCount + (liked ? 1 : 0))}</strong><span>Likes</span></div>
            <div><strong>{video.viewCount.toLocaleString('en-US')}</strong><span>Views</span></div>
            <div><strong>{video.age.replace(' ago', '')}</strong><span>Ago</span></div>
          </div>
          <div className={s.descText}>{video.description}<div className={s.tagLine}>{video.tags.map(tag => <span key={tag}>#{tag} </span>)}</div></div>
          {video.source ? <a className={s.sourceRow} href={video.source.page} target="_blank" rel="noreferrer">
            <span className={s.menuIconCircle}><Icon name="link" /></span>
            <span><strong>{video.source.file}</strong><span>{video.source.author} · {video.source.license} · Wikimedia Commons</span></span>
          </a> : null}
          <div className={s.channelRow}>
            <button type="button" className={s.channelLink} onClick={() => ctx.openChannel(channel.id)}><Avatar channel={channel} size={40} /><span><strong>{channel.name}</strong><br /><span>{subscribers(channel.subscribers)}</span></span></button>
          </div>
        </div>
      </div> : null}
      {panel === 'comments' ? <div className={s.panel}>
        <div className={s.grabber} />
        <CommentsView ctx={ctx} targetId={video.id} ownerId={channel.id} count={video.commentCount} onClose={() => setPanel(null)} />
      </div> : null}
    </div>

    {settings ? <SheetFrame title={settings === 'quality' ? 'Quality for current video' : settings === 'speed' ? 'Playback speed' : undefined} onClose={() => setSettings(null)}>
      {settings === 'root' ? <>
        <MenuItem icon="quality" label="Quality" detail={qualities.find(item => item.id === quality)?.label} onClick={() => setSettings('quality')} />
        <MenuItem icon="speed" label="Playback speed" detail={speed === 1 ? 'Normal' : `${speed}x`} onClick={() => setSettings('speed')} />
        <MenuItem icon="cc" label="Captions" detail="Unavailable" onClick={() => { setSettings(null); setNote("Captions aren't available for this video"); }} />
        <MenuItem icon="loop" label="Loop video" onClick={() => setLoop(value => !value)} trailing={<span className={`${s.switch} ${loop ? s.switchOn : ''}`} />} />
      </> : null}
      {settings === 'quality' ? (isCommons ? qualities : qualities.slice(0, 1)).map(item => <button key={item.id} type="button" className={s.menuItem} onClick={() => changeQuality(item.id)}><span className={`${s.radio} ${quality === item.id ? s.radioOn : ''}`} /><span className={s.grow}>{item.label}</span></button>) : null}
      {settings === 'speed' ? speeds.map(value => <button key={value} type="button" className={s.menuItem} onClick={() => { setSpeed(value); setSettings(null); }}><span className={`${s.radio} ${speed === value ? s.radioOn : ''}`} /><span className={s.grow}>{value === 1 ? 'Normal' : `${value}x`}</span></button>) : null}
    </SheetFrame> : null}
  </>;
}

/* ----------------------------------------------------------------- shorts */

function ShortsPager({ ctx, items, index, setIndex, onBack, suspended }: { ctx: Ctx; items: Short[]; index: number; setIndex: (index: number) => void; onBack?: () => void; suspended: boolean }) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState<'play' | 'pause' | null>(null);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const refs = useRef(new Map<string, HTMLVideoElement>());
  const drag = useRef<{ x: number; y: number; t: number; dy: number; active: boolean; id: number } | null>(null);
  const lastTap = useRef(0);
  const singleTimer = useRef(0);
  const wheelAt = useRef(0);
  const burstId = useRef(0);
  const current = items[index];
  const { session } = ctx;

  useEffect(() => {
    refs.current.forEach((el, id) => {
      if (current && id === current.id && !suspended) {
        el.muted = muted;
        el.currentTime = 0;
        el.play().catch(() => { el.muted = true; setMuted(true); el.play().catch(() => {}); });
      } else el.pause();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the active item changes
  }, [current?.id, suspended]);
  useEffect(() => { if (current) { const el = refs.current.get(current.id); if (el) el.muted = muted; } }, [muted, current]);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const step = (direction: 1 | -1) => setIndex(Math.max(0, Math.min(items.length - 1, index + direction)));
  const like = (x: number, y: number) => {
    if (!current) return;
    if (!session.liked.includes(current.id)) ctx.toggleLike(current.id);
    burstId.current += 1;
    const id = burstId.current;
    setBursts(prev => [...prev, { id, x, y }]);
    window.setTimeout(() => setBursts(prev => prev.filter(item => item.id !== id)), 800);
  };
  const togglePause = () => {
    const el = current ? refs.current.get(current.id) : undefined;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setFlash('play'); } else { el.pause(); setFlash('pause'); }
  };

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button, a, [data-scrub]') || event.button > 0) return;
    drag.current = { x: event.clientX, y: event.clientY, t: performance.now(), dy: 0, active: false, id: event.pointerId };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    d.dy = event.clientY - d.y;
    if (!d.active) {
      if (Math.abs(d.dy) < 8 || Math.abs(d.dy) < Math.abs(event.clientX - d.x)) return;
      d.active = true;
      setDragging(true);
      capture(event.currentTarget, event.pointerId);
    }
    setDy(pagerOffset(index, items.length, d.dy));
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId) return;
    if (d.active) {
      const height = event.currentTarget.getBoundingClientRect().height;
      const velocity = d.dy / Math.max(1, performance.now() - d.t);
      setIndex(pagerStep(index, items.length, d.dy, height, velocity));
      setDy(0);
      setDragging(false);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      window.clearTimeout(singleTimer.current);
      lastTap.current = 0;
      like(event.clientX - rect.left, event.clientY - rect.top);
      return;
    }
    lastTap.current = now;
    singleTimer.current = window.setTimeout(togglePause, 250);
  };

  if (!current) return <div className={s.shorts}><div className={s.empty} style={{ color: '#aaa' }}><strong style={{ color: '#fff' }}>No more Shorts</strong>Check back later for new Shorts.</div></div>;

  return <div
    className={`${s.shorts} ${dragging ? '' : s.shortsSettle}`} onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onPointerCancel={() => { drag.current = null; setDy(0); setDragging(false); }}
    onWheel={event => { const now = Date.now(); if (Math.abs(event.deltaY) > 24 && now - wheelAt.current > 650) { wheelAt.current = now; step(event.deltaY > 0 ? 1 : -1); } }}
    onKeyDown={event => { if (event.key === 'ArrowDown') step(1); if (event.key === 'ArrowUp') step(-1); if (event.key === ' ') { event.preventDefault(); togglePause(); } }}
    tabIndex={0} aria-label="Shorts" aria-roledescription="carousel"
  >
    {items.map((item, i) => {
      if (Math.abs(i - index) > 1) return null;
      const channel = channelOf(item.channelId);
      const liked = session.liked.includes(item.id);
      const disliked = session.disliked.includes(item.id);
      const subscribed = session.subs.includes(item.channelId);
      const active = i === index;
      return <section key={item.id} className={s.shortItem} style={{ transform: `translateY(calc(${(i - index) * 100}% + ${dy}px))` }} aria-hidden={!active}>
        <video
          ref={el => { if (el) refs.current.set(item.id, el); else refs.current.delete(item.id); }}
          src={item.src} poster={item.poster || undefined} loop playsInline muted={!active || muted} preload={active ? 'auto' : 'metadata'}
          onTimeUpdate={event => { if (active && event.currentTarget.duration) setProgress(event.currentTarget.currentTime / event.currentTarget.duration); }}
        />
        <div className={s.shortShade} />
        {active && flash ? <span className={s.pauseFlash}><Icon name={flash} /></span> : null}
        {active ? bursts.map(burst => <span key={burst.id} className={s.likeBurst} style={{ left: burst.x, top: burst.y }}><Icon name="like-fill" /></span>) : null}
        <div className={s.rail}>
          <button type="button" className={s.railButton} aria-pressed={liked} aria-label="Like" onClick={() => ctx.toggleLike(item.id)}><span><Icon name={liked ? 'like-fill' : 'like'} /></span><span>{compact(item.likeCount + (liked ? 1 : 0))}</span></button>
          <button type="button" className={s.railButton} aria-pressed={disliked} aria-label="Dislike" onClick={() => ctx.toggleDislike(item.id)}><span><Icon name={disliked ? 'dislike-fill' : 'dislike'} /></span><span>Dislike</span></button>
          <button type="button" className={s.railButton} aria-label="Comments" onClick={() => ctx.openSheet({ kind: 'shortComments', id: item.id })}><span><Icon name="comment-fill" /></span><span>{compact(item.commentCount + session.myComments.filter(comment => comment.targetId === item.id).length)}</span></button>
          <button type="button" className={s.railButton} aria-label="Share" onClick={() => ctx.openSheet({ kind: 'share', id: item.id })}><span><Icon name="share-fill" /></span><span>Share</span></button>
          <button type="button" className={s.railButton} aria-label="Remix" onClick={() => ctx.openSheet({ kind: 'remix', id: item.id })}><span><Icon name="remix" /></span><span>Remix</span></button>
          <button type="button" className={s.disc} aria-label={`Sound: ${item.sound}`} onClick={() => setMuted(value => !value)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- channel frame as sound art */}
            <img src={channel.avatar} alt="" />
          </button>
        </div>
        <div className={s.shortInfo}>
          <div className={s.shortChannel}>
            <button type="button" onClick={() => ctx.openChannel(channel.id)}><Avatar channel={channel} size={32} /><span>{channel.handle}</span></button>
            {channel.id === 'me' ? null : <button type="button" className={`${s.shortSub} ${subscribed ? s.shortSubOn : ''}`} onClick={() => (subscribed ? ctx.openSheet({ kind: 'subscribed', channelId: channel.id }) : ctx.toggleSubscribe(channel.id))}>{subscribed ? 'Subscribed' : 'Subscribe'}</button>}
          </div>
          <p className={s.shortTitle}>{item.title}</p>
          <div className={s.shortSound}><Icon name="volume" /><span>{item.sound}</span>{item.source ? <span className={s.dot}>{item.source.author}</span> : null}</div>
        </div>
        {active ? <div className={s.shortProgress} data-scrub="" onPointerDown={event => {
          const el = refs.current.get(item.id);
          const rect = event.currentTarget.getBoundingClientRect();
          if (el?.duration) el.currentTime = scrubTime(event.clientX, rect.left, rect.width, el.duration);
        }}><i><span style={{ width: `${progress * 100}%` }} /></i></div> : null}
      </section>;
    })}
    <div className={s.shortsTop}>
      {onBack ? <button type="button" className={`${s.iconButton} ${s.back}`} aria-label="Back" onClick={onBack}><Icon name="back" /></button> : null}
      <button type="button" className={s.iconButton} aria-label="Search" onClick={() => ctx.push({ kind: 'search', draft: '' })}><Icon name="search" /></button>
      <button type="button" className={s.iconButton} aria-label="Create a Short" onClick={() => ctx.openSheet({ kind: 'create' })}><Icon name="camera" /></button>
      <button type="button" className={s.iconButton} aria-label="More" onClick={() => ctx.openSheet({ kind: 'menu', id: current.id })}><Icon name="kebab" /></button>
    </div>
    {muted ? <button type="button" className={s.muteHint} onClick={() => setMuted(false)}><Icon name="mute" />Tap to unmute</button> : null}
  </div>;
}

/* ---------------------------------------------------------------- screens */

function useCollapsingHeader() {
  const header = useRef<HTMLDivElement>(null);
  const state = useRef({ offset: 0, top: 0, timer: 0 });
  const onScroll = useCallback((event: { currentTarget: HTMLElement }) => {
    const el = header.current;
    if (!el) return;
    const top = event.currentTarget.scrollTop;
    const height = el.offsetHeight;
    const st = state.current;
    st.offset = headerOffset(st.offset, st.top, top, height);
    st.top = top;
    el.classList.remove(s.settle);
    el.style.transform = `translateY(${-st.offset}px)`;
    window.clearTimeout(st.timer);
    st.timer = window.setTimeout(() => {
      st.offset = settleHeader(st.offset, height, st.top);
      el.classList.add(s.settle);
      el.style.transform = `translateY(${-st.offset}px)`;
    }, 140);
  }, []);
  return { header, onScroll };
}

function TopBar({ ctx, unread }: { ctx: Ctx; unread: number }) {
  return <div className={s.topbar}>
    <div className={s.brand} aria-label="YouTube Home"><LogoMark /><strong>YouTube</strong></div>
    <div className={s.topActions}>
      <button type="button" className={s.iconButton} aria-label="Cast" onClick={() => ctx.openSheet({ kind: 'cast' })}><Icon name="cast" /></button>
      <button type="button" className={s.iconButton} aria-label="Notifications" onClick={() => ctx.push({ kind: 'notifications' })}><Icon name="bell" />{unread ? <span className={s.badge}>{unread > 9 ? '9+' : unread}</span> : null}</button>
      <button type="button" className={s.iconButton} aria-label="Search" onClick={() => ctx.push({ kind: 'search', draft: '' })}><Icon name="search" /></button>
    </div>
  </div>;
}

function HomeScreen({ ctx, unread, chip, setChip, mini, hidden, scrollRef }: { ctx: Ctx; unread: number; chip: string; setChip: (id: string) => void; mini: boolean; hidden: boolean; scrollRef: (el: HTMLDivElement | null) => void }) {
  const { header, onScroll } = useCollapsingHeader();
  const { session } = ctx;
  const list = filterHome(ctx.allVideos.filter(item => !item.uploaded && !session.blocked.includes(item.channelId)), chip, session.history, []);
  const shelfA = ctx.allShorts.filter(item => !session.hidden.includes(item.id) && !session.blocked.includes(item.channelId));
  return <div className={`${s.screen} ${hidden ? s.hidden : ''}`}>
    <div className={s.scroller} onScroll={onScroll} ref={scrollRef}>
      <div className={s.headerSpace} />
      <div className={mini ? s.withMini : ''}>
        {list.length ? null : <div className={s.empty}><strong>No videos here yet</strong>Try another topic.</div>}
        {list.map((item, index) => <div key={item.id}>
          {index === 1 && chip === 'all' ? <ShortsShelf ctx={ctx} items={shelfA.slice(0, 5)} /> : null}
          {index === 7 && chip === 'all' ? <ShortsShelf ctx={ctx} items={shelfA.slice(5)} /> : null}
          <VideoCard ctx={ctx} video={item} />
        </div>)}
      </div>
    </div>
    <div className={s.collapsing} ref={header}>
      <TopBar ctx={ctx} unread={unread} />
      <ChipRow items={chips} value={chip} onChange={setChip} explore={() => ctx.push({ kind: 'explore' })} />
    </div>
  </div>;
}

function SubscriptionsScreen({ ctx, unread, mini, hidden }: { ctx: Ctx; unread: number; mini: boolean; hidden: boolean }) {
  const [chip, setChip] = useState('all');
  const [only, setOnly] = useState<string | null>(null);
  const { header, onScroll } = useCollapsingHeader();
  const { session } = ctx;
  const subs = session.subs.map(channelOf);
  const scope = (channelId: string) => (only ? channelId === only : session.subs.includes(channelId));
  let feed = ctx.allVideos.filter(item => scope(item.channelId)).sort((a, b) => a.days - b.days);
  if (chip === 'today') feed = feed.filter(item => item.days <= 1);
  if (chip === 'continue') feed = feed.filter(item => (session.progress[item.id] ?? 0) > 0);
  if (chip === 'unwatched') feed = feed.filter(item => !session.history.includes(item.id));
  const shortsFeed = ctx.allShorts.filter(item => scope(item.channelId));
  const posts = [...session.posts, ...seedPosts].filter(post => scope(post.channelId));
  const latest = (channelId: string) => ctx.allVideos.some(item => item.channelId === channelId && item.days <= 7 && !session.history.includes(item.id));
  return <div className={`${s.screen} ${hidden ? s.hidden : ''}`}>
    <div className={s.scroller} onScroll={onScroll}>
      <div className={s.headerSpace} style={{ height: 'calc(184px + var(--top))' }} />
      <div className={mini ? s.withMini : ''}>
        {!subs.length ? <div className={s.empty}><Icon name="subs" /><strong>Don&apos;t miss new videos</strong>Subscribe to channels to see their latest videos here.</div> : null}
        {chip === 'shorts' ? <div className={s.shortGrid}>{shortsFeed.map(item => <ShortCard key={item.id} ctx={ctx} item={item} />)}</div> : <>
          {chip === 'videos' ? null : posts.slice(0, 1).map(post => <PostCard key={post.id} ctx={ctx} post={post} />)}
          {feed.map((item, index) => <div key={item.id}>
            {index === 2 && (chip === 'all' || chip === 'today') ? <ShortsShelf ctx={ctx} items={shortsFeed} /> : null}
            {index === 4 && chip === 'all' ? posts.slice(1).map(post => <PostCard key={post.id} ctx={ctx} post={post} />) : null}
            <VideoCard ctx={ctx} video={item} />
          </div>)}
          {subs.length && !feed.length ? <div className={s.empty}><strong>Nothing here</strong>Try another filter.</div> : null}
        </>}
      </div>
    </div>
    <div className={s.collapsing} ref={header}>
      <TopBar ctx={ctx} unread={unread} />
      <div className={s.subAvatars}>
        {subs.map(channel => <button key={channel.id} type="button" className={`${s.subAvatar} ${only === channel.id ? s.subAvatarActive : ''}`} onClick={() => setOnly(only === channel.id ? null : channel.id)}>
          <Avatar channel={channel} size={56} />{latest(channel.id) ? <span className={s.newDot} /> : null}<span>{channel.name}</span>
        </button>)}
        {subs.length ? <button type="button" className={s.subAll} onClick={() => setOnly(null)}>All</button> : null}
      </div>
      <ChipRow items={subscriptionChips} value={chip} onChange={setChip} />
    </div>
  </div>;
}

function YouScreen({ ctx, mini, hidden }: { ctx: Ctx; mini: boolean; hidden: boolean }) {
  const { session } = ctx;
  const history = session.history.map(ctx.videoOf).filter((item): item is Video => Boolean(item));
  const likedVideos = session.liked.map(ctx.videoOf).filter((item): item is Video => Boolean(item));
  const later = session.later.map(ctx.videoOf).filter((item): item is Video => Boolean(item));
  const cover = (list: Video[]) => list[0];
  const lists = [
    { id: 'later', title: 'Watch later', count: later.length, cover: cover(later), icon: 'clock' as IconName },
    { id: 'liked', title: 'Liked videos', count: likedVideos.length, cover: cover(likedVideos), icon: 'like' as IconName },
    ...session.playlists.map(list => ({ id: `playlist:${list.id}`, title: list.title, count: list.ids.length, cover: ctx.videoOf(list.ids[0] ?? ''), icon: 'playlist' as IconName })),
  ];
  return <div className={`${s.screen} ${hidden ? s.hidden : ''}`}>
    <div className={s.scroller}>
      <div className={s.plainHeader}>
        <div className={s.topbar}>
          <span className={s.brand} />
          <div className={s.topActions}>
            <button type="button" className={s.iconButton} aria-label="Cast" onClick={() => ctx.openSheet({ kind: 'cast' })}><Icon name="cast" /></button>
            <button type="button" className={s.iconButton} aria-label="Search" onClick={() => ctx.push({ kind: 'search', draft: '' })}><Icon name="search" /></button>
            <button type="button" className={s.iconButton} aria-label="Settings" onClick={() => ctx.openSheet({ kind: 'settings' })}><Icon name="settings" /></button>
          </div>
        </div>
      </div>
      <div className={mini ? s.withMini : ''}>
        <div className={s.profile}>
          <Avatar src={me.avatar} name={me.name} tone={me.tone} size={72} />
          <div>
            <h2>{me.name}</h2>
            <button type="button" onClick={() => ctx.openChannel('me')}>{me.handle}<span className={s.dot}><b>View channel</b></span><Icon name="chevron-right" /></button>
          </div>
        </div>
        <div className={s.chipRow}>
          <button type="button" className={`${s.pill} ${s.pillSmall}`} onClick={() => ctx.patch(prev => ({ incognito: !prev.incognito }))}><Icon name="incognito" />{session.incognito ? 'Turn off Incognito' : 'Turn on Incognito'}</button>
          <button type="button" className={`${s.pill} ${s.pillSmall}`} onClick={() => ctx.openSheet({ kind: 'share', id: 'channel:me' })}><Icon name="share" />Share channel</button>
        </div>
        {session.incognito ? <div className={s.incognitoBanner}><Icon name="incognito" /><span>You&apos;re incognito. Videos you watch won&apos;t be added to your history.</span></div> : null}

        <div className={s.sectionHead}><h3>History</h3><div><button type="button" className={`${s.pill} ${s.pillSmall}`} onClick={() => ctx.push({ kind: 'list', list: 'history' })}>View all</button></div></div>
        {history.length ? <div className={s.miniShelf}>{history.slice(0, 12).map(item => <button key={item.id} type="button" className={s.miniCard} onClick={() => ctx.openVideo(item.id)}>
          <Thumb video={item} progress={session.progress[item.id]} small /><span className={s.cardTitle}>{item.title}</span><span className={s.meta}>{channelOf(item.channelId).name}</span>
        </button>)}</div> : <p className={s.meta} style={{ padding: '0 16px' }}>Videos you watch will be shown here.</p>}

        <div className={s.sectionHead}><h3>Playlists</h3><div>
          <button type="button" className={s.iconButton} aria-label="New playlist" onClick={() => ctx.openSheet({ kind: 'newPlaylist' })}><Icon name="plus" /></button>
        </div></div>
        <div className={s.miniShelf}>{lists.map(list => <button key={list.id} type="button" className={s.miniCard} onClick={() => ctx.push({ kind: 'list', list: list.id })}>
          <span className={`${s.rowThumb} ${s.playlistStack}`} style={{ overflow: 'visible' }}>
            <span className={s.rowThumb} style={{ position: 'absolute', inset: 0 }}>{list.cover ? <Media src={list.cover.src} poster={list.cover.poster} /> : <span className={s.blankThumb}><Icon name={list.icon} /></span>}</span>
            <span className={s.playlistCount}><Icon name="playlist" />{list.count}</span>
          </span>
          <span className={s.cardTitle}>{list.title}</span><span className={s.meta}>Private · Playlist</span>
        </button>)}</div>

        <div className={s.listItems}>
          <button type="button" className={s.listItem} onClick={() => ctx.push({ kind: 'list', list: 'uploads' })}><Icon name="video" />Your videos<small>{ctx.uploads.length || ''}</small></button>
          <button type="button" className={s.listItem} onClick={() => ctx.push({ kind: 'list', list: 'downloads' })}><Icon name="download" />Downloads<small>{session.downloads.length ? `${session.downloads.length} videos` : ''}</small></button>
          <div className={s.divider} />
          <button type="button" className={s.listItem} onClick={() => ctx.openSheet({ kind: 'time' })}><Icon name="chart" />Time watched</button>
          <button type="button" className={s.listItem} onClick={() => ctx.openSheet({ kind: 'settings' })}><Icon name="settings" />Settings</button>
        </div>
      </div>
    </div>
  </div>;
}

function StackHeader({ title, onBack, children }: { title?: string; onBack: () => void; children?: ReactNode }) {
  return <div className={s.plainHeader}><div className={s.titleBar}>
    <button type="button" className={s.iconButton} aria-label="Back" onClick={onBack}><Icon name="back" /></button>
    <h1>{title}</h1>{children}
  </div></div>;
}

function SearchScreen({ ctx, draft, onBack, onSubmit }: { ctx: Ctx; draft: string; onBack: () => void; onSubmit: (query: string) => void }) {
  const [value, setValue] = useState(draft);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const pool = useMemo(() => [...ctx.session.searches, ...trendingSearches, ...ctx.allVideos.map(item => item.title), ...allChannels.map(channel => channel.name), ...ctx.allVideos.flatMap(item => item.tags)], [ctx.allVideos, ctx.session.searches]);
  const typed = suggestions(value, pool);
  const listen = () => {
    type Recognition = { lang: string; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void };
    const Speech = (window as unknown as { webkitSpeechRecognition?: new () => Recognition; SpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Speech) { ctx.setToast({ text: "Voice search isn't supported in this browser" }); return; }
    const recognition = new Speech();
    recognition.lang = 'en-US';
    recognition.onresult = event => { const text = event.results[0]?.[0]?.transcript ?? ''; setValue(text); if (text) onSubmit(text); };
    recognition.onerror = () => ctx.setToast({ text: "Didn't catch that. Try again." });
    recognition.start();
    ctx.setToast({ text: 'Listening…' });
  };
  const rows = value.trim()
    ? typed.map(text => ({ id: `s-${text}`, text, icon: 'search' as IconName }))
    : [...ctx.session.searches.map(text => ({ id: `h-${text}`, text, icon: 'history' as IconName })), ...trendingSearches.filter(text => !ctx.session.searches.includes(text)).map(text => ({ id: `t-${text}`, text, icon: 'search' as IconName }))];
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <form className={`${s.plainHeader} ${s.searchBar}`} onSubmit={event => { event.preventDefault(); if (value.trim()) onSubmit(value.trim()); }} role="search">
        <button type="button" className={s.iconButton} aria-label="Back" onClick={onBack}><Icon name="back" /></button>
        <label className={s.searchField}>
          <input ref={input} value={value} onChange={event => setValue(event.target.value)} placeholder="Search YouTube" aria-label="Search YouTube" enterKeyHint="search" autoComplete="off" />
          {value ? <button type="button" aria-label="Clear" onClick={() => { setValue(''); input.current?.focus(); }}><Icon name="close" /></button> : null}
        </label>
        <button type="button" className={s.micButton} aria-label="Search with your voice" onClick={listen}><Icon name="mic" /></button>
      </form>
      {rows.map(row => <div key={row.id} className={s.suggestion}>
        <button type="button" onClick={() => onSubmit(row.text)}><Icon name={row.icon} /><span>{highlight(row.text, value).map(part => (part.strong ? <span key={part.id}>{part.text}</span> : <b key={part.id}>{part.text}</b>))}</span></button>
        {row.icon === 'history' ? <button type="button" className={s.fill} aria-label="Remove from search history" onClick={() => ctx.patch(prev => ({ searches: prev.searches.filter(item => item !== row.text) }))}><Icon name="close" /></button> : null}
        <button type="button" className={s.fill} aria-label="Edit query" onClick={() => { setValue(`${row.text} `); input.current?.focus(); }}><Icon name="arrow-up-left" /></button>
      </div>)}
    </div>
  </div>;
}

function ResultsScreen({ ctx, query, onBack, onEdit, mini }: { ctx: Ctx; query: string; onBack: () => void; onEdit: () => void; mini: boolean }) {
  const [chip, setChip] = useState('all');
  const { session } = ctx;
  const lookup = { channels: allChannels };
  let found = ctx.allVideos.filter(item => matches(item, query, lookup));
  if (chip === 'watched') found = found.filter(item => session.history.includes(item.id));
  if (chip === 'unwatched') found = found.filter(item => !session.history.includes(item.id));
  if (chip === 'recent') found = found.filter(item => item.days <= 30).sort((a, b) => a.days - b.days);
  const shortsFound = ctx.allShorts.filter(item => matches(item, query, lookup));
  const q = query.toLowerCase();
  const channelHit = seedChannels.find(channel => channel.name.toLowerCase().includes(q) || channel.handle.toLowerCase().includes(q.replace(/\s+/g, '')));
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <div className={s.plainHeader}>
        <div className={s.searchBar}>
          <button type="button" className={s.iconButton} aria-label="Back" onClick={onBack}><Icon name="back" /></button>
          <button type="button" className={s.searchQuery} onClick={onEdit}>{query}</button>
          <button type="button" className={s.micButton} aria-label="Search with your voice" onClick={onEdit}><Icon name="mic" /></button>
        </div>
        <ChipRow items={searchChips} value={chip} onChange={setChip} />
      </div>
      <div className={mini ? s.withMini : ''}>
        {channelHit && chip === 'all' ? <div className={s.channelResult}>
          <button type="button" onClick={() => ctx.openChannel(channelHit.id)}><Avatar channel={channelHit} size={72} /><span><strong>{channelHit.name}<Verified channel={channelHit} /></strong><span className={s.meta}>{channelHit.handle}<br />{subscribers(channelHit.subscribers)}</span></span></button>
          <SubscribeButton ctx={ctx} channelId={channelHit.id} compactLabel />
        </div> : null}
        {chip === 'shorts' ? <div className={s.shortGrid}>{shortsFound.map(item => <ShortCard key={item.id} ctx={ctx} item={item} />)}</div> : null}
        {chip !== 'shorts' ? found.map((item, index) => <div key={item.id}>
          {index === 1 && chip === 'all' ? <ShortsShelf ctx={ctx} items={shortsFound} /> : null}
          {chip === 'videos' ? <VideoRow ctx={ctx} video={item} /> : <VideoCard ctx={ctx} video={item} />}
        </div>) : null}
        {(chip === 'shorts' ? !shortsFound.length : !found.length) && !channelHit ? <div className={s.empty}><Icon name="search" /><strong>No results found</strong>Try different keywords or remove search filters</div> : null}
      </div>
    </div>
  </div>;
}

function NotificationsScreen({ ctx, onBack, mini }: { ctx: Ctx; onBack: () => void; mini: boolean }) {
  const fresh = notices.filter(item => item.unread);
  const earlier = notices.filter(item => !item.unread);
  const row = (item: (typeof notices)[number]) => {
    const target = ctx.videoOf(item.targetId);
    const short = ctx.shortOf(item.targetId);
    const unread = item.unread && !ctx.session.read.includes(item.id);
    return <div key={item.id} className={s.notice}>
      {unread ? <span className={s.noticeDot} /> : null}
      <button type="button" className={s.noticeMain} onClick={() => { ctx.patch(prev => ({ read: pushRecent(prev.read, item.id) })); if (target) ctx.openVideo(target.id); else if (short) ctx.openShort(short.id); }}>
        <Avatar channel={channelOf(item.channelId)} size={44} />
        <span className={s.noticeText}><p>{item.title}</p><span className={s.meta}>{item.time}</span></span>
        <span className={`${s.noticeThumb} ${short ? s.noticeThumbTall : ''}`}>{target ? <Media src={target.src} poster={target.poster} /> : short ? <Media src={short.src} poster={short.poster} /> : null}</span>
      </button>
      <button type="button" className={s.kebab} aria-label="More actions" onClick={() => ctx.openSheet({ kind: 'menu', id: item.targetId })}><Icon name="kebab" /></button>
    </div>;
  };
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <StackHeader title="Notifications" onBack={onBack}>
        <button type="button" className={s.iconButton} aria-label="Cast" onClick={() => ctx.openSheet({ kind: 'cast' })}><Icon name="cast" /></button>
        <button type="button" className={s.iconButton} aria-label="Search" onClick={() => ctx.push({ kind: 'search', draft: '' })}><Icon name="search" /></button>
      </StackHeader>
      <div className={mini ? s.withMini : ''}>
        <h2 className={s.sectionTitle}>New</h2>
        {fresh.map(row)}
        <h2 className={s.sectionTitle}>Earlier</h2>
        {earlier.map(row)}
      </div>
    </div>
  </div>;
}

function ChannelScreen({ ctx, id, onBack, mini }: { ctx: Ctx; id: string; onBack: () => void; mini: boolean }) {
  const [tab, setTab] = useState<'home' | 'videos' | 'shorts' | 'posts'>('home');
  const channel = channelOf(id);
  const list = ctx.allVideos.filter(item => item.channelId === id);
  const shortList = ctx.allShorts.filter(item => item.channelId === id);
  const posts = [...ctx.session.posts, ...seedPosts].filter(post => post.channelId === id);
  const banner = list[0]?.poster ?? shortList[0]?.poster;
  const tabs = [{ id: 'home', label: 'Home' }, { id: 'videos', label: 'Videos' }, { id: 'shorts', label: 'Shorts' }, { id: 'posts', label: 'Posts' }] as const;
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <StackHeader title={channel.name} onBack={onBack}>
        <button type="button" className={s.iconButton} aria-label="Search" onClick={() => ctx.push({ kind: 'search', draft: channel.name })}><Icon name="search" /></button>
        <button type="button" className={s.iconButton} aria-label="Share channel" onClick={() => ctx.openSheet({ kind: 'share', id: `channel:${id}` })}><Icon name="kebab" /></button>
      </StackHeader>
      {/* eslint-disable-next-line @next/next/no-img-element -- channel banner from its own video frame */}
      <div className={s.banner} style={{ '--tone': channel.tone } as CSSProperties}>{banner ? <img src={banner} alt="" /> : null}</div>
      <div className={s.channelHero}>
        <Avatar channel={channel} size={72} />
        <div><h2>{channel.name}<Verified channel={channel} /></h2><div className={s.meta}>{channel.handle}</div><div className={s.meta}>{subscribers(channel.subscribers)}<span className={s.dot}>{list.length + shortList.length} videos</span></div></div>
      </div>
      <p className={s.channelAbout}>{channel.about} <b>...more</b></p>
      <div className={s.channelButtons}>
        {id === 'me' ? <button type="button" className={`${s.pill}`} onClick={() => ctx.openSheet({ kind: 'create' })}>Create</button> : ctx.session.subs.includes(id) ? <SubscribeButton ctx={ctx} channelId={id} /> : <button type="button" className={`${s.pill} ${s.pillDark}`} onClick={() => ctx.toggleSubscribe(id)}>Subscribe</button>}
      </div>
      <div className={s.tabs} role="tablist">{tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`${s.tab} ${tab === item.id ? s.tabActive : ''}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      <div className={mini ? s.withMini : ''} style={{ paddingTop: 12 }}>
        {tab === 'home' ? <>
          {list.slice(0, 1).map(item => <VideoCard key={item.id} ctx={ctx} video={item} />)}
          <ShortsShelf ctx={ctx} items={shortList} />
          {list.slice(1).map(item => <VideoRow key={item.id} ctx={ctx} video={item} />)}
          {posts.slice(0, 1).map(post => <PostCard key={post.id} ctx={ctx} post={post} />)}
        </> : null}
        {tab === 'videos' ? list.map(item => <VideoRow key={item.id} ctx={ctx} video={item} />) : null}
        {tab === 'shorts' ? <div className={s.shortGrid}>{shortList.map(item => <ShortCard key={item.id} ctx={ctx} item={item} />)}</div> : null}
        {tab === 'posts' ? posts.map(post => <PostCard key={post.id} ctx={ctx} post={post} />) : null}
        {(tab === 'videos' && !list.length) || (tab === 'shorts' && !shortList.length) || (tab === 'posts' && !posts.length) || (tab === 'home' && !list.length && !shortList.length && !posts.length)
          ? <div className={s.empty}><strong>Nothing here yet</strong>{id === 'me' ? 'Use Create to upload a video, a Short or a post.' : 'This channel has no content in this tab.'}</div> : null}
      </div>
    </div>
  </div>;
}

function ListScreen({ ctx, list, onBack, mini }: { ctx: Ctx; list: string; onBack: () => void; mini: boolean }) {
  const { session } = ctx;
  const playlist = list.startsWith('playlist:') ? session.playlists.find(item => `playlist:${item.id}` === list) : undefined;
  const ids = list === 'history' ? session.history : list === 'later' ? session.later : list === 'liked' ? session.liked : list === 'downloads' ? session.downloads : list === 'uploads' ? ctx.uploads.map(item => item.id) : playlist?.ids ?? [];
  const items = ids.map(ctx.videoOf).filter((item): item is Video => Boolean(item));
  const title = list === 'history' ? 'History' : list === 'later' ? 'Watch later' : list === 'liked' ? 'Liked videos' : list === 'downloads' ? 'Downloads' : list === 'uploads' ? 'Your videos' : playlist?.title ?? 'Playlist';
  const cover = items[0];
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <StackHeader title={list === 'history' ? 'History' : ''} onBack={onBack}>
        {list === 'history' && items.length ? <button type="button" className={`${s.pill} ${s.pillSmall}`} onClick={() => ctx.patch(() => ({ history: [], progress: {} }))}>Clear all</button> : null}
      </StackHeader>
      <div className={mini ? s.withMini : ''}>
        {list !== 'history' ? <div className={s.listHero} style={{ '--hero-bg': cover?.poster ? `url("${cover.poster}")` : '#555' } as CSSProperties}>
          <div className={s.listCover}>{cover ? <Media src={cover.src} poster={cover.poster} /> : null}</div>
          <h2>{title}</h2>
          <p>{me.name}<span className={s.dot}>{items.length} videos</span><span className={s.dot}>Private</span></p>
          <div className={s.heroActions}>
            <button type="button" disabled={!items.length} onClick={() => cover && ctx.openVideo(cover.id)}><Icon name="play" />Play all</button>
            <button type="button" disabled={!items.length} onClick={() => items.length && ctx.openVideo(items[Math.floor(Math.random() * items.length)].id)}><Icon name="loop" />Shuffle</button>
          </div>
        </div> : <h2 className={s.sectionTitle}>Today</h2>}
        <div style={{ paddingTop: 8 }}>{items.map(item => <VideoRow key={item.id} ctx={ctx} video={item} from={list} />)}</div>
        {!items.length ? <div className={s.empty}><Icon name={list === 'history' ? 'history' : list === 'downloads' ? 'download' : 'playlist'} /><strong>{list === 'history' ? 'Your history is empty' : list === 'downloads' ? 'No downloads' : 'No videos in this playlist yet'}</strong>{list === 'downloads' ? 'Videos you download appear here.' : 'Videos you add appear here.'}</div> : null}
      </div>
    </div>
  </div>;
}

function ExploreScreen({ ctx, onBack }: { ctx: Ctx; onBack: () => void }) {
  const icons: Record<string, IconName> = { trending: 'chart', music: 'playlist', learning: 'help', nature: 'compass', travel: 'compass', animals: 'heart', food: 'live' };
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <StackHeader title="Explore" onBack={onBack} />
      {exploreDestinations.map(item => <button key={item.id} type="button" className={s.exploreItem} onClick={() => ctx.push({ kind: 'topic', id: item.id })}><Icon name={icons[item.id] ?? 'compass'} />{item.label}</button>)}
    </div>
  </div>;
}

function TopicScreen({ ctx, id, onBack, mini }: { ctx: Ctx; id: string; onBack: () => void; mini: boolean }) {
  const destination = exploreDestinations.find(item => item.id === id);
  const list = id === 'trending' ? [...ctx.allVideos].filter(item => item.days <= 120).sort((a, b) => b.viewCount / (b.days + 1) - a.viewCount / (a.days + 1)) : ctx.allVideos.filter(item => destination?.topic && item.topics.includes(destination.topic));
  return <div className={s.stackScreen}>
    <div className={s.scroller}>
      <StackHeader title={destination?.label} onBack={onBack} />
      <div className={mini ? s.withMini : ''}>{list.map(item => <VideoCard key={item.id} ctx={ctx} video={item} />)}</div>
    </div>
  </div>;
}

/* -------------------------------------------------------------------- app */

export default function YoutubeMobile() {
  const appRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const shortRef = useRef<HTMLInputElement>(null);
  const homeScroll = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [session, setSession] = useState<Session>(initialSession);
  const loaded = useRef(false);
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Screen[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToastState] = useState<Toast | null>(null);
  const [homeChip, setHomeChip] = useState('all');
  const [uploads, setUploads] = useState<Video[]>([]);
  const [shortUploads, setShortUploads] = useState<Short[]>([]);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [mini, setMini] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [shortsIndex, setShortsIndex] = useState(0);
  const [shortsBack, setShortsBack] = useState<Tab | null>(null);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [remixOf, setRemixOf] = useState<string | null>(null);
  const [newList, setNewList] = useState('');
  const [postDraft, setPostDraft] = useState('');
  const settleTimer = useRef(0);

  /* session persistence */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate once from this browser session
      if (raw) setSession(prev => ({ ...prev, ...(JSON.parse(raw) as Partial<Session>) }));
    } catch { /* storage unavailable */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { window.sessionStorage.setItem(STORE, JSON.stringify(session)); } catch { /* storage unavailable */ }
  }, [session]);
  const patch = useCallback((fn: (prev: Session) => Partial<Session>) => setSession(prev => ({ ...prev, ...fn(prev) })), []);

  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setToast = setToastState;
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToastState(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const allVideos = useMemo(() => [...uploads, ...seedVideos], [uploads]);
  const allShorts = useMemo(() => [...shortUploads, ...seedShorts], [shortUploads]);
  const videoOf = useCallback((id: string) => allVideos.find(item => item.id === id), [allVideos]);
  const shortOf = useCallback((id: string) => allShorts.find(item => item.id === id), [allShorts]);
  const shortsFeed = useMemo(() => allShorts.filter(item => !session.hidden.includes(item.id) && !session.blocked.includes(item.channelId)), [allShorts, session.hidden, session.blocked]);

  /* miniplayer progress lives in a CSS variable so drags never re-render React */
  const setP = useCallback((p: number) => { appRef.current?.style.setProperty('--p', String(p)); }, []);
  const settle = useCallback((target: 0 | 1) => {
    setSettling(true);
    setP(target);
    setMini(target === 1);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettling(false), 300);
  }, [setP]);
  const travel = useCallback(() => size.h - (navRef.current?.offsetHeight ?? 49) - 60, [size.h]);

  const openVideo = useCallback((id: string) => {
    const first = watchId === null;
    setWatchId(id);
    setFullscreen(false);
    setSheet(null);
    if (tab === 'shorts') setTab(shortsBack ?? 'home');
    if (!session.incognito) patch(prev => ({ history: pushRecent(prev.history, id) }));
    if (first) {
      setP(1);
      window.setTimeout(() => settle(0), 30);
    } else settle(0);
  }, [watchId, tab, shortsBack, session.incognito, patch, setP, settle]);

  const closeWatch = useCallback(() => {
    setWatchId(null);
    setMini(false);
    setFullscreen(false);
    setP(1);
  }, [setP]);

  const go = (next: Tab) => {
    if (next === tab && !stack.length) {
      if (next === 'home') homeScroll.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStack([]);
    setShortsBack(null);
    setTab(next);
    if (next === 'subs' || next === 'you') {/* keep miniplayer */}
  };

  const openShort = useCallback((id: string) => {
    const index = shortsFeed.findIndex(item => item.id === id);
    setShortsIndex(Math.max(0, index));
    setShortsBack(tab === 'shorts' ? null : tab);
    setStack([]);
    setSheet(null);
    setTab('shorts');
  }, [shortsFeed, tab]);

  const push = useCallback((screen: Screen) => {
    setSheet(null);
    if (watchId && !mini) settle(1);
    if (screen.kind === 'notifications') patch(() => ({ seenNotices: true }));
    setStack(prev => [...prev, screen]);
  }, [watchId, mini, settle, patch]);
  const pop = () => setStack(prev => prev.slice(0, -1));
  const replaceTop = (screen: Screen) => setStack(prev => [...prev.slice(0, -1), screen]);
  const openChannel = useCallback((id: string) => push({ kind: 'channel', id }), [push]);

  const toggleSubscribe = useCallback((channelId: string) => {
    const on = session.subs.includes(channelId);
    patch(prev => ({ subs: toggle(prev.subs, channelId) }));
    if (!on) setToast({ text: 'Subscription added' });
    else setToast({ text: 'Subscription removed', action: { label: 'Undo', run: () => patch(prev => ({ subs: [...prev.subs, channelId] })) } });
  }, [session.subs, patch, setToast]);

  const toggleLike = useCallback((id: string) => {
    const on = session.liked.includes(id);
    patch(prev => ({ liked: on ? prev.liked.filter(item => item !== id) : [id, ...prev.liked], disliked: prev.disliked.filter(item => item !== id) }));
    if (!on && videoOf(id)) setToast({ text: 'Added to Liked videos' });
  }, [session.liked, patch, videoOf, setToast]);
  const toggleDislike = useCallback((id: string) => {
    patch(prev => ({ disliked: toggle(prev.disliked, id), liked: prev.liked.filter(item => item !== id) }));
  }, [patch]);

  const commentsFor = useCallback((targetId: string) => [...session.myComments.filter(item => item.targetId === targetId), ...seedComments.filter(item => item.targetId === targetId)], [session.myComments]);
  const addComment = useCallback((targetId: string, body: string) => {
    patch(prev => ({ myComments: [{ id: `own-${targetId}-${prev.myComments.length + 1}`, targetId, name: me.name, handle: me.handle, avatar: me.avatar, tone: me.tone, body, time: 'now', likes: 0, replies: 0, own: true, days: 0 }, ...prev.myComments] }));
  }, [patch]);

  const download = useCallback((id: string) => {
    if (downloading[id] !== undefined) return;
    if (session.downloads.includes(id)) {
      patch(prev => ({ downloads: prev.downloads.filter(item => item !== id) }));
      setToast({ text: 'Deleted from downloads' });
      return;
    }
    setDownloading(prev => ({ ...prev, [id]: 0 }));
    let value = 0;
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 9);
      setDownloading(prev => ({ ...prev, [id]: value }));
      if (value >= 100) {
        window.clearInterval(timer);
        setDownloading(prev => { const rest = { ...prev }; delete rest[id]; return rest; });
        patch(prev => ({ downloads: pushRecent(prev.downloads, id) }));
        setToast({ text: 'Downloaded', action: { label: 'View', run: () => push({ kind: 'list', list: 'downloads' }) } });
      }
    }, 160);
  }, [downloading, session.downloads, patch, setToast, push]);

  const ctx: Ctx = {
    session, patch, videoOf, shortOf, allVideos, allShorts, uploads, openVideo, openShort, openChannel, push,
    openSheet: setSheet, setToast, toggleSubscribe, toggleLike, toggleDislike, commentsFor, addComment, download, downloading,
  };

  const unread = session.seenNotices ? 0 : notices.filter(item => item.unread && !session.read.includes(item.id)).length;
  const top = stack[stack.length - 1];
  const watchVideo = watchId ? videoOf(watchId) : undefined;
  const hasMini = Boolean(watchVideo && mini && tab !== 'shorts');


  const probe = (url: string) => new Promise<{ seconds: number; portrait: boolean }>(resolve => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => resolve({ seconds: Number.isFinite(el.duration) ? el.duration : 0, portrait: el.videoHeight > el.videoWidth });
    el.onerror = () => resolve({ seconds: 0, portrait: false });
    el.src = url;
  });
  const pickVideo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const meta = await probe(url);
    const id = `up-${Date.now()}`;
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    setUploads(prev => [{ id, title, channelId: 'me', src: url, poster: '', seconds: Math.round(meta.seconds), viewCount: 0, age: 'Just now', days: 0, topics: [], likeCount: 0, commentCount: 0, description: 'Uploaded from this device. Visible only in this preview session.', tags: [], uploaded: true }, ...prev]);
    setToast({ text: 'Upload complete', action: { label: 'View', run: () => openVideo(id) } });
  };
  const pickShort = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `us-${Date.now()}`;
    const source = remixOf ? videoOf(remixOf) ?? shortOf(remixOf) : undefined;
    setShortUploads(prev => [{ id, title: source ? `Remix of “${source.title}”` : file.name.replace(/\.[^.]+$/, ''), channelId: 'me', src: url, poster: '', viewCount: 0, likeCount: 0, commentCount: 0, sound: source ? `Sound · ${channelOf(source.channelId).name}` : 'Original sound', uploaded: true }, ...prev]);
    setRemixOf(null);
    setShortsIndex(0);
    setShortsBack(null);
    setStack([]);
    setTab('shorts');
    setToast({ text: 'Your Short is up' });
  };

  const sheetTitle = (item: Video | Short | undefined) => item?.title ?? '';
  const renderSheet = () => {
    if (!sheet) return null;
    const close = () => setSheet(null);
    if (sheet.kind === 'create') return <SheetFrame title="Create" onClose={close}>
      <MenuItem icon="shorts" label="Create a Short" onClick={() => { close(); setRemixOf(null); shortRef.current?.click(); }} trailing={null} />
      <MenuItem icon="upload" label="Upload a video" onClick={() => { close(); uploadRef.current?.click(); }} />
      <MenuItem icon="live" label="Go live" onClick={() => { close(); setToast({ text: 'Going live needs a verified channel and camera access' }); }} />
      <MenuItem icon="post" label="Create a post" onClick={() => setSheet({ kind: 'post' })} />
    </SheetFrame>;
    if (sheet.kind === 'post') return <SheetFrame title="Create post" onClose={close} footer={<div className={s.sheetFoot}>
      <button type="button" className={`${s.pill}`} onClick={close}>Cancel</button>
      <button type="button" className={`${s.pill} ${s.pillDark}`} disabled={!postDraft.trim()} onClick={() => {
        patch(prev => ({ posts: [{ id: `p-me-${prev.posts.length + 1}`, channelId: 'me', body: postDraft.trim(), time: 'Just now', likes: 0 }, ...prev.posts] }));
        setPostDraft(''); close(); setToast({ text: 'Post published', action: { label: 'View', run: () => openChannel('me') } });
      }}>Post</button>
    </div>}>
      <div className={s.postHead} style={{ padding: '0 16px' }}><Avatar src={me.avatar} name={me.name} size={32} /><strong>{me.name}</strong></div>
      <textarea value={postDraft} onChange={event => setPostDraft(event.target.value)} placeholder="Share a thought, an update or a sneak peek…" aria-label="Post text" rows={5} style={{ width: 'calc(100% - 32px)', margin: '8px 16px', border: 0, outline: 'none', resize: 'none', fontSize: 15, background: 'transparent' }} />
    </SheetFrame>;
    if (sheet.kind === 'menu') {
      const item = videoOf(sheet.id);
      const short = shortOf(sheet.id);
      const target = item ?? short;
      if (!target) return null;
      const later = session.later.includes(sheet.id);
      const from = sheet.from;
      const removable = from === 'history' ? 'Remove from watch history' : from === 'later' ? 'Remove from Watch later' : from === 'liked' ? 'Remove from Liked videos' : from === 'downloads' ? 'Delete from downloads' : from?.startsWith('playlist:') ? 'Remove from playlist' : null;
      return <SheetFrame onClose={close}>
        {removable ? <MenuItem icon="trash" label={removable} onClick={() => {
          close();
          if (from === 'history') patch(prev => ({ history: prev.history.filter(id => id !== sheet.id) }));
          if (from === 'later') patch(prev => ({ later: prev.later.filter(id => id !== sheet.id) }));
          if (from === 'liked') patch(prev => ({ liked: prev.liked.filter(id => id !== sheet.id) }));
          if (from === 'downloads') patch(prev => ({ downloads: prev.downloads.filter(id => id !== sheet.id) }));
          if (from?.startsWith('playlist:')) patch(prev => ({ playlists: prev.playlists.map(list => (`playlist:${list.id}` === from ? { ...list, ids: list.ids.filter(id => id !== sheet.id) } : list)) }));
        }} /> : null}
        {item ? <MenuItem icon="clock" label={later ? 'Remove from Watch later' : 'Save to Watch later'} onClick={() => {
          close();
          patch(prev => ({ later: toggle(prev.later, sheet.id) }));
          setToast(later ? { text: 'Removed from Watch later' } : { text: 'Saved to Watch later', action: { label: 'Change', run: () => setSheet({ kind: 'save', id: sheet.id }) } });
        }} /> : null}
        {item ? <MenuItem icon="playlist-add" label="Save to playlist" onClick={() => setSheet({ kind: 'save', id: sheet.id })} /> : null}
        {item ? <MenuItem icon={session.downloads.includes(sheet.id) ? 'downloaded' : 'download'} label={session.downloads.includes(sheet.id) ? 'Delete from downloads' : 'Download video'} onClick={() => { close(); download(sheet.id); }} /> : null}
        <MenuItem icon="share" label="Share" onClick={() => setSheet({ kind: 'share', id: sheet.id })} />
        <MenuItem icon="not-interested" label="Not interested" onClick={() => {
          close();
          patch(prev => ({ hidden: [...prev.hidden, sheet.id] }));
          if (short) setToast({ text: "Got it. You'll see fewer Shorts like this.", action: { label: 'Undo', run: () => patch(prev => ({ hidden: prev.hidden.filter(id => id !== sheet.id) })) } });
        }} />
        <MenuItem icon="block" label="Don't recommend channel" onClick={() => {
          close();
          patch(prev => ({ blocked: pushRecent(prev.blocked, target.channelId) }));
          setToast({ text: "We won't recommend videos from this channel to you again", action: { label: 'Undo', run: () => patch(prev => ({ blocked: prev.blocked.filter(id => id !== target.channelId) })) } });
        }} />
      </SheetFrame>;
    }
    if (sheet.kind === 'share') {
      const item = videoOf(sheet.id) ?? shortOf(sheet.id);
      const channelId = sheet.id.startsWith('channel:') ? sheet.id.slice(8) : null;
      const path = channelId ? `/${channelOf(channelId).handle}` : item && 'seconds' in item ? `/watch?v=${item.id}` : `/shorts/${sheet.id}`;
      const link = `https://youtube.example${path}`;
      const text = channelId ? channelOf(channelId).name : sheetTitle(item);
      const copy = async () => { try { await navigator.clipboard.writeText(link); } catch { /* clipboard blocked */ } close(); setToast({ text: 'Link copied to clipboard' }); };
      return <SheetFrame title="Share" onClose={close}>
        <div className={s.linkBox}><span>{link}</span><button type="button" className={`${s.pill} ${s.pillSmall} ${s.pillDark}`} onClick={copy}>Copy</button></div>
        <div className={s.shareRow}>
          <button type="button" className={s.shareTarget} onClick={copy}><span className={s.menuIconCircle}><Icon name="link" /></span>Copy link</button>
          <button type="button" className={s.shareTarget} onClick={() => setSheet({ kind: 'post' })}><span className={s.menuIconCircle}><Icon name="post" /></span>Create post</button>
          <a className={s.shareTarget} href={`sms:?&body=${encodeURIComponent(`${text} ${link}`)}`} onClick={close}><span className={s.menuIconCircle}><Icon name="message" /></span>Messages</a>
          <a className={s.shareTarget} href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(link)}`} onClick={close}><span className={s.menuIconCircle}><Icon name="mail" /></span>Mail</a>
          <button type="button" className={s.shareTarget} onClick={async () => {
            close();
            if (navigator.share) { try { await navigator.share({ title: text, url: link }); } catch { /* cancelled */ } } else setToast({ text: 'More sharing options aren’t available in this browser' });
          }}><span className={s.menuIconCircle}><Icon name="more" /></span>More</button>
        </div>
      </SheetFrame>;
    }
    if (sheet.kind === 'save') {
      const id = sheet.id;
      const later = session.later.includes(id);
      return <SheetFrame title="Save video to..." onClose={close} footer={<div className={s.sheetFoot}><button type="button" className={`${s.pill}`} onClick={() => setSheet({ kind: 'newPlaylist', id })}><Icon name="plus" />New playlist</button><button type="button" className={`${s.pill} ${s.pillDark}`} onClick={close}>Done</button></div>}>
        <button type="button" className={s.menuItem} onClick={() => patch(prev => ({ later: toggle(prev.later, id) }))}><span className={`${s.checkbox} ${later ? s.checkboxOn : ''}`}>{later ? <Icon name="check" /> : null}</span><span className={s.grow}>Watch later</span><Icon name="lock" /></button>
        {session.playlists.map(list => {
          const on = list.ids.includes(id);
          return <button key={list.id} type="button" className={s.menuItem} onClick={() => patch(prev => ({ playlists: prev.playlists.map(entry => (entry.id === list.id ? { ...entry, ids: toggle(entry.ids, id) } : entry)) }))}><span className={`${s.checkbox} ${on ? s.checkboxOn : ''}`}>{on ? <Icon name="check" /> : null}</span><span className={s.grow}>{list.title}</span><Icon name="lock" /></button>;
        })}
      </SheetFrame>;
    }
    if (sheet.kind === 'newPlaylist') {
      const create = () => {
        const title = newList.trim();
        if (!title) return;
        patch(prev => ({ playlists: [...prev.playlists, { id: `pl-${prev.playlists.length + 1}-${title.toLowerCase().replace(/\W+/g, '-')}`, title, ids: sheet.id ? [sheet.id] : [] }] }));
        setNewList('');
        close();
        setToast({ text: `Saved to ${title}` });
      };
      return <SheetFrame title="New playlist" onClose={close} footer={<div className={s.sheetFoot}><button type="button" className={s.pill} onClick={close}>Cancel</button><button type="button" className={`${s.pill} ${s.pillDark}`} disabled={!newList.trim()} onClick={create}>Create</button></div>}>
        <form className={s.inlineField} onSubmit={event => { event.preventDefault(); create(); }}><input value={newList} onChange={event => setNewList(event.target.value)} placeholder="Choose a title" aria-label="Playlist title" autoFocus maxLength={60} /></form>
        <MenuItem icon="lock" label="Private" detail="Only you can view" onClick={() => {}} />
      </SheetFrame>;
    }
    if (sheet.kind === 'subscribed') {
      const bell = session.bells[sheet.channelId] ?? 'personalized';
      const set = (value: Bell) => { patch(prev => ({ bells: { ...prev.bells, [sheet.channelId]: value } })); close(); };
      return <SheetFrame title="Notifications" onClose={close}>
        <MenuItem icon="bell-ring" label="All" onClick={() => set('all')} trailing={<span className={`${s.radio} ${bell === 'all' ? s.radioOn : ''}`} />} />
        <MenuItem icon="bell" label="Personalized" onClick={() => set('personalized')} trailing={<span className={`${s.radio} ${bell === 'personalized' ? s.radioOn : ''}`} />} />
        <MenuItem icon="bell-off" label="None" onClick={() => set('none')} trailing={<span className={`${s.radio} ${bell === 'none' ? s.radioOn : ''}`} />} />
        <MenuItem icon="block" label="Unsubscribe" onClick={() => setSheet({ kind: 'unsubscribe', channelId: sheet.channelId })} />
      </SheetFrame>;
    }
    if (sheet.kind === 'unsubscribe') return <>
      <div className={s.backdrop} onClick={close} aria-hidden="true" />
      <div className={s.dialog} role="alertdialog" aria-modal="true" aria-label="Unsubscribe">
        <p>Unsubscribe from {channelOf(sheet.channelId).name}?</p>
        <div className={s.dialogActions}><button type="button" onClick={close}>Cancel</button><button type="button" onClick={() => { close(); toggleSubscribe(sheet.channelId); }}>Unsubscribe</button></div>
      </div>
    </>;
    if (sheet.kind === 'remix') {
      const item = videoOf(sheet.id) ?? shortOf(sheet.id);
      const pick = () => { close(); setRemixOf(sheet.id); shortRef.current?.click(); };
      return <SheetFrame title="Remix" onClose={close}>
        <p className={s.meta} style={{ margin: '0 16px 8px' }}>{sheetTitle(item)}</p>
        <MenuItem icon="volume" label="Sound" detail="Use the sound from this video in a Short" onClick={pick} />
        <MenuItem icon="video" label="Green screen" detail="Use this video as your background" onClick={pick} />
        <MenuItem icon="clip" label="Cut" detail="Use a segment of this video" onClick={pick} />
        <MenuItem icon="remix" label="Collab" detail="Record side by side with this video" onClick={pick} />
      </SheetFrame>;
    }
    if (sheet.kind === 'shortComments') {
      const item = shortOf(sheet.id);
      if (!item) return null;
      return <><div className={s.backdrop} onClick={close} aria-hidden="true" /><div className={`${s.sheet} ${s.sheetTall}`} role="dialog" aria-modal="true" aria-label="Comments"><div className={s.grabber} /><CommentsView ctx={ctx} targetId={item.id} ownerId={item.channelId} count={item.commentCount} onClose={close} /></div></>;
    }
    if (sheet.kind === 'cast') return <SheetFrame title="Cast to" onClose={close}>
      <p className={s.meta} style={{ margin: '0 16px 12px' }}>Make sure your phone and TV are on the same Wi-Fi network. No devices were found nearby.</p>
      <MenuItem icon="cast" label="Link with TV code" onClick={() => { close(); setToast({ text: 'Enter the TV code shown in YouTube on your TV' }); }} />
    </SheetFrame>;
    if (sheet.kind === 'time') {
      const seconds = Object.values(session.progress).reduce((sum, value) => sum + value, 0);
      return <SheetFrame title="Time watched" onClose={close}>
        <div className={s.statBig}><strong>{Math.max(0, Math.round(seconds / 60))} min</strong><span>Watched in this session · {session.history.length} videos in history</span></div>
      </SheetFrame>;
    }
    if (sheet.kind === 'settings') return <SheetFrame title="Settings" onClose={close}>
      <MenuItem icon="play" label="Autoplay next video" onClick={() => patch(prev => ({ autoplay: !prev.autoplay }))} trailing={<span className={`${s.switch} ${session.autoplay ? s.switchOn : ''}`} />} />
      <MenuItem icon="incognito" label="Incognito" detail="Watch without adding to history" onClick={() => patch(prev => ({ incognito: !prev.incognito }))} trailing={<span className={`${s.switch} ${session.incognito ? s.switchOn : ''}`} />} />
      <MenuItem icon="history" label="Clear watch history" onClick={() => { patch(() => ({ history: [], progress: {} })); close(); setToast({ text: 'Watch history cleared' }); }} />
      <MenuItem icon="trash" label="Clear search history" onClick={() => { patch(() => ({ searches: [] })); close(); setToast({ text: 'Search history cleared' }); }} />
    </SheetFrame>;
    return null;
  };

  const renderTop = () => {
    if (!top) return null;
    if (top.kind === 'search') return <SearchScreen key={`search-${top.draft}`} ctx={ctx} draft={top.draft} onBack={pop} onSubmit={query => { patch(prev => ({ searches: pushRecent(prev.searches, query.toLowerCase(), 12) })); replaceTop({ kind: 'results', query }); }} />;
    if (top.kind === 'results') return <ResultsScreen key={`results-${top.query}`} ctx={ctx} query={top.query} onBack={pop} onEdit={() => replaceTop({ kind: 'search', draft: top.query })} mini={hasMini} />;
    if (top.kind === 'notifications') return <NotificationsScreen ctx={ctx} onBack={pop} mini={hasMini} />;
    if (top.kind === 'channel') return <ChannelScreen key={`channel-${top.id}`} ctx={ctx} id={top.id} onBack={pop} mini={hasMini} />;
    if (top.kind === 'list') return <ListScreen key={`list-${top.list}`} ctx={ctx} list={top.list} onBack={pop} mini={hasMini} />;
    if (top.kind === 'explore') return <ExploreScreen ctx={ctx} onBack={pop} />;
    return <TopicScreen key={`topic-${top.id}`} ctx={ctx} id={top.id} onBack={pop} mini={hasMini} />;
  };

  const navItems: { id: Tab | 'create'; label: string; icon: IconName; active: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home', active: 'home-fill' },
    { id: 'shorts', label: 'Shorts', icon: 'shorts', active: 'shorts-fill' },
    { id: 'create', label: 'Create', icon: 'create', active: 'create' },
    { id: 'subs', label: 'Subscriptions', icon: 'subs', active: 'subs-fill' },
    { id: 'you', label: 'You', icon: 'account', active: 'account' },
  ];
  const dark = tab === 'shorts' && !top;

  return <main className={s.outer} lang="en">
    <div
      ref={appRef}
      className={`${s.app} ${settling ? s.settling : ''}`}
      style={{ '--appW': `${size.w}px`, '--appH': `${size.h}px` } as CSSProperties}
    >
      <HomeScreen ctx={ctx} unread={unread} chip={homeChip} setChip={setHomeChip} mini={hasMini} hidden={tab !== 'home'} scrollRef={el => { homeScroll.current = el; }} />
      <SubscriptionsScreen ctx={ctx} unread={unread} mini={hasMini} hidden={tab !== 'subs'} />
      <YouScreen ctx={ctx} mini={hasMini} hidden={tab !== 'you'} />
      {tab === 'shorts' ? <ShortsPager ctx={ctx} items={shortsFeed} index={Math.min(shortsIndex, Math.max(0, shortsFeed.length - 1))} setIndex={setShortsIndex} onBack={shortsBack ? () => { setTab(shortsBack); setShortsBack(null); } : undefined} suspended={Boolean(top) || Boolean(sheet && sheet.kind !== 'shortComments' && sheet.kind !== 'menu')} /> : null}
      {renderTop()}

      {watchVideo ? <section
        className={`${s.watch} ${mini ? s.miniOn : ''} ${fullscreen ? `${s.fullscreen} ${s.watchDark}` : ''} ${tab === 'shorts' && mini ? s.hidden : ''}`}
        aria-label={mini ? 'Miniplayer' : 'Watch'}
      >
        <WatchPanel key={watchVideo.id} ctx={ctx} video={watchVideo} mini={mini} fullscreen={fullscreen} setFullscreen={setFullscreen} suspended={tab === 'shorts' && mini} setP={setP} settle={settle} travel={travel} onClose={closeWatch} />
      </section> : null}

      <nav ref={navRef} className={`${s.nav} ${dark ? s.navDark : ''}`} aria-label="Main">
        {navItems.map(item => {
          const active = item.id === tab;
          if (item.id === 'create') return <button key={item.id} type="button" className={`${s.navItem} ${s.navCreate}`} aria-label="Create" onClick={() => setSheet({ kind: 'create' })}><Icon name="create" /></button>;
          return <button key={item.id} type="button" className={s.navItem} aria-current={active ? 'page' : undefined} onClick={() => go(item.id as Tab)}>
            {item.id === 'you'
              ? <span className={`${s.navAvatar} ${active ? s.navAvatarActive : ''}`} style={{ borderRadius: '50%' }}>{session.incognito ? <Icon name="incognito" /> : <Avatar src={me.avatar} name={me.name} tone={me.tone} size={24} />}</span>
              : <Icon name={active ? item.active : item.icon} />}
            <span>{item.label}</span>
          </button>;
        })}
      </nav>

      {renderSheet()}
      {toast ? <div className={`${s.toast} ${hasMini ? s.toastAboveMini : ''}`} role="status"><span>{toast.text}</span>{toast.action ? <button type="button" onClick={() => { toast.action?.run(); setToastState(null); }}>{toast.action.label}</button> : null}</div> : null}
      <input ref={uploadRef} type="file" accept="video/*" className={s.srOnly} onChange={pickVideo} tabIndex={-1} aria-hidden="true" />
      <input ref={shortRef} type="file" accept="video/*" capture="environment" className={s.srOnly} onChange={pickShort} tabIndex={-1} aria-hidden="true" />
    </div>
  </main>;
}
