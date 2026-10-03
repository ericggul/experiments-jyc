/* eslint-disable @next/next/no-img-element -- Feed photos are local, pre-sized sample photographs. */
import { Icon, Storyboard, TabBar, ios, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { avatarGradient, cardBackground, compact, handleAt, photoSrc, postAt, storyFrame, type StoryFrame } from "./data";
import styles from "./photo-feed.module.css";

const tabs: readonly TabItem[] = [
  { id: "home", label: "", icon: "house" },
  { id: "search", label: "", icon: "search" },
  { id: "post", label: "", icon: "plus" },
  { id: "activity", label: "", icon: "heart" },
  { id: "me", label: "", icon: "person" },
];

const POST_HEIGHT = 570;
const STORIES_HEIGHT = 108;
const HEADER = 98;
const TAB_BAR = 83;
/** Feed scrolling speed while the person is on the feed: pt per simulated minute. */
const FEED_PT_PER_MINUTE = 300;
const MAX_POSTS = 20;
const MAX_DETOURS = 5;
/** Story frames per scene (DOM budget); long scenes linger a little longer per frame. */
const MAX_FRAMES = 34;

const tap = {
  photo: { x: 195, y: 330 },
  homeTab: { x: 39, y: 784 },
  back: { x: 24, y: 76 },
  commentsLink: { x: 80, y: 640 },
  avatar: { x: 30, y: 125 },
  next: { x: 320, y: 420 },
  previous: { x: 60, y: 420 },
  reply: { x: 150, y: 800 },
  reaction: { x: 195, y: 430 },
} as const;

function PostView({ seed, index }: { seed: number; index: number }) {
  const post = postAt(seed, index);
  return (
    <article className={styles.post}>
      <div className={styles.postHead}>
        <span className={styles.postAvatar} style={{ background: avatarGradient(seed + index * 5) }}>{post.handle[0].toUpperCase()}</span>
        <span className={styles.who}>{post.handle}<small>{post.place}</small></span>
      </div>
      {post.img ? (
        <img className={styles.photo} src={photoSrc(post.img)} alt={post.alt} decoding="async" />
      ) : (
        <div className={styles.card} style={{ background: cardBackground(post.hue) }}>{post.quote}</div>
      )}
      <div className={styles.actions} data-carousel={post.carousel || undefined} />
      <div className={styles.likes}>{post.sponsor ? "Learn more" : `Liked by ${post.liker} and ${compact(post.likes)} others`}</div>
      <div className={styles.captionText}><b>{post.handle}</b> {post.caption}</div>
      <div className={styles.muted}>{post.comments > 1 ? `View all ${post.comments} comments` : "Add a comment…"}</div>
      <div className={styles.tiny}>{post.age}</div>
    </article>
  );
}

const commentLines = [
  "this is so good", "need to go here asap", "the light!!", "ok but who took this", "obsessed", "why is nobody talking about this",
  "same energy as last summer", "saving this", "invite me next time", "lmao the second one", "wait where is this", "core memory",
  "this made my day", "10/10 no notes", "the caption 😭", "you never post anymore", "miss you!!", "drop the address", "the colors omg",
  "booking a table rn", "is this the place on 5th", "u look so happy", "next time I'm coming", "the dog!!!",
];

function Comments({ seed, index }: { seed: number; index: number }) {
  const rng = createRng(hash(seed, index, "comments"));
  return (
    <div className={styles.comments}>
      {Array.from({ length: 7 }, (_, i) => {
        const handle = handleAt(hash(seed, index, i) % 252);
        return (
          <div key={`comment-${i}`} className={styles.comment}>
            <span className={styles.postAvatar} style={{ background: avatarGradient(seed + index + i * 3) }}>{handle[0].toUpperCase()}</span>
            <span><b>{handle}</b> {rng.pick(commentLines)}<small>{rng.int(1, 23)}h · {rng.int(0, 90)} likes · Reply</small></span>
          </div>
        );
      })}
    </div>
  );
}

function ProfileGrid({ seed, index }: { seed: number; index: number }) {
  const post = postAt(seed, index);
  const rng = createRng(hash(seed, index, "profile"));
  return (
    <div>
      <div className={styles.profileHead}>
        <span className={styles.profileAvatar} style={{ background: avatarGradient(seed + index * 5) }}>{post.handle[0].toUpperCase()}</span>
        <span><b>{rng.int(40, 900)}</b>posts</span><span><b>{compact(rng.int(300, 90_000))}</b>followers</span><span><b>{rng.int(200, 1500)}</b>following</span>
      </div>
      <div className={styles.profileBio}><b>{post.handle}</b>{rng.pick(["nyc · coffee · film", "brooklyn based. mostly food", "trying my best", "photos of things i like", "queens kid, manhattan job", "35mm and long walks", "dog mom · nurse · night owl"])}</div>
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => {
          const other = postAt(hash(seed, "grid", index), i);
          return other.img
            ? <img key={other.id} src={photoSrc(other.img)} alt="" decoding="async" />
            : <span key={other.id} className={styles.gridCard} style={{ background: cardBackground(other.hue) }} />;
        })}
      </div>
    </div>
  );
}

