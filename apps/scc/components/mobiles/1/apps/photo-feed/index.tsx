/* eslint-disable @next/next/no-img-element -- Feed photos are local, pre-sized sample photographs. */
import { Icon, Swap, TabBar, ios, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { avatarGradient, compact, handleAt, photoSrc, posts, stories } from "./data";
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
const SCROLL_PER_MINUTE = 34;

const storyNames = ["Your story", "maya.eats", "theo.reyes", "juneinbk", "carlos.m", "nora.and.co", "sam.ocean"];

function Post({ seed, index }: { seed: number; index: number }) {
  const rng = createRng(hash(seed, index));
  const photo = posts[(seed + index * 3) % posts.length];
  const handle = handleAt(seed + index * 5);
  const likes = Math.round(10 ** rng.range(2.3, 4.7));
  const other = handleAt(seed + index * 7 + 2);
  return (
    <article className={styles.post}>
      <div className={styles.postHead}>
        <span className={styles.postAvatar} style={{ background: avatarGradient(seed + index * 5) }}>{handle[0].toUpperCase()}</span>
        <span className={styles.who}>{handle}<small>{photo.place}</small></span>
        <Icon name="more" size={22} stroke={2.6} />
      </div>
      <img className={styles.photo} src={photoSrc(photo.img)} alt={photo.alt} decoding="async" loading="lazy" />
      <div className={styles.actions}>
        <Icon name="heart" size={26} stroke={1.8} />
        <Icon name="bubble" size={25} stroke={1.8} />
        <Icon name="send" size={25} stroke={1.8} />
        <Icon name="tag" size={24} stroke={1.8} />
      </div>
      <div className={styles.likes}>Liked by {other} and {compact(likes)} others</div>
      <div className={styles.captionText}><b>{handle}</b> {photo.caption}</div>
      <div className={styles.muted}>View all {rng.int(3, 240)} comments</div>
      <div className={styles.tiny}>{rng.pick(["12 minutes ago", "47 minutes ago", "2 hours ago", "5 hours ago", "9 hours ago", "1 day ago"])}</div>
    </article>
  );
}

function Feed({ seed, elapsed }: ScreenProps) {
  // One monotonic scroll offset; posts sit at fixed positions so the field's
  // tick transition glides the feed instead of snapping between recycled posts.
  const offset = elapsed * SCROLL_PER_MINUTE;
  const first = Math.max(0, Math.floor((offset - STORIES_HEIGHT) / POST_HEIGHT) - 1);
  const showStories = offset < STORIES_HEIGHT + POST_HEIGHT;
  const indices = [first, first + 1, first + 2, first + 3];
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Frame</span>
        <span className={styles.headerIcons}><Icon name="heart" size={26} /><Icon name="send" size={25} /></span>
      </header>
      <div className={styles.viewport}>
        <div className={`${styles.track} ${ios.flow}`} style={{ transform: `translateY(${-offset}px)` }}>
          {showStories && (
            <div className={styles.stories} style={{ marginTop: 0 }}>
              {storyNames.map((name, i) => (
                <div key={name} className={styles.story}>
                  <span className={`${styles.ring} ${i === 0 || i > 4 ? styles.ringSeen : ""}`}>
                    <span className={styles.ringInner} style={{ background: avatarGradient(seed + i * 4) }}>{name[0].toUpperCase()}</span>
                  </span>
                  {name.length > 10 ? `${name.slice(0, 9)}…` : name}
                </div>
              ))}
            </div>
          )}
          {indices.map((index) => (
            <div key={index} className={styles.slot} style={{ top: STORIES_HEIGHT + index * POST_HEIGHT }}>
              <Post seed={seed} index={index} />
            </div>
          ))}
        </div>
      </div>
      <TabBar items={tabs} active="home" tint="#000" />
    </div>
  );
}

const SEGMENTS = 5;
const MINUTES_PER_SEGMENT = timeConfig.beatMinutes;

function Story({ seed, elapsed }: ScreenProps) {
  const step = Math.floor(elapsed / MINUTES_PER_SEGMENT);
  const author = Math.floor(step / SEGMENTS);
  const segment = step % SEGMENTS;
  const photo = stories[(seed + author * 5 + segment) % stories.length];
  const progress = ((elapsed % MINUTES_PER_SEGMENT) + 0.5) / MINUTES_PER_SEGMENT;
  const handle = handleAt(seed + author * 3 + 1);
  const rng = createRng(hash(seed, author, segment));
  return (
    <div className={`${styles.storyScreen} ${ios.dark}`}>
      <Swap id={step} kind="fade">
        <img className={styles.storyImg} src={photoSrc(photo.img)} alt={photo.alt} decoding="async" />
      </Swap>
      <div className={styles.storyTop} />
      <div className={styles.storyBottom} />
      <div className={styles.segments}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={styles.segment}><i style={{ width: i < segment ? "100%" : i === segment ? `${progress * 100}%` : "0%" }} /></span>
        ))}
      </div>
      <div className={styles.storyHead}>
        <span style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: avatarGradient(seed + author * 3 + 1), opacity: 1, fontWeight: 700 }}>{handle[0].toUpperCase()}</span>
        {handle}<span>{rng.pick(["1h", "3h", "5h", "8h", "12h"])}</span>
        <Icon name="close" size={24} stroke={2.2} />
      </div>
      <div className={styles.reply}>
        <span className={styles.replyField}>Send message</span>
        <Icon name="heart" size={28} stroke={1.9} />
        <Icon name="send" size={27} stroke={1.9} />
      </div>
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
