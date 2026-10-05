"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  youtubeTwoChips,
  youtubeTwoCreator,
  youtubeTwoCreators,
  youtubeTwoVideos,
} from "../2/model/data";
import type { YoutubeTwoVideo } from "../2/model/types";
import {
  YoutubeTwoIcon,
  type YoutubeTwoIcon as YoutubeTwoIconName,
} from "../2/screen/icons";
import styles from "./screen.module.css";

const primaryNavigation: { icon: YoutubeTwoIconName; view: string }[] = [
  { view: "Home", icon: "home" },
  { view: "Shorts", icon: "shorts" },
  { view: "Subscriptions", icon: "subscriptions" },
  { view: "You", icon: "user" },
];

const libraryNavigation: { icon: YoutubeTwoIconName; label: string }[] = [
  { label: "History", icon: "user" },
  { label: "Playlists", icon: "save" },
  { label: "Your videos", icon: "subscriptions" },
  { label: "Watch later", icon: "save" },
  { label: "Liked videos", icon: "like" },
];

type DenseGridParameters = {
  columns: number;
  referenceColumns: number;
  sourceColumnGap: number;
  sourceRowGap: number;
  sourceTitleSize: number;
};

type DenseGridStyle = CSSProperties & Record<`--${string}`, string>;

const denseGridParameters = {
  desktop: {
    columns: 8,
    referenceColumns: 4,
    sourceColumnGap: 16,
    sourceRowGap: 40,
    sourceTitleSize: 15,
  },
  mobile: {
    columns: 2,
    referenceColumns: 1,
    sourceColumnGap: 8,
    sourceRowGap: 28,
    sourceTitleSize: 16,
  },
} as const satisfies Record<"desktop" | "mobile", DenseGridParameters>;

function gridParametersForViewport(width: number) {
  return width < 768 ? denseGridParameters.mobile : denseGridParameters.desktop;
}

function denseGridStyle(parameters: DenseGridParameters): DenseGridStyle {
  const scale = parameters.referenceColumns / parameters.columns;
  const px = (value: number) => `${value * scale}px`;

  return {
    "--dense-avatar-size": px(38),
    "--dense-column-gap": px(parameters.sourceColumnGap),
    "--dense-columns": String(parameters.columns),
    "--dense-duration-font-size": px(12),
    "--dense-duration-inset": px(6),
    "--dense-duration-padding-x": px(6),
    "--dense-duration-padding-y": px(2),
    "--dense-meta-gap": px(12),
    "--dense-meta-padding-top": px(12),
    "--dense-more-size": px(32),
    "--dense-more-svg-size": px(20),
    "--dense-progress-height": px(3),
    "--dense-row-gap": px(parameters.sourceRowGap),
    "--dense-thumbnail-radius": px(12),
    "--dense-title-font-size": px(parameters.sourceTitleSize),
    "--dense-title-line-height": px(parameters.sourceTitleSize * 1.3),
    "--dense-text-font-size": px(13),
    "--dense-text-line-height": px(16),
  };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-label="YouTube" className={styles.logo}>
      <span className={styles.logoMark}><YoutubeTwoIcon className={styles.logoPlay} name="play" /></span>
      {!compact ? <span className={styles.logoWord}>YouTube</span> : null}
    </span>
  );
}

function RoundIconButton({ icon, label }: { icon: YoutubeTwoIconName; label: string }) {
  return <button aria-label={label} className={styles.roundIcon} type="button"><YoutubeTwoIcon name={icon} /></button>;
}

function DenseVideoCard({ video }: { video: YoutubeTwoVideo }) {
  const creator = youtubeTwoCreator(video.creatorId);

  return (
    <article className={styles.videoCard}>
      <button aria-label={`${video.alt} ${video.duration}`} className={styles.thumbnailButton} type="button">
        <Image alt={video.alt} className={styles.thumbnail} fill sizes="(min-width: 768px) 8vw, 32vw" src={video.thumbnail} />
        {video.progress ? <span className={styles.progress} style={{ width: `${video.progress}%` }} /> : null}
        <span className={`${styles.duration} ${video.live ? styles.live : ""}`}>{video.live ? "LIVE" : video.duration}</span>
      </button>
      <div className={styles.videoMeta}>
        <Image alt="" className={styles.avatar} height={36} src={creator.avatar} width={36} />
        <div className={styles.videoText}>
          <button className={styles.videoTitle} type="button">{video.title}</button>
          <p className={styles.creator}>{creator.name}</p>
          <p className={styles.stats}>{video.views} <span aria-hidden="true">•</span> {video.published}</p>
        </div>
        <button aria-label={`More options for ${video.title}`} className={styles.more} type="button"><YoutubeTwoIcon name="more" /></button>
      </div>
    </article>
  );
}

