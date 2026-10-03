/* eslint-disable @next/next/no-img-element -- Headline photos are local, pre-sized sample photographs. */
import { Icon, Storyboard, TabBar, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatAge, formatDate } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { bylineAt, liveEntries, liveTopics, newsSrc, paragraphs, storyAt, type Story } from "./data";
import styles from "./news.module.css";

const tabs: readonly TabItem[] = [
  { id: "today", label: "Today", icon: "paper" },
  { id: "sections", label: "Sections", icon: "grid" },
  { id: "saved", label: "Saved", icon: "tag" },
  { id: "account", label: "Account", icon: "person" },
];

const sectionTabs = ["Top Stories", "New York", "Politics", "Business", "Transit", "Food", "Arts"] as const;
/** Approximate centre x of each section tab in the chrome row. */
const tabX = sectionTabs.map((_, i) => 16 + sectionTabs.slice(0, i).reduce((x, s) => x + s.length * 7.8 + 20, 0) + sectionTabs[i].length * 3.9);

const LIST_TOP = 138;
const LIVE_H = 52;
const HERO_H = 400;
const ITEM_H = 132;
/** Scroll depth per list (DOM budget): the front runs deeper than a section. */
const MAX_FRONT_SCROLL = 2200;
const MAX_SECTION_SCROLL = 1200;
const MAX_SECTIONS = 2;
const MAX_ARTICLES = 4;
const ARTICLE_SCROLL = 1650;

const tap = {
  back: { x: 24, y: 76 },
  statusBar: { x: 195, y: 18 },
  live: { x: 195, y: LIST_TOP + 30 },
  related: { x: 195, y: 560 },
} as const;

type ListSpec = { kind: "list"; list: string; tab: number; live: boolean; items: number };
type ArticleSpec = { kind: "article"; story: Story; related: Story[] };
type Spec = ListSpec | ArticleSpec | { kind: "live"; topic: string };
type Plan = { duration: number; shots: Shot[]; specs: Record<string, Spec>; liveTopic: string; breaking: { at: number; story: Story } | null };

const listKey = (tab: number) => (tab === 0 ? "front" : sectionTabs[tab]);
const head = (spec: Pick<ListSpec, "live">) => (spec.live ? LIVE_H : 0) + HERO_H;

/**
 * Reading the paper in simulated time: skim the front, tap a story, flick
 * through it, follow a related link, back, back, switch section, peek at the
 * live blog. Every list position and tap target is computed, so the finger
 * lands on the story that is actually on screen.
 */
