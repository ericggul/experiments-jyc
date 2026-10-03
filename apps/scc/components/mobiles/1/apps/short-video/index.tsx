/* eslint-disable @next/next/no-img-element -- Feed stills are local, pre-sized sample photographs. */
import { Icon, Swap, TabBar, ios, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { timeConfig } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { avatarGradient, clipSrc, clips, comments, compact } from "./data";
import styles from "./short-video.module.css";

const tabs: readonly TabItem[] = [
  { id: "home", label: "Home", icon: "house" },
  { id: "friends", label: "Friends", icon: "person" },
  { id: "post", label: "", icon: "plus" },
  { id: "inbox", label: "Inbox", icon: "bubble", badge: 3 },
  { id: "me", label: "Profile", icon: "person" },
];

/** The clip changes every one or two beats; this is the doomscroll. */
function current({ seed, elapsed }: Pick<ScreenProps, "seed" | "elapsed">) {
  const step = timeConfig.beatMinutes * (1 + (seed % 2));
  const slot = Math.floor(elapsed / step);
  const clip = clips[(seed + slot * 3) % clips.length];
  const rng = createRng(hash(seed, slot));
  return {
    clip,
    slot,
    progress: ((elapsed % step) + 0.5) / step,
    likes: Math.round(10 ** rng.range(3.4, 6.5)),
    comments: Math.round(10 ** rng.range(2.2, 4.6)),
    shares: Math.round(10 ** rng.range(2, 4.4)),
    rng,
  };
}

function Feed(props: ScreenProps) {
  const { clip, slot, progress, likes, comments: commentCount, shares } = current(props);
  return (
    <div className={`${styles.screen} ${ios.dark}`}>
      {/* Each new clip swipes up over the last: the doomscroll gesture. */}
      <Swap id={slot} kind="up">
      <img className={styles.clip} src={clipSrc(clip.img)} alt={clip.alt} decoding="async" />
      <div className={styles.scrim} />
      <div className={styles.rail}>
        <div className={styles.avatar} style={{ background: avatarGradient(slot + props.seed) }}>
          {clip.handle[0].toUpperCase()}
          <span className={styles.follow}><Icon name="plus" size={13} stroke={3.2} /></span>
        </div>
        <div className={styles.railItem}><Icon name="heart" size={34} filled stroke={0} />{compact(likes)}</div>
        <div className={styles.railItem}><Icon name="bubble" size={32} filled stroke={0} />{compact(commentCount)}</div>
        <div className={styles.railItem}><Icon name="send" size={32} filled stroke={0} />{compact(shares)}</div>
        <div className={styles.disc} />
      </div>
      <div className={styles.caption}>
        <div className={styles.handle}>@{clip.handle}</div>
        <div className={styles.text}>{clip.caption} <b>{clip.tags}</b></div>
        <div className={styles.sound}><Icon name="note" size={15} stroke={2} />{clip.sound}</div>
      </div>
      <div className={styles.progress}><i style={{ width: `${progress * 100}%` }} /></div>
      </Swap>
      <div className={styles.top}><span>Following</span><span className={styles.on}>For You</span></div>
      <Icon name="search" size={24} stroke={2.1} className={styles.search} />
      <TabBar items={tabs} active="home" tone="light" tint="#fff" />
    </div>
  );
}

function Comments(props: ScreenProps) {
  const { clip, comments: total, rng, slot } = current(props);
  const offset = rng.int(0, comments.length - 1);
  const shown = Array.from({ length: 9 }, (_, i) => {
    const c = comments[(offset + i) % comments.length];
    const r = createRng(hash(props.seed, slot, i));
    return { ...c, likes: Math.round(10 ** r.range(0.5, 3.8)), age: r.pick(["2m", "8m", "23m", "1h", "3h", "5h", "1d"]), id: `${c.name}-${i}` };
  });
  const shift = Math.min(props.elapsed * 12, 150);
  return (
    <div className={`${styles.screen} ${ios.dark}`}>
      <img className={styles.clip} src={clipSrc(clip.img)} alt={clip.alt} decoding="async" />
      <div className={styles.dim} />
      <div className={styles.sheet}>
        <span className={styles.grab} />
        <div className={styles.sheetHead}>{total.toLocaleString("en-US")} comments</div>
        <Icon name="close" size={18} stroke={2.2} className={styles.sheetClose} />
        <div className={styles.list}>
          <div className={ios.flow} style={{ transform: `translateY(${-shift}px)` }}>
            {shown.map((c, i) => (
              <div key={c.id} className={styles.comment}>
                <span className={styles.cAvatar} style={{ background: avatarGradient(i * 3 + props.seed) }}>{c.name[0].toUpperCase()}</span>
                <div>
                  <div className={styles.cName}>{c.name}</div>
                  <div className={styles.cText}>{c.text}</div>
                  <div className={styles.cMeta}><span>{c.age}</span><span>Reply</span></div>
                </div>
                <div className={styles.cLike}><Icon name="heart" size={18} stroke={1.8} />{compact(c.likes)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.composer}>
          <span className={styles.cAvatar} style={{ background: avatarGradient(props.owner.seed) }}>{props.owner.firstName[0]}</span>
          <span className={styles.field}>Add comment…</span>
          <Icon name="send" size={24} stroke={2} />
        </div>
      </div>
    </div>
  );
}

export function ShortVideoScreen(props: ScreenProps) {
  return props.view === "comments" ? <Comments {...props} /> : <Feed {...props} />;
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