const storyNames = ["Your story", ...Array.from({ length: 6 }, (_, i) => i)];

const feedChrome = (
  <>
    <header className={styles.header}>
      <span className={styles.wordmark}>Frame</span>
      <span className={styles.headerIcons}><Icon name="heart" size={26} /><Icon name="send" size={25} /></span>
    </header>
    <TabBar items={tabs} active="home" tint="#000" />
  </>
);

const subHeader = (title: string) => (
  <>
    <header className={styles.subHeader}><Icon name="chevronLeft" size={26} stroke={2.4} /><b>{title}</b><Icon name="more" size={22} stroke={2.6} /></header>
    <TabBar items={tabs} active="home" tint="#000" />
  </>
);

/**
 * A feed session in simulated time: flick through posts, double-tap a photo,
 * tap into one, read its comments, visit a profile, come back and keep
 * scrolling. A detour every couple of simulated minutes, so a long night
 * scroll is a fast montage.
 */
function feedSession({ seed, duration }: ScreenProps): Session {
  const rng = createRng(hash(seed, "feed-session"));
  const total = Math.max(4, duration);
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  let scroll = 0;
  let deepest = 0;
  let t = 0;
  let detours = 0;
  let back: { enter: Shot["enter"]; tap?: Shot["tap"] } = { enter: "cut" };
  const maxScroll = STORIES_HEIGHT + (MAX_POSTS - 1) * POST_HEIGHT;
  while (t < total) {
    // A run of scrolling on the feed, sometimes opened by a double-tap like.
    const run = rng.range(1.4, 2.4);
    // At the end of the loaded feed (very long scenes) the home tab jumps back to the top.
    const top = scroll >= maxScroll && back.enter === undefined;
    scroll = top ? 0 : Math.min(maxScroll, scroll + run * FEED_PT_PER_MINUTE * rng.range(0.7, 1.3));
    deepest = Math.max(deepest, scroll);
    const like = back.enter === undefined && rng.chance(0.35) ? tap.photo : undefined;
    if (top) back = { enter: undefined, tap: tap.homeTab };
    shots.push({ panel: "feed", at: t, scroll, flicks: Math.max(1, Math.round(run / 0.9)), enter: back.enter, tap: back.tap ?? like });
    back = { enter: undefined };
    t += run;
    if (t >= total || detours >= MAX_DETOURS) continue;
    // A detour from the post currently on screen.
    const index = Math.min(MAX_POSTS - 1, Math.floor(Math.max(0, scroll - STORIES_HEIGHT + 200) / POST_HEIGHT));
    const kind = rng.weighted([["post", 3], ["profile", 2], ["none", 1.5]] as const);
    if (kind === "none") continue;
    detours++;
    if (kind === "post") {
      const id = `post-${detours}`;
      panels[id] = { body: <PostView seed={seed} index={index} />, chrome: subHeader("Posts"), top: HEADER, bottom: TAB_BAR };
      shots.push({ panel: id, at: t, enter: "push", tap: tap.photo });
      t += rng.range(1.3, 2.2);
      if (rng.chance(0.6)) {
        const sheet = `comments-${detours}`;
        panels[sheet] = { body: <Comments seed={seed} index={index} />, chrome: <header className={styles.sheetHead}>Comments</header>, top: 120, className: styles.sheetPanel };
        shots.push({ panel: sheet, at: t, enter: "sheet", scroll: rng.int(240, 460), flicks: 2, tap: tap.commentsLink });
        t += rng.range(1.6, 2.4);
        shots.push({ panel: id, at: t, enter: "dismiss" });
        t += 1.3;
      }
      back = { enter: "pop", tap: tap.back };
    } else {
      const id = `profile-${detours}`;
      panels[id] = { body: <ProfileGrid seed={seed} index={index} />, chrome: subHeader(postAt(seed, index).handle), top: HEADER, bottom: TAB_BAR };
      shots.push({ panel: id, at: t, enter: "push", scroll: rng.int(160, 320), tap: tap.avatar });
      t += rng.range(1.6, 2.4);
      back = { enter: "pop", tap: tap.back };
    }
  }
  const lastPost = Math.min(MAX_POSTS, Math.ceil((deepest + 900) / POST_HEIGHT) + 1);
  panels.feed = {
    top: HEADER,
    bottom: TAB_BAR,
    chrome: feedChrome,
    body: (
      <>
        <div className={styles.stories}>
          {storyNames.map((name, i) => {
            const label = typeof name === "string" ? name : handleAt(hash(seed, "ring", name) % 252);
            return (
              <div key={`ring-${i}`} className={styles.story}>
                <span className={`${styles.ring} ${i === 0 || i > 4 ? styles.ringSeen : ""}`}>
                  <span className={styles.ringInner} style={{ background: avatarGradient(seed + i * 4) }}>{label[0].toUpperCase()}</span>
                </span>
                {label.length > 10 ? `${label.slice(0, 9)}…` : label}
              </div>
            );
          })}
        </div>
        {Array.from({ length: lastPost }, (_, index) => <PostView key={`post-${index}`} seed={seed} index={index} />)}
      </>
    ),
  };
  return { duration: total, shots, panels };
}