function plan({ seed, duration, view }: Pick<ScreenProps, "seed" | "duration" | "view">): Plan {
  const rng = createRng(hash(seed, "daily-session", view));
  const total = Math.max(4, duration);
  const shots: Shot[] = [];
  const specs: Record<string, Spec> = {};
  const scrolls = new Map<string, number>();
  let t = 0;
  let articles = 0;
  let current = "front";
  specs.front = { kind: "list", list: "front", tab: 0, live: true, items: 6 };
  const liveTopic = rng.pick(liveTopics);

  const read = (story: Story, enter: Shot["enter"], at: number, tapAt: Shot["tap"], long: boolean) => {
    const id = `article-${articles++}`;
    const related = Array.from({ length: 3 }, (_, i) => storyAt(seed, `related-${id}`, i + 1));
    specs[id] = { kind: "article", story, related };
    let y = 0;
    let time = at;
    const steps = long ? rng.int(3, 5) : rng.int(2, 3);
    for (let i = 0; i < steps; i++) {
      y = Math.min(ARTICLE_SCROLL, y + rng.int(320, 560));
      shots.push({ panel: id, at: time, enter: i === 0 ? enter : undefined, tap: i === 0 ? tapAt : undefined, scroll: y, flicks: rng.int(1, 3) });
      time += long ? rng.range(1.6, 2.6) : rng.range(1.3, 2);
    }
    return { id, at: time, bottom: y >= ARTICLE_SCROLL - 200 };
  };

  if (view === "article") {
    const story = storyAt(seed, "front", 0);
    const first = read(story, "cut", 0, undefined, true);
    t = first.at;
    if (first.bottom || rng.chance(0.5)) {
      const next = read((specs[first.id] as ArticleSpec).related[0], "push", t, tap.related, false);
      t = next.at;
      shots.push({ panel: first.id, at: t, enter: "pop", tap: tap.back });
      t += 1.3;
    }
    shots.push({ panel: "front", at: t, enter: "pop", tap: tap.back, scroll: 0 });
    t += 1.3;
  }

  while (t < total) {
    const spec = specs[current] as ListSpec;
    // Skim the list.
    const run = rng.range(1.2, 2.6);
    const from = scrolls.get(current) ?? 0;
    const cap = current === "front" ? MAX_FRONT_SCROLL : MAX_SECTION_SCROLL;
    const to = Math.min(cap, from + run * rng.range(260, 420));
    scrolls.set(current, to);
    // Detours below end by returning to this list, so a run only opens the scene with a cut.
    shots.push({ panel: current, at: t, enter: shots.length ? undefined : "cut", scroll: to, flicks: Math.max(1, Math.round(run / 0.8)) });
    t += run;
    if (t >= total) break;
    const action = rng.weighted([
      ["article", articles < MAX_ARTICLES ? 5 : 0],
      ["section", 1.6],
      ["live", current === "front" && !specs.live ? 1.2 : 0],
      ["top", to >= cap ? 4 : to > 1200 ? 0.6 : 0],
      ["more", 1.4],
    ] as const);
    if (action === "article") {
      const index = Math.floor((to + 420 - LIST_TOP - head(spec)) / ITEM_H);
      const story = storyAt(seed, spec.list, Math.max(0, index + 1));
      const y = index < 0 ? 300 : LIST_TOP + head(spec) + index * ITEM_H - to + ITEM_H / 2;
      const article = read(story, "push", t, { x: 150, y: Math.max(LIST_TOP + 20, Math.min(740, y)) }, rng.chance(0.3));
      t = article.at;
      if (article.bottom && rng.chance(0.65) && articles < MAX_ARTICLES) {
        const related = read((specs[article.id] as ArticleSpec).related[rng.int(0, 2)], "push", t, tap.related, false);
        t = related.at;
        shots.push({ panel: article.id, at: t, enter: "pop", tap: tap.back });
        t += 1.3;
      }
      shots.push({ panel: current, at: t, enter: "pop", tap: tap.back });
      t += 1.3;
    } else if (action === "section") {
      const visited = Object.values(specs).flatMap((s) => (s.kind === "list" && s.tab ? [s.tab] : []));
      const options = (visited.length >= MAX_SECTIONS ? [0, ...visited] : sectionTabs.map((_, i) => i)).filter((i) => i !== spec.tab);
      const tab = rng.pick(options);
      const id = listKey(tab);
      if (!specs[id]) specs[id] = { kind: "list", list: id, tab, live: false, items: 6 };
      shots.push({ panel: id, at: t, enter: "tab", tap: { x: Math.min(370, tabX[tab]), y: 119 } });
      current = id;
      t += 1.2;
    } else if (action === "live") {
      shots.push({ panel: current, at: t, tap: tap.statusBar, scroll: 0 });
      scrolls.set(current, 0);
      t += 1.4;
      specs.live = { kind: "live", topic: liveTopic };
      shots.push({ panel: "live", at: t, enter: "push", tap: tap.live, scroll: rng.int(500, 900), flicks: rng.int(2, 3) });
      t += rng.range(2, 3.2);
      shots.push({ panel: current, at: t, enter: "pop", tap: tap.back });
      t += 1.2;
    } else if (action === "top") {
      shots.push({ panel: current, at: t, tap: tap.statusBar, scroll: 0 });
      scrolls.set(current, 0);
      t += 1.4;
    }
  }
  // Size each list to what is scrolled.
  for (const [id, spec] of Object.entries(specs)) {
    if (spec.kind === "list") spec.items = Math.ceil(((scrolls.get(id) ?? 0) + 900) / ITEM_H) + 1;
  }
  const breakingRng = createRng(hash(seed, "breaking"));
  const breaking = total > 8 && breakingRng.chance(0.6) ? { at: breakingRng.int(2, Math.floor(total - 4)), story: storyAt(seed, "breaking", 0) } : null;
  return { duration: total, shots, specs, liveTopic, breaking };
}

function Masthead({ day, tab }: { day: number; tab: number }) {
  return (
    <>
      <header className={styles.masthead}>
        <span />
        <div><div className={styles.logo}>Daily</div><div className={styles.date}>{formatDate(day)}</div></div>
        <Icon name="search" size={22} />
      </header>
      <div className={styles.sections}>
        {sectionTabs.map((s, i) => <span key={`tab-${i}`} className={i === tab ? styles.on : undefined}>{s}</span>)}
      </div>
      <TabBar items={tabs} active={tab === 0 ? "today" : "sections"} tint="#e0002a" />
    </>
  );
}

