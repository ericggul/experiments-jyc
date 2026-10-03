/* eslint-disable @next/next/no-img-element -- Feed stills are local, pre-sized sample photographs. */
import { Icon, Storyboard, TabBar, ios, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { avatarGradient, clipAt, clipBackground, clipSrc, commentsFor, compact, type Clip } from "./data";
import styles from "./short-video.module.css";

const tabs: readonly TabItem[] = [
  { id: "home", label: "Home", icon: "house" },
  { id: "friends", label: "Friends", icon: "person" },
  { id: "post", label: "", icon: "plus" },
  { id: "inbox", label: "Inbox", icon: "bubble", badge: 3 },
  { id: "me", label: "Profile", icon: "person" },
];

/** One clip fills the glass; the feed is a vertical strip of them. */
const CLIP_H = 844;
/** Upper bound on clips per scene (DOM budget); long scenes slow down a little instead. */
const MAX_CLIPS = 28;
const MAX_DETOURS = 4;
/** Longest stretch between shots, in simulated minutes. */
const MAX_SHOT_MINUTES = 2.4;
const COMMENTS_TOP = 232;
const COMMENTS = 7;

/** Rail hit points on the glass (pt). */
const tap = {
  avatar: { x: 362, y: 366 },
  like: { x: 362, y: 440 },
  comments: { x: 362, y: 509 },
  dimmed: { x: 195, y: 140 },
  back: { x: 26, y: 76 },
  commentLike: { x: 362, y: 420 },
} as const;

type Spec = { kind: "comments"; clip: number; opening: boolean } | { kind: "profile"; clip: number };

type Plan = { duration: number; shots: Shot[]; specs: Record<string, Spec>; clips: number };

const isNight = (clock: number) => clock >= 22 * 60 || clock < 4 * 60;

/**
 * The doomscroll in simulated time: runs of swipe-ups (one decelerating flick
 * per clip), a like now and then, a comments sheet, a creator's profile, back,
 * keep swiping. Late at night the clips go by faster and detours get rarer.
 */
function plan({ seed, duration, view, clock }: Pick<ScreenProps, "seed" | "duration" | "view" | "clock">): Plan {
  const rng = createRng(hash(seed, "loop-session", view));
  const total = Math.max(4, duration);
  const night = isNight(clock);
  const perClip = Math.max(night ? rng.range(0.9, 1.2) : rng.range(1.1, 1.5), (total * 0.7) / MAX_CLIPS);
  const shots: Shot[] = [];
  const specs: Record<string, Spec> = {};
  let t = 0;
  let clip = 0;
  let detours = 0;
  /** How the feed comes back after a detour; null while the person is already on it. */
  let back: Shot["enter"] | null = "cut";
  let backTap: Shot["tap"];
  const openComments = (at: number) => {
    const id = `comments-${detours++}`;
    specs[id] = { kind: "comments", clip, opening: shots.length === 0 };
    shots.push({ panel: id, at, enter: shots.length ? "sheet" : "cut", tap: shots.length ? tap.comments : undefined, scroll: rng.int(180, 420), flicks: rng.int(1, 2) });
    let end = at + rng.range(1.4, 2.2);
    if (rng.chance(0.6)) {
      shots.push({ panel: id, at: end, tap: tap.commentLike, scroll: rng.int(480, 720), flicks: 2 });
      end += rng.range(1.4, 2.2);
    }
    back = "dismiss";
    backTap = tap.dimmed;
    return end;
  };
  if (view === "comments") t = openComments(0);
  let furthest = 0;
  while (t < total) {
    // Two or three swipe-ups per shot: the first clip holds through the shot's lead-in, the rest flick by.
    // Past the clip budget (only very long scenes) the person swipes back to rewatch, then on again.
    const step = perClip * 3 <= MAX_SHOT_MINUTES ? rng.int(2, 3) : 2;
    const target = clip + step <= MAX_CLIPS - 1 ? clip + step : Math.max(0, clip - rng.int(2, 4));
    const run = Math.abs(target - clip);
    const liked = back === null && rng.chance(0.3);
    clip = target;
    furthest = Math.max(furthest, clip);
    shots.push({
      panel: "feed",
      at: t,
      enter: back ?? undefined,
      tap: back === null ? (liked ? tap.like : undefined) : backTap,
      scroll: clip * CLIP_H,
      flicks: run,
    });
    t += Math.min(MAX_SHOT_MINUTES, run * perClip + 0.3);
    back = null;
    backTap = undefined;
    if (t >= total || detours >= MAX_DETOURS) continue;
    const kind = rng.weighted([
      ["comments", view === "comments" ? 6 : night ? 1.2 : 2],
      ["profile", night ? 0.6 : 1.4],
      ["none", view === "comments" ? 1 : night ? 5 : 3],
    ] as const);
    if (kind === "comments") t = openComments(t);
    else if (kind === "profile") {
      const id = `profile-${detours++}`;
      specs[id] = { kind: "profile", clip };
      shots.push({ panel: id, at: t, enter: "push", tap: tap.avatar, scroll: rng.int(160, 460), flicks: rng.int(1, 2) });
      t += rng.range(1.6, 2.4);
      back = "pop";
      backTap = tap.back;
    }
  }
  return { duration: total, shots, specs, clips: furthest + 2 };
}

function ClipView({ clip, seed, index }: { clip: Clip; seed: number; index: number }) {
  return (
    <div className={styles.clip} style={clip.img ? undefined : { background: clipBackground(clip.hue) }}>
      {clip.img ? <img className={styles.still} src={clipSrc(clip.img)} alt={clip.alt} decoding="async" /> : null}
      {clip.overlay ? <div className={clip.img ? styles.sticker : styles.bigText}>{clip.overlay}</div> : null}
      <div className={styles.rail}>
        <span className={styles.avatar} data-following={clip.following} style={{ background: avatarGradient(seed + index * 5) }}>{clip.handle[0].toUpperCase()}</span>
        <span className={`${styles.railItem} ${styles.heart}`}>{compact(clip.likes)}</span>
        <span className={`${styles.railItem} ${styles.bubble}`}>{compact(clip.comments)}</span>
        <span className={`${styles.railItem} ${styles.save}`}>{compact(clip.saves)}</span>
        <span className={`${styles.railItem} ${styles.share}`}>{compact(clip.shares)}</span>
      </div>
      <div className={styles.caption}>
        <div className={styles.handle}>{clip.handle}{clip.sponsored ? " · Sponsored" : ""}</div>
        <div className={styles.text}>{clip.caption} <b>{clip.tags}</b></div>
        <div className={styles.sound}>{clip.sound}</div>
      </div>
    </div>
  );
}

function CommentsPanel({ seed, index }: { seed: number; index: number }) {
  const list = commentsFor(seed, index, COMMENTS);
  return (
    <>
      {list.map((c, i) => (
        <div key={c.id} className={styles.comment}>
          <span className={styles.cAvatar} style={{ background: avatarGradient(seed + i * 3 + c.likes) }}>{c.name[0].toUpperCase()}</span>
          <span className={styles.cBody}>
            <span className={styles.cName}>{c.name}</span>
            <span className={styles.cText}>{c.text}</span>
            <span className={styles.cMeta}>{c.age}   Reply{c.replies ? `   View ${c.replies} replies` : ""}</span>
          </span>
          <span className={`${styles.cLike} ${styles.heart}`}>{compact(c.likes)}</span>
        </div>
      ))}
    </>
  );
}

function commentsChrome(clip: Clip, owner: ScreenProps["owner"], opening: boolean) {
  return (
    <>
      {!opening ? null : clip.img ? <img className={styles.peek} src={clipSrc(clip.img)} alt={clip.alt} decoding="async" /> : <span className={styles.peek} style={{ background: clipBackground(clip.hue) }} />}
      <div className={styles.sheetHead}>{clip.comments.toLocaleString("en-US")} comments<Icon name="close" size={18} stroke={2.2} className={styles.sheetClose} /></div>
      <div className={styles.composer}>
        <span className={styles.cAvatar} style={{ background: avatarGradient(owner.seed) }}>{owner.firstName[0]}</span>
        <span className={styles.field}>Add comment…</span>
      </div>
    </>
  );
}

function ProfilePanel({ seed, clip, index }: { seed: number; clip: Clip; index: number }) {
  const rng = createRng(hash(seed, "profile", index));
  return (
    <div className={styles.profile}>
      <span className={styles.bigAvatar} style={{ background: avatarGradient(seed + index * 5) }}>{clip.handle[0].toUpperCase()}</span>
      <div className={styles.at}>@{clip.handle}</div>
      <div className={styles.stats}>
        <span><b>{rng.int(40, 900)}</b>Following</span>
        <span><b>{compact(Math.round(10 ** rng.range(3, 6.3)))}</b>Followers</span>
        <span><b>{compact(Math.round(10 ** rng.range(4, 7.4)))}</b>Likes</span>
      </div>
      <div className={styles.buttons}><span className={styles.follow}>{clip.following ? "Following" : "Follow"}</span><span>Message</span></div>
      <div className={styles.bio}>{rng.pick(["nyc · food · bad jokes", "posting until someone stops me", "brooklyn, mostly at night", "part-time chef, full-time critic", "new video every weekday", "queens born and raised"])}</div>
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => {
          const other = clipAt(hash(seed, "grid", index), i);
          return (
            <span key={other.id} className={styles.thumb} style={{ background: other.img ? `center / cover url(${clipSrc(other.img)})` : clipBackground(other.hue) }}>
              {compact(Math.round(other.likes * 6.3))}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const feedChrome = (
  <>
    <div className={styles.top}><span>Following</span><span className={styles.on}>For You</span></div>
    <Icon name="search" size={24} stroke={2.1} className={styles.search} />
    <TabBar items={tabs} active="home" tone="light" tint="#fff" />
  </>
);

const profileChrome = (handle: string) => (
  <header className={styles.profileBar}><Icon name="chevronLeft" size={26} stroke={2.4} /><b>{handle}</b><Icon name="more" size={22} stroke={2.6} /></header>
);

function session(props: ScreenProps): Session {
  const { seed, owner } = props;
  const script = plan(props);
  const clips = Array.from({ length: script.clips }, (_, i) => clipAt(seed, i));
  const panels: Record<string, Panel> = {
    feed: {
      chrome: feedChrome,
      body: clips.map((clip, i) => <ClipView key={clip.id} clip={clip} seed={seed} index={i} />),
    },
  };
  for (const [id, spec] of Object.entries(script.specs)) {
    const clip = clips[spec.clip];
    if (spec.kind === "comments") {
      panels[id] = { className: styles.commentsPanel, top: COMMENTS_TOP + 48, bottom: 96, chrome: commentsChrome(clip, owner, spec.opening), body: <CommentsPanel seed={seed} index={spec.clip} /> };
    } else {
      panels[id] = { className: styles.profilePanel, top: 98, chrome: profileChrome(clip.handle), body: <ProfilePanel seed={seed} clip={clip} index={spec.clip} /> };
    }
  }
  return { duration: script.duration, shots: script.shots, panels };
}

export function ShortVideoScreen(props: ScreenProps) {
  return (
    <div className={`${styles.screen} ${ios.dark}`}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => session(props)} />
    </div>
  );
}

const shortVideo: CloneDefinition = {
  Screen: ShortVideoScreen,
  tone: () => "light",
  fixtures: [
    { view: "feed", label: "doomscroll", clock: 23 * 60 + 41, duration: 34, seed: 11 },
    { view: "feed", label: "break scroll", clock: 10 * 60 + 40, duration: 7, seed: 4 },
    { view: "comments", label: "late comments", clock: 23 * 60 + 58, duration: 6, seed: 7 },
  ],
};

export default shortVideo;