function FrameView({ frame, handle, avatar, segments, segment }: { frame: StoryFrame; handle: string; avatar: string; segments: number; segment: number }) {
  return (
    <>
      {frame.img ? <img className={styles.storyImg} src={photoSrc(frame.img)} alt={frame.alt} decoding="async" /> : <span className={styles.storyImg} style={{ background: cardBackground(frame.hue) }} />}
      <div className={styles.segments}>
        {Array.from({ length: segments }, (_, i) => <span key={`seg-${i}`} className={styles.segment} data-state={i < segment ? "done" : i === segment ? "now" : undefined} />)}
      </div>
      <div className={styles.storyHead}>
        <span className={styles.storyAvatar} style={{ background: avatar }}>{handle[0].toUpperCase()}</span>
        {handle}<span>{frame.age}</span>
      </div>
      {frame.sticker ? <div className={frame.img ? styles.sticker : styles.storyText}>{frame.sticker}</div> : null}
      {frame.place ? <div className={styles.placeSticker}>{frame.place}</div> : null}
      {frame.music ? <div className={styles.musicSticker}>{frame.music}</div> : null}
      {frame.poll ? <div className={styles.poll}><span>{frame.poll[0]}</span><span>{frame.poll[1]}</span></div> : null}
    </>
  );
}

const reactions = ["😂", "😮", "😍", "😢", "👏", "🔥", "🎉", "💯"];

/**
 * Stories in simulated time: frames advance every minute or so, mostly by a
 * tap on the right edge; finishing an account slides to the next; now and
 * then a quick reaction from the reply bar, or a tap back to look again.
 */