function ListBody({ seed, spec, liveTopic, clock }: { seed: number; spec: ListSpec; liveTopic: string; clock: number }) {
  const lead = storyAt(seed, spec.list, 0);
  return (
    <>
      {spec.live ? <div className={styles.live}>Live · {liveTopic} · updated {formatAge(2 + (clock % 7))}</div> : null}
      <div className={styles.hero}>
        <div className={styles.heroBody}>
          <div className={styles.kicker}>{lead.section}<span>{formatAge(lead.age)}</span></div>
          <div className={styles.headline}>{lead.headline}</div>
          <div className={styles.dek}>{lead.dek}</div>
        </div>
        {lead.img ? <img src={newsSrc(lead.img)} alt={lead.alt} width={390} height={219} decoding="async" /> : <div className={styles.heroBlank}>{lead.section}</div>}
      </div>
      {Array.from({ length: spec.items }, (_, i) => {
        const story = storyAt(seed, spec.list, i + 1);
        return (
          <div key={story.id} className={styles.item}>
            <div>
              <div className={styles.kicker}>{story.section}<span>{story.kind === "opinion" ? story.byline : formatAge(story.age)}</span></div>
              <div className={styles.headline}>{story.headline}</div>
            </div>
            {story.img ? <img src={newsSrc(story.img)} alt={story.alt} width={104} height={104} decoding="async" /> : <span className={styles.initials}>{story.byline.split(" ").map((w) => w[0]).join("")}</span>}
          </div>
        );
      })}
    </>
  );
}

const articleChrome = (
  <div className={styles.articleBar}>
    <Icon name="chevronLeft" size={26} stroke={2.2} />
    <span className={styles.logo}>Daily</span>
    <span className={styles.barIcons}><Icon name="tag" size={22} /><Icon name="share" size={22} /></span>
  </div>
);

function ArticleBody({ seed, spec, day, index }: { seed: number; spec: ArticleSpec; day: number; index: number }) {
  const { story } = spec;
  const start = hash(seed, story.id) % paragraphs.length;
  return (
    <>
      <div className={styles.articleHead}>
        <div className={styles.kicker}>{story.section}</div>
        <div className={styles.headline}>{story.headline}</div>
        {story.dek ? <div className={styles.dek}>{story.dek}</div> : null}
      </div>
      <div className={styles.byline}>By {story.byline || bylineAt(seed + index)}<span>{formatDate(day)} · {story.minutes} min read</span></div>
      {story.img ? (
        <figure className={styles.figure}>
          <img src={newsSrc(story.img)} alt={story.alt} width={390} height={219} decoding="async" />
          <figcaption>{story.alt}. Credit: Daily staff photographer</figcaption>
        </figure>
      ) : null}
      <div className={styles.body}>
        {Array.from({ length: 6 }, (_, i) => <p key={`p-${i}`}>{paragraphs[(start + i) % paragraphs.length]}</p>)}
      </div>
      <div className={styles.related}>
        <div className={styles.relatedHead}>More in {story.section}</div>
        {spec.related.map((r) => (
          <div key={r.id} className={styles.relatedItem}>{r.headline}<span>{formatAge(r.age)}</span></div>
        ))}
      </div>
    </>
  );
}

function LiveBody({ seed, topic, clock }: { seed: number; topic: string; clock: number }) {
  return (
    <>
      <div className={styles.liveHead}><span className={styles.liveTag}>Live</span>{topic}</div>
      {liveEntries(seed, 9).map((entry) => (
        <div key={entry.id} className={styles.entry}>
          <span>{formatAge(entry.ago)} · {formatTime12(clock - entry.ago)}</span>
          <b>{entry.title}</b>
          {entry.body}
        </div>
      ))}
    </>
  );
}

function formatTime12(minute: number) {
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

function session(props: ScreenProps): Session {
  const { seed, day, clock } = props;
  const script = plan(props);
  const panels: Record<string, Panel> = {};
  let articleIndex = 0;
  for (const [id, spec] of Object.entries(script.specs)) {
    if (spec.kind === "list") {
      panels[id] = { top: LIST_TOP, bottom: 83, chrome: <Masthead day={day} tab={spec.tab} />, body: <ListBody seed={seed} spec={spec} liveTopic={script.liveTopic} clock={clock} /> };
    } else if (spec.kind === "article") {
      panels[id] = { top: 98, chrome: articleChrome, body: <ArticleBody seed={seed} spec={spec} day={day} index={articleIndex++} /> };
    } else {
      panels[id] = { top: 98, chrome: articleChrome, body: <LiveBody seed={seed} topic={spec.topic} clock={clock} /> };
    }
  }
  return { duration: script.duration, shots: script.shots, panels };
}

/** A breaking-news banner drops in over whatever page is open, for a few simulated minutes. */
function breakingAt({ seed, duration, view }: Pick<ScreenProps, "seed" | "duration" | "view">, elapsed: number) {
  const breaking = plan({ seed, duration, view }).breaking;
  return breaking && elapsed >= breaking.at && elapsed < breaking.at + 4 ? breaking.story : null;
}

export function NewsScreen(props: ScreenProps) {
  const breaking = breakingAt(props, props.elapsed);
  // Drawn inside every panel, so it rides along with page transitions.
  const banner = breaking ? <div className={styles.breaking}>{breaking.headline}</div> : null;
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => session(props)} live={() => banner} />
    </div>
  );
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