function DesktopHeader({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <header className={styles.desktopHeader}>
      <div className={styles.headerBrand}><RoundIconButton icon="menu" label="Open guide" /><button className={styles.homeButton} type="button"><Logo /></button></div>
      <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.searchField}><input aria-label="Search" onChange={(event) => setQuery(event.target.value)} placeholder="Search" value={query} /><button aria-label="Search" type="submit"><YoutubeTwoIcon name="search" /></button></div>
        <RoundIconButton icon="search" label="Search with your voice" />
      </form>
      <div className={styles.headerActions}><button className={styles.createButton} type="button"><YoutubeTwoIcon name="add" />Create</button><RoundIconButton icon="bell" label="Notifications" /><Image alt="Your account" className={styles.account} height={64} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={64} /></div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className={styles.mobileHeader}>
      <button aria-label="Open guide" className={styles.mobileMenu} type="button"><YoutubeTwoIcon name="menu" /></button>
      <button className={styles.mobileHome} type="button"><Logo compact /></button>
      <div className={styles.mobileActions}><RoundIconButton icon="cast" label="Cast" /><RoundIconButton icon="bell" label="Notifications" /><RoundIconButton icon="search" label="Search" /></div>
    </header>
  );
}

function DesktopGuide({ activeView, setActiveView }: { activeView: string; setActiveView: (value: string) => void }) {
  return (
    <aside className={styles.desktopGuide}>
      <nav aria-label="Primary navigation" className={styles.primaryNavigation}>{primaryNavigation.map((item) => <button aria-current={activeView === item.view ? "page" : undefined} className={activeView === item.view ? styles.activeNav : styles.navButton} key={item.view} onClick={() => setActiveView(item.view)} type="button"><YoutubeTwoIcon name={item.icon} /><span>{item.view}</span></button>)}</nav>
      <section className={styles.guideSection}><h2>You</h2>{libraryNavigation.map((item) => <button className={styles.libraryButton} key={item.label} type="button"><YoutubeTwoIcon name={item.icon} /><span>{item.label}</span></button>)}</section>
      <section className={styles.guideSection}><h2>Subscriptions</h2>{youtubeTwoCreators.slice(0, 6).map((creator) => <button className={styles.subscription} key={creator.id} type="button"><Image alt="" height={48} src={creator.avatar} width={48} /><span>{creator.name}</span></button>)}</section>
    </aside>
  );
}

function MobileNavigation({ activeView, setActiveView }: { activeView: string; setActiveView: (value: string) => void }) {
  return (
    <nav aria-label="Mobile navigation" className={styles.mobileNavigation}>
      {primaryNavigation.slice(0, 2).map((item) => <button aria-current={activeView === item.view ? "page" : undefined} key={item.view} onClick={() => setActiveView(item.view)} type="button"><YoutubeTwoIcon name={item.icon} /><span>{item.view}</span></button>)}
      <button aria-label="Create" className={styles.createMobile} type="button"><span><YoutubeTwoIcon name="add" /></span></button>
      {primaryNavigation.slice(2).map((item) => <button aria-current={activeView === item.view ? "page" : undefined} key={item.view} onClick={() => setActiveView(item.view)} type="button"><YoutubeTwoIcon name={item.icon} /><span>{item.view}</span></button>)}
    </nav>
  );
}

export function YoutubeSixScreen() {
  const [activeChip, setActiveChip] = useState("All");
  const [activeView, setActiveView] = useState("Home");
  const [gridParameters, setGridParameters] = useState<DenseGridParameters>(denseGridParameters.desktop);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const resize = () => setGridParameters(gridParametersForViewport(window.innerWidth));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const cards = useMemo(() => {
    const topicVideos = activeChip === "All" ? youtubeTwoVideos : youtubeTwoVideos.filter((video) => video.topic === activeChip);
    const matchingVideos = query.trim() ? topicVideos.filter((video) => `${video.title} ${video.topic} ${youtubeTwoCreator(video.creatorId).name}`.toLowerCase().includes(query.toLowerCase())) : topicVideos;
    const source = matchingVideos.length ? matchingVideos : topicVideos.length ? topicVideos : youtubeTwoVideos;
    return Array.from({ length: 72 }, (_, index) => ({ id: `${source[index % source.length].id}-dense-${index}`, video: source[index % source.length] }));
  }, [activeChip, query]);
  const gridStyle = denseGridStyle(gridParameters);

  return (
    <main className={styles.screen}>
      <MobileHeader />
      <DesktopHeader query={query} setQuery={setQuery} />
      <div className={styles.layout}>
        <DesktopGuide activeView={activeView} setActiveView={setActiveView} />
        <section className={styles.content}>
          <div className={styles.topicRail}>{youtubeTwoChips.map((chip) => <button className={activeChip === chip ? styles.activeChip : styles.chip} key={chip} onClick={() => setActiveChip(chip)} type="button">{chip}</button>)}</div>
          <div className={styles.denseGrid} style={gridStyle}>{cards.map((entry) => <DenseVideoCard key={entry.id} video={entry.video} />)}</div>
        </section>
      </div>
      <MobileNavigation activeView={activeView} setActiveView={setActiveView} />
    </main>
  );
}