function storySession({ seed, duration }: ScreenProps): Session {
  const rng = createRng(hash(seed, "story-session"));
  const total = Math.max(4, duration);
  const perFrame = Math.max(rng.range(0.8, 1.3), (total * 0.85) / MAX_FRAMES);
  const panels: Record<string, Panel> = {};
  const shots: Shot[] = [];
  let t = 0;
  let author = 0;
  let frames = 0;
  let replies = 0;
  while (t < total && frames < MAX_FRAMES) {
    const count = rng.int(2, 5);
    const handle = handleAt(hash(seed, "author", author) % 252);
    const avatar = avatarGradient(seed + author * 3 + 1);
    let previous: string | null = null;
    for (let segment = 0; segment < count && t < total && frames < MAX_FRAMES; segment++) {
      const frame = storyFrame(seed, author, segment);
      panels[frame.id] = { className: styles.storyPanel, body: <FrameView frame={frame} handle={handle} avatar={avatar} segments={count} segment={segment} /> };
      frames++;
      const tapped = rng.chance(0.7);
      shots.push({ panel: frame.id, at: t, enter: !shots.length ? "cut" : segment === 0 ? "push" : "cut", tap: shots.length && tapped ? tap.next : undefined });
      t += perFrame * rng.range(0.8, 1.2);
      if (previous && rng.chance(0.08)) {
        // Back a frame to look again, then forward.
        shots.push({ panel: previous, at: t, enter: "cut", tap: tap.previous });
        t += perFrame * 0.8;
        shots.push({ panel: frame.id, at: t, enter: "cut", tap: tap.next });
        t += perFrame * 0.6;
      }
      if (replies < 3 && rng.chance(0.12)) {
        const id = `reply-${replies++}`;
        panels[id] = {
          className: styles.reactPanel,
          body: (
            <>
              {frame.img ? <img className={styles.storyImg} src={photoSrc(frame.img)} alt="" decoding="async" /> : <span className={styles.storyImg} style={{ background: cardBackground(frame.hue) }} />}
              <div className={styles.reactions}>{reactions.map((emoji, i) => <span key={`reaction-${i}`}>{emoji}</span>)}</div>
              <div className={styles.replyFocus}>Reply to {handle}…</div>
            </>
          ),
        };
        shots.push({ panel: id, at: t, enter: "fade", tap: tap.reply });
        t += rng.range(1.1, 1.6);
        shots.push({ panel: frame.id, at: t, enter: "fade", tap: tap.reaction });
        t += perFrame * 0.6;
      }
      previous = frame.id;
    }
    author++;
  }
  return {
    duration: total,
    shots,
    panels,
    overlay: (
      <div className={styles.reply}>
        <span className={styles.replyField}>Send message</span>
        <Icon name="heart" size={28} stroke={1.9} />
        <Icon name="send" size={27} stroke={1.9} />
      </div>
    ),
  };
}

function Feed(props: ScreenProps) {
  return (
    <div className={styles.screen}>
      <Storyboard id={`feed:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => feedSession(props)} />
    </div>
  );
}

function Story(props: ScreenProps) {
  return (
    <div className={`${styles.storyScreen} ${ios.dark}`}>
      <Storyboard id={`story:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => storySession(props)} />
    </div>
  );
}

export function PhotoFeedScreen(props: ScreenProps) {
  return props.view === "story" ? <Story {...props} /> : <Feed {...props} />;
}

const photoFeed: CloneDefinition = {
  Screen: PhotoFeedScreen,
  tone: (view) => (view === "story" ? "light" : "dark"),
  fixtures: [
    { view: "feed", label: "scroll in bed", clock: 7 * 60 + 58, duration: 11, seed: 3 },
    { view: "feed", label: "late scroll", clock: 23 * 60 + 36, duration: 40, seed: 8 },
    { view: "story", label: "stories", clock: 12 * 60 + 41, duration: 12, seed: 5 },
  ],
};

export default photoFeed;
