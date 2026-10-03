/* eslint-disable @next/next/no-img-element -- Headline photos are local, pre-sized sample photographs. */
import { Icon, TabBar, ios, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatAge, formatDate } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { bylineAt, newsSrc, paragraphs, stories } from "./data";
import styles from "./news.module.css";

const tabs: readonly TabItem[] = [
  { id: "today", label: "Today", icon: "paper" },
  { id: "sections", label: "Sections", icon: "grid" },
  { id: "saved", label: "Saved", icon: "tag" },
  { id: "account", label: "Account", icon: "person" },
];

const sectionTabs = ["Top Stories", "New York", "U.S.", "World", "Politics", "Business"];

/** Seeded order so each phone leads with a different story. */
function order(seed: number) {
  const rng = createRng(hash(seed, "news"));
  const list = [...stories];
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function Front({ seed, elapsed, clock, day }: ScreenProps) {
  const list = order(seed);
  const [lead, ...rest] = list;
  const rng = createRng(hash(seed, "front"));
  const ages = rest.map(() => rng.int(8, 300));
  const scroll = Math.min(elapsed * 9, 560);
  return (
    <div className={styles.screen}>
      <header className={styles.masthead}>
        <span />
        <div><div className={styles.logo}>Daily</div><div className={styles.date}>{formatDate(day)}</div></div>
        <Icon name="search" size={22} />
      </header>
      <div className={styles.viewport}>
        <div className={ios.flow} style={{ transform: `translateY(${-scroll}px)` }}>
          <div className={styles.sections}>
            {sectionTabs.map((s, i) => <span key={s} className={i === 0 ? styles.on : undefined}>{s}</span>)}
          </div>
          <div className={styles.live}><i /> Live: {lead.section} updates · updated {formatAge(2 + (clock % 7))}</div>
          <div className={styles.hero}>
            <div className={styles.heroBody} style={{ paddingBottom: 12 }}>
              <div className={styles.kicker}>{lead.section}<span>{formatAge(rng.int(4, 40) + elapsed)}</span></div>
              <div className={styles.headline}>{lead.headline}</div>
              <div className={styles.dek}>{lead.dek}</div>
            </div>
            <img src={newsSrc(lead.img)} alt={lead.alt} width={390} height={219} decoding="async" />
          </div>
          {rest.map((story, i) => (
            <div key={story.img} className={styles.item}>
              <div>
                <div className={styles.kicker}>{story.section}<span>{formatAge(ages[i] + elapsed)}</span></div>
                <div className={styles.headline}>{story.headline}</div>
              </div>
              <img src={newsSrc(story.img)} alt={story.alt} width={104} height={104} decoding="async" loading={i < 3 ? undefined : "lazy"} />
            </div>
          ))}
        </div>
      </div>
      <TabBar items={tabs} active="today" tint="#e0002a" />
    </div>
  );
}

function Article({ seed, elapsed, day }: ScreenProps) {
  const lead = order(seed)[0];
  const start = seed % 3;
  const body = Array.from({ length: 9 }, (_, i) => paragraphs[(start + i) % paragraphs.length]);
  const minutes = 6 + (seed % 7);
  const scroll = Math.min(elapsed * 22, 1500);
  return (
    <div className={styles.screen}>
      <div className={styles.articleBar}>
        <Icon name="chevronLeft" size={26} stroke={2.2} />
        <span className={styles.logo}>Daily</span>
        <span className={styles.barIcons}><Icon name="tag" size={22} /><Icon name="share" size={22} /></span>
      </div>
      <div className={styles.articleViewport}>
        <div className={ios.flow} style={{ transform: `translateY(${-scroll}px)` }}>
          <div className={styles.articleHead}>
            <div className={styles.kicker}>{lead.section}</div>
            <div className={styles.headline}>{lead.headline}</div>
            <div className={styles.dek}>{lead.dek}</div>
          </div>
          <div className={styles.byline}>By {bylineAt(seed)}<span>{formatDate(day)} · {minutes} min read</span></div>
          <figure className={styles.figure}>
            <img src={newsSrc(lead.img)} alt={lead.alt} width={390} height={219} decoding="async" />
            <figcaption>{lead.alt}. Credit: Daily staff photographer</figcaption>
          </figure>
          <div className={styles.body}>
            {body.map((text, i) => <p key={`${start}-${i}`}>{text}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewsScreen(props: ScreenProps) {
  return props.view === "article" ? <Article {...props} /> : <Front {...props} />;
}

const news: CloneDefinition = {
  Screen: NewsScreen,
  tone: () => "dark",
  fixtures: [
    { view: "front", label: "morning front", clock: 6 * 60 + 52, duration: 8, seed: 2 },
    { view: "front", label: "late scroll", clock: 22 * 60 + 15, duration: 25, seed: 9 },
    { view: "article", label: "long read", clock: 12 * 60 + 34, duration: 14, seed: 6 },
  ],
};

export default news;
