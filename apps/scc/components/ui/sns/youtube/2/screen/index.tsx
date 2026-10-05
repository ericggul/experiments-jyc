"use client";

import Image from "next/image";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  youtubeTwoChips,
  youtubeTwoComments,
  youtubeTwoCreator,
  youtubeTwoCreators,
  repeatYoutubeTwoVideos,
  youtubeTwoVideo,
  youtubeTwoVideos,
} from "../model/data";
import type { YoutubeTwoVideo } from "../model/types";
import { YoutubeTwoIcon, type YoutubeTwoIcon as YoutubeTwoIconName } from "./icons";

type View = "home" | "shorts" | "subscriptions" | "you" | "search" | "watch";

function secondsFromDuration(duration: string) {
  if (duration === "LIVE") return 60 * 60;
  return duration.split(":").map(Number).reduce((total, part) => total * 60 + part, 0);
}

function timestamp(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remaining = value % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function IconButton({
  label,
  icon,
  onClick,
  className = "",
  pressed,
}: {
  label: string;
  icon: YoutubeTwoIconName;
  onClick?: () => void;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full outline-none transition hover:bg-white/[.14] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${className}`}
      onClick={onClick}
      type="button"
    >
      <YoutubeTwoIcon className="h-[22px] w-[22px]" name={icon} />
    </button>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-label="YouTube" className="inline-flex items-center gap-1.5 text-[#f1f1f1]">
      <span className="relative grid h-[19px] w-[28px] place-items-center rounded-[5px] bg-[#ff0033] text-white">
        <YoutubeTwoIcon className="ml-px h-3.5 w-3.5" name="play" />
      </span>
      {!compact ? <span className="text-[18px] font-bold tracking-[-1.25px]">YouTube</span> : null}
    </span>
  );
}

function Avatar({ creatorId, size = 38 }: { creatorId: string; size?: number }) {
  const creator = youtubeTwoCreator(creatorId);
  return (
    <Image
      alt=""
      className="shrink-0 rounded-full object-cover"
      height={size}
      src={creator.avatar}
      style={{ width: size, height: size }}
      width={size}
    />
  );
}

function DurationBadge({ video }: { video: YoutubeTwoVideo }) {
  return (
    <span className={`absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[12px] font-semibold leading-none text-white ${video.live ? "bg-[#cc0000]" : "bg-black/80"}`}>
      {video.live ? "LIVE" : <><YoutubeTwoIcon className="h-3.5 w-3.5" name="music" />{video.duration}</>}
    </span>
  );
}

function VideoCard({
  video,
  onOpen,
  onMore,
  compact = false,
}: {
  video: YoutubeTwoVideo;
  onOpen: (video: YoutubeTwoVideo) => void;
  onMore: (video: YoutubeTwoVideo) => void;
  compact?: boolean;
}) {
  const creator = youtubeTwoCreator(video.creatorId);

  if (compact) {
    return (
      <article className="grid grid-cols-[minmax(146px,44%)_1fr] gap-3 text-[#f1f1f1] md:grid-cols-[168px_minmax(0,1fr)] md:gap-2.5">
        <button className="relative aspect-video overflow-hidden rounded-xl bg-[#272727] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => onOpen(video)} type="button">
          <Image alt={video.alt} className="object-cover" fill sizes="(max-width: 767px) 44vw, 168px" src={video.thumbnail} />
          {video.progress ? <span className="absolute bottom-0 left-0 h-[3px] bg-[#ff0033]" style={{ width: `${video.progress}%` }} /> : null}
          <DurationBadge video={video} />
        </button>
        <div className="relative min-w-0 pr-5">
          <button className="line-clamp-2 text-left text-[14px] font-semibold leading-[1.32] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => onOpen(video)} type="button">{video.title}</button>
          <p className="mt-1 truncate text-[12px] text-[#aaa]">{creator.name}</p>
          <p className="text-[12px] text-[#aaa]">{video.views} <span aria-hidden="true">•</span> {video.published}</p>
          <IconButton className="absolute -right-2 -top-2" icon="more" label={`More options for ${video.title}`} onClick={() => onMore(video)} />
        </div>
      </article>
    );
  }

  return (
    <article className="group min-w-0 text-[#f1f1f1]">
      <button className="relative block aspect-video w-full overflow-hidden bg-[#272727] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] md:rounded-xl" onClick={() => onOpen(video)} type="button">
        <Image alt={video.alt} className="object-cover transition duration-300 md:group-hover:scale-[1.018]" fill loading="lazy" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 31vw, (max-width: 1535px) 24vw, 18vw" src={video.thumbnail} />
        {video.progress ? <span className="absolute bottom-0 left-0 h-[3px] bg-[#ff0033]" style={{ width: `${video.progress}%` }} /> : null}
        <DurationBadge video={video} />
      </button>
      <div className="flex gap-3 px-3 pt-3 md:px-0">
        <Avatar creatorId={video.creatorId} />
        <div className="min-w-0 flex-1">
          <button className="block w-full text-left text-[16px] font-semibold leading-[1.3] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] md:text-[15px]" onClick={() => onOpen(video)} type="button">{video.title}</button>
          <p className="mt-1 truncate text-[14px] text-[#aaa] md:text-[13px]">{creator.name}</p>
          <p className="text-[14px] text-[#aaa] md:text-[13px]">{video.views} <span aria-hidden="true">•</span> {video.published}</p>
        </div>
        <IconButton className="-mr-2 -mt-1" icon="more" label={`More options for ${video.title}`} onClick={() => onMore(video)} />
      </div>
    </article>
  );
}

function TopicRail({ active, onChoose }: { active: string; onChoose: (chip: string) => void }) {
  return (
    <div className="sticky top-14 z-20 overflow-hidden bg-[#0f0f0f] px-3 py-2.5 md:top-14 md:px-6 md:py-3 lg:px-8">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {youtubeTwoChips.map((chip) => (
          <button
            className={`h-8 shrink-0 rounded-lg px-3 text-[14px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${active === chip ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f]"}`}
            key={chip}
            onClick={() => onChoose(chip)}
            type="button"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileHeader({
  view,
  query,
  setQuery,
  onSearch,
  onBack,
  onHome,
  onOpenSearch,
  onMenu,
  onToast,
}: {
  view: View;
  query: string;
  setQuery: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onHome: () => void;
  onOpenSearch: () => void;
  onMenu: () => void;
  onToast: (message: string) => void;
}) {
  const searchOpen = view === "search";
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-[#0f0f0f] px-2 text-[#f1f1f1] md:hidden">
      {searchOpen ? (
        <form className="flex w-full min-w-0 items-center gap-1" onSubmit={onSearch}>
          <IconButton className="hover:bg-white/[.14]" icon="arrow-left" label="Back" onClick={onBack} />
          <input autoFocus aria-label="Search YouTube" className="h-10 min-w-0 flex-1 border-b border-[#717171] bg-transparent px-2 text-[16px] outline-none focus:border-white" onChange={(event) => setQuery(event.target.value)} placeholder="Search YouTube" value={query} />
          <IconButton className="hover:bg-white/[.14]" icon="search" label="Search" />
        </form>
      ) : (
        <>
          <button aria-label="Open guide" className="grid h-10 w-10 place-items-center rounded-full outline-none hover:bg-white/[.14] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onMenu} type="button"><YoutubeTwoIcon className="h-6 w-6" name="menu" /></button>
          <button aria-label="Go home" className="px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onHome} type="button"><Logo compact /></button>
          <div className="ml-auto flex items-center">
            <IconButton className="hover:bg-white/[.14]" icon="cast" label="Cast" onClick={() => onToast("Ready to cast to a device")} />
            <IconButton className="hover:bg-white/[.14]" icon="bell" label="Notifications" onClick={() => onToast("No new notifications")} />
            <IconButton className="hover:bg-white/[.14]" icon="search" label="Search" onClick={onOpenSearch} />
          </div>
        </>
      )}
    </header>
  );
}

function DesktopHeader({
  view,
  query,
  setQuery,
  onSearch,
  onHome,
  onMenu,
  onToast,
}: {
  view: View;
  query: string;
  setQuery: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onHome: () => void;
  onMenu: () => void;
  onToast: (message: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 hidden h-14 items-center gap-3 bg-[#0f0f0f] px-4 text-[#f1f1f1] md:flex lg:px-5">
      <div className="flex shrink-0 items-center gap-2">
        <IconButton icon="menu" label="Open guide" onClick={onMenu} />
        <button aria-label="Go to Home" className="px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#065fd4]" onClick={onHome} type="button"><Logo /></button>
      </div>
      <form className="mx-auto flex w-full max-w-[690px] min-w-[220px] items-center gap-3 xl:max-w-[732px]" onSubmit={onSearch}>
        <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-full border border-[#303030] bg-[#121212] focus-within:border-[#3ea6ff] focus-within:shadow-[0_0_0_1px_#3ea6ff]">
          <input aria-label="Search" className="min-w-0 flex-1 px-4 text-[16px] outline-none placeholder:text-[#aaa]" onChange={(event) => setQuery(event.target.value)} placeholder="Search" value={query} />
          <button aria-label="Search" className="grid w-16 place-items-center border-l border-[#303030] bg-[#222] transition hover:bg-[#303030]" type="submit"><YoutubeTwoIcon className="h-5 w-5" name="search" /></button>
        </div>
        <IconButton icon="search" label="Search with your voice" onClick={() => onToast("Voice search is ready")} />
      </form>
      <div className="flex shrink-0 items-center gap-1">
        <button className="hidden h-9 items-center gap-1.5 rounded-full bg-[#272727] px-3 text-[14px] font-medium outline-none transition hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] lg:inline-flex" onClick={() => onToast("Choose a file to upload")} type="button"><YoutubeTwoIcon className="h-5 w-5" name="add" />Create</button>
        <IconButton className="lg:hidden" icon="add" label="Create" onClick={() => onToast("Choose a file to upload")} />
        <IconButton icon="bell" label="Notifications" onClick={() => onToast("No new notifications")} />
        <Image alt="Your account" className="ml-1 h-8 w-8 rounded-full object-cover" height={64} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={64} />
      </div>
      <span className="sr-only">Current view: {view}</span>
    </header>
  );
}

const desktopNav: { view: View; label: string; icon: YoutubeTwoIconName }[] = [
  { view: "home", label: "Home", icon: "home" },
  { view: "shorts", label: "Shorts", icon: "shorts" },
  { view: "subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { view: "you", label: "You", icon: "user" },
];

const desktopLibrary: { label: string; icon: YoutubeTwoIconName }[] = [
  { label: "History", icon: "user" },
  { label: "Playlists", icon: "save" },
  { label: "Your videos", icon: "subscriptions" },
  { label: "Watch later", icon: "save" },
  { label: "Liked videos", icon: "like" },
];

function DesktopGuide({ active, expanded, onNavigate }: { active: View; expanded: boolean; onNavigate: (view: View) => void }) {
  return (
    <aside className={`sticky top-14 hidden h-[calc(100dvh-56px)] shrink-0 overflow-y-auto bg-[#0f0f0f] px-3 py-3 text-[#f1f1f1] transition-[width] duration-200 md:block ${expanded ? "w-[80px] xl:w-[240px]" : "w-[80px]"}`}>
      <nav className="grid gap-1" aria-label="Primary navigation">
        {desktopNav.map((item) => (
          <button
            aria-current={active === item.view ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-[10px] outline-none transition hover:bg-[#272727] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${active === item.view ? "bg-[#272727] font-semibold" : "font-medium"} ${expanded ? "mx-auto w-full flex-col justify-center gap-0.5 text-[10px] xl:mx-0 xl:w-auto xl:flex-row xl:justify-start xl:gap-6 xl:px-3 xl:text-[14px]" : "mx-auto w-full flex-col justify-center gap-0.5 text-[10px]"}`}
            key={item.view}
            onClick={() => onNavigate(item.view)}
            type="button"
          >
            <YoutubeTwoIcon className="h-5 w-5 shrink-0" name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {expanded ? <div className="hidden xl:block">
        <section className="mt-6 px-3">
          <h2 className="mb-2 text-[16px] font-semibold">You</h2>
          <div className="grid gap-1">
            {desktopLibrary.map((item) => <button className="flex h-10 items-center gap-5 rounded-lg px-1 text-left text-[14px] hover:bg-[#272727]" key={item.label} onClick={() => onNavigate("you")} type="button"><YoutubeTwoIcon className="h-5 w-5" name={item.icon} /><span className="min-w-0 flex-1 truncate">{item.label}</span></button>)}
          </div>
        </section>
        <section className="mt-6 px-3">
          <h2 className="mb-2 text-[16px] font-semibold">Subscriptions</h2>
          <div className="grid gap-1">
            {youtubeTwoCreators.slice(0, 6).map((creator) => (
              <button className="flex h-10 items-center gap-3 rounded-lg px-1 text-left text-[14px] hover:bg-[#272727]" key={creator.id} onClick={() => onNavigate("subscriptions")} type="button">
                <Image alt="" className="h-6 w-6 rounded-full object-cover" height={48} src={creator.avatar} width={48} />
                <span className="min-w-0 flex-1 truncate">{creator.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div> : null}
    </aside>
  );
}

function MobileNav({ active, onNavigate, onCreate }: { active: View; onNavigate: (view: View) => void; onCreate: () => void }) {
  const nav = desktopNav;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-white/[.12] bg-[#0f0f0f] pb-[env(safe-area-inset-bottom)] text-[#f1f1f1] md:hidden" aria-label="Mobile navigation">
      {nav.slice(0, 2).map((item) => (
        <button aria-current={active === item.view ? "page" : undefined} className={`grid place-items-center gap-1 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${active === item.view ? "font-semibold" : "text-[#aaa]"}`} key={item.view} onClick={() => onNavigate(item.view)} type="button"><YoutubeTwoIcon className="h-6 w-6" name={item.icon} /><span>{item.label}</span></button>
      ))}
      <button aria-label="Create" className="grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onCreate} type="button"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#272727]"><YoutubeTwoIcon className="h-6 w-6" name="add" /></span></button>
      {nav.slice(2).map((item) => (
        <button aria-current={active === item.view ? "page" : undefined} className={`grid place-items-center gap-1 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${active === item.view ? "font-semibold" : "text-[#aaa]"}`} key={item.view} onClick={() => onNavigate(item.view)} type="button"><YoutubeTwoIcon className="h-6 w-6" name={item.icon} /><span>{item.label}</span></button>
      ))}
    </nav>
  );
}

function WatchActions({
  liked,
  disliked,
  saved,
  onLike,
  onDislike,
  onShare,
  onSave,
  onMore,
}: {
  liked: boolean;
  disliked: boolean;
  saved: boolean;
  onLike: () => void;
  onDislike: () => void;
  onShare: () => void;
  onSave: () => void;
  onMore: () => void;
}) {
  const mobileAction = (icon: YoutubeTwoIconName, label: string, onClick: () => void, pressed?: boolean) => <button aria-label={label} aria-pressed={pressed} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#272727] text-[#f1f1f1] outline-none hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={label} onClick={onClick} type="button"><YoutubeTwoIcon className="h-[22px] w-[22px]" name={icon} /></button>;
  const desktopAction = (icon: YoutubeTwoIconName, label: string, onClick: () => void, pressed?: boolean) => <button aria-label={label} aria-pressed={pressed} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#272727] px-3 text-[14px] font-medium text-[#f1f1f1] outline-none transition hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onClick} type="button"><YoutubeTwoIcon className="h-5 w-5" name={icon} /><span>{label}</span></button>;
  return <div className="overflow-x-auto pb-1 [scrollbar-width:none]"><div className="flex gap-1.5 md:hidden">{mobileAction(liked ? "like-filled" : "like", liked ? "1.2K" : "1.1K", onLike, liked)}{mobileAction("dislike", "Dislike", onDislike, disliked)}{mobileAction("share", "Share", onShare)}{mobileAction("save", saved ? "Saved" : "Save", onSave, saved)}{mobileAction("more", "More", onMore)}</div><div className="hidden gap-2 md:flex"><span className="inline-flex h-9 overflow-hidden rounded-full bg-[#272727]"><button aria-label={liked ? "1.2K likes" : "1.1K likes"} aria-pressed={liked} className="inline-flex items-center gap-2 px-3 text-[14px] font-medium outline-none hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onLike} type="button"><YoutubeTwoIcon className="h-5 w-5" name={liked ? "like-filled" : "like"} />{liked ? "1.2K" : "1.1K"}</button><span aria-hidden="true" className="my-2 w-px bg-[#555]" /><button aria-label="Dislike" aria-pressed={disliked} className="grid w-11 place-items-center outline-none hover:bg-[#3f3f3f] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onDislike} type="button"><YoutubeTwoIcon className="h-5 w-5" name="dislike" /></button></span>{desktopAction("share", "Share", onShare)}{desktopAction("save", saved ? "Saved" : "Save", onSave)}{desktopAction("more", "More", onMore)}</div></div>;
}

function Player({
  video,
  playing,
  position,
  muted,
  onTogglePlay,
  onPosition,
  onToggleMute,
  onMinimize,
}: {
  video: YoutubeTwoVideo;
  playing: boolean;
  position: number;
  muted: boolean;
  onTogglePlay: () => void;
  onPosition: (position: number) => void;
  onToggleMute: () => void;
  onMinimize: () => void;
}) {
  const [controls, setControls] = useState(true);
  const [captions, setCaptions] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const duration = secondsFromDuration(video.duration);
  const ratio = duration ? (position / duration) * 100 : 0;

  useEffect(() => {
    if (!controls) return;
    const timeout = window.setTimeout(() => setControls(false), 2800);
    return () => window.clearTimeout(timeout);
  }, [controls, playing]);

  const enterFullscreen = () => {
    const element = ref.current;
    if (!element) return;
    if (element.requestFullscreen) void element.requestFullscreen();
  };

  return (
    <div className="relative aspect-video overflow-hidden bg-black md:rounded-xl" onPointerMove={() => setControls(true)} ref={ref}>
      <Image alt={video.alt} className="object-cover opacity-95" fill priority sizes="(max-width: 1023px) 100vw, 72vw" src={video.thumbnail} />
      <button aria-label={playing ? "Pause video" : "Play video"} className="absolute inset-0 cursor-default" onClick={() => setControls((value) => !value)} type="button" />
      <div className={`absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75 transition-opacity ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex items-center justify-between px-3 pt-3 text-white md:hidden">
          <IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="chevron-down" label="Minimize player" onClick={onMinimize} />
          <div className="flex items-center gap-1"><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="cast" label="Cast" /><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="captions" label="Captions" /><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="settings" label="Settings" /></div>
        </div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-white md:hidden">
          <button aria-label="Rewind 10 seconds" className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#4b4b4b]/95 outline-none hover:bg-[#606060] focus-visible:ring-2 focus-visible:ring-white" onClick={() => onPosition(Math.max(0, position - 10))} type="button"><YoutubeTwoIcon className="h-8 w-8" name="rewind" /></button>
          <button aria-label={playing ? "Pause video" : "Play video"} className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#4b4b4b]/95 outline-none hover:bg-[#606060] focus-visible:ring-2 focus-visible:ring-white" onClick={onTogglePlay} type="button"><YoutubeTwoIcon className="h-10 w-10" name={playing ? "pause" : "play"} /></button>
          <button aria-label="Forward 10 seconds" className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#4b4b4b]/95 outline-none hover:bg-[#606060] focus-visible:ring-2 focus-visible:ring-white" onClick={() => onPosition(Math.min(duration, position + 10))} type="button"><YoutubeTwoIcon className="h-8 w-8" name="forward" /></button>
        </div>
        <div className="absolute inset-x-0 bottom-0 text-white md:hidden">
          <div className="flex items-center gap-2 px-3 pb-5">
            <span className="shrink-0 rounded-full bg-[#4b4b4b]/95 px-2.5 py-1.5 text-[13px] font-semibold">{timestamp(position)} / {video.duration}</span>
            <button className="min-w-0 flex-1 truncate rounded-full bg-[#4b4b4b]/95 px-3 py-1.5 text-left text-[13px] font-semibold" onClick={() => onPosition(Math.min(duration, position + 60))} type="button">Movement II · Hold to seek precisely</button>
            <button aria-label="Full screen" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4b4b4b]/95 outline-none hover:bg-[#606060]" onClick={enterFullscreen} type="button"><YoutubeTwoIcon className="h-6 w-6" name="fullscreen" /></button>
          </div>
          <input aria-label="Video progress" className="youtube-two-scrubber block w-full cursor-pointer" max={duration} min="0" onChange={(event) => onPosition(Number(event.target.value))} step="1" style={{ background: `linear-gradient(to right, #ff0033 ${ratio}%, rgba(255,255,255,.55) ${ratio}%)` }} type="range" value={position} />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[22%] h-[3px] w-[2px] bg-black/55" /><span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[39%] h-[3px] w-[2px] bg-black/55" /><span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[64%] h-[3px] w-[2px] bg-black/55" />
        </div>
        <div className="absolute inset-x-0 bottom-0 hidden px-3 pb-3 text-white md:block">
          <input aria-label="Video progress" className="youtube-two-scrubber block w-full cursor-pointer accent-[#ff0033]" max={duration} min="0" onChange={(event) => onPosition(Number(event.target.value))} step="1" style={{ background: `linear-gradient(to right, #ff0033 ${ratio}%, rgba(255,255,255,.55) ${ratio}%)` }} type="range" value={position} />
          <div className="mt-2 flex items-center gap-1">
            <IconButton className="hover:bg-white/[.18]" icon={playing ? "pause" : "play"} label={playing ? "Pause" : "Play"} onClick={onTogglePlay} />
            <IconButton className="hover:bg-white/[.18]" icon={muted ? "mute" : "volume"} label={muted ? "Unmute" : "Mute"} onClick={onToggleMute} />
            <span className="ml-1 text-[13px] font-medium">{timestamp(position)} / {video.duration}</span>
            <div className="ml-auto flex items-center gap-1">
              <IconButton className={`hover:bg-white/[.18] ${captions ? "bg-white/20" : ""}`} icon="captions" label="Captions" onClick={() => setCaptions((value) => !value)} pressed={captions} />
              <IconButton className={`hover:bg-white/[.18] ${settingsOpen ? "bg-white/20" : ""}`} icon="settings" label="Settings" onClick={() => setSettingsOpen((value) => !value)} pressed={settingsOpen} />
              <IconButton className="hover:bg-white/[.18]" icon="miniplayer" label="Miniplayer" onClick={onMinimize} />
              <IconButton className="hover:bg-white/[.18]" icon="fullscreen" label="Full screen" onClick={enterFullscreen} />
            </div>
          </div>
        </div>
        {settingsOpen ? <div className="absolute bottom-[66px] right-3 hidden w-56 rounded-xl bg-[#272727] p-2 text-[14px] text-white shadow-2xl md:block"><button className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-left hover:bg-white/[.1]" onClick={() => setSettingsOpen(false)} type="button"><span>Playback speed</span><span className="text-[#aaa]">Normal</span></button><button className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-left hover:bg-white/[.1]" onClick={() => setSettingsOpen(false)} type="button"><span>Quality</span><span className="text-[#aaa]">Auto</span></button></div> : null}
      </div>
    </div>
  );
}

function FeedInlinePlayer({ video, onOpen }: { video: YoutubeTwoVideo; onOpen: (video: YoutubeTwoVideo) => void }) {
  const [playing, setPlaying] = useState(true);
  const [controls, setControls] = useState(false);
  const [position, setPosition] = useState(Math.round(secondsFromDuration(video.duration) * ((video.progress ?? 22) / 100)));
  const duration = secondsFromDuration(video.duration);
  const ratio = Math.min(100, (position / duration) * 100);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPosition((current) => current + 1 >= duration ? 0 : current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [duration, playing]);

  useEffect(() => {
    if (!controls) return;
    const timeout = window.setTimeout(() => setControls(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [controls]);

  return (
    <section aria-label="Inline video playback" className="relative aspect-video overflow-hidden bg-black" onPointerMove={() => setControls(true)}>
      <Image alt={video.alt} className="object-cover" fill priority sizes="100vw" src={video.thumbnail} />
      <button aria-label="Show player controls" className="absolute inset-0" onClick={() => setControls((value) => !value)} type="button" />
      <span className="absolute bottom-0 left-0 h-[3px] bg-[#ff0033]" style={{ width: `${ratio}%` }} />
      <div className={`absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70 transition-opacity ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex items-center justify-between px-3 pt-3 text-white"><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="chevron-down" label="Collapse player" onClick={() => setControls(false)} /><div className="flex gap-1"><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="cast" label="Cast" /><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="captions" label="Captions" /><IconButton className="h-11 w-11 hover:bg-white/[.18]" icon="settings" label="Settings" /></div></div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-white"><button aria-label="Rewind 10 seconds" className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#4b4b4b]/95" onClick={() => setPosition((current) => Math.max(0, current - 10))} type="button"><YoutubeTwoIcon className="h-8 w-8" name="rewind" /></button><button aria-label={playing ? "Pause inline playback" : "Play inline playback"} className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#4b4b4b]/95" onClick={() => setPlaying((value) => !value)} type="button"><YoutubeTwoIcon className="h-10 w-10" name={playing ? "pause" : "play"} /></button><button aria-label="Forward 10 seconds" className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#4b4b4b]/95" onClick={() => setPosition((current) => Math.min(duration, current + 10))} type="button"><YoutubeTwoIcon className="h-8 w-8" name="forward" /></button></div>
        <div className="absolute inset-x-0 bottom-0 text-white"><div className="flex items-center gap-2 px-3 pb-5"><span className="shrink-0 rounded-full bg-[#4b4b4b]/95 px-2.5 py-1.5 text-[13px] font-semibold">{timestamp(position)} / {video.duration}</span><button className="min-w-0 flex-1 truncate rounded-full bg-[#4b4b4b]/95 px-3 py-1.5 text-left text-[13px] font-semibold" onClick={() => onOpen(video)} type="button">Movement II · Hold to seek precisely</button><span className="grid h-11 w-11 place-items-center rounded-full bg-[#4b4b4b]/95"><YoutubeTwoIcon className="h-6 w-6" name="fullscreen" /></span></div><input aria-label="Inline video progress" className="youtube-two-scrubber block w-full cursor-pointer" max={duration} min="0" onChange={(event) => setPosition(Number(event.target.value))} step="1" style={{ background: `linear-gradient(to right, #ff0033 ${ratio}%, rgba(255,255,255,.55) ${ratio}%)` }} type="range" value={position} /></div>
      </div>
    </section>
  );
}

function WatchPage({
  video,
  playing,
  position,
  muted,
  liked,
  disliked,
  saved,
  onTogglePlay,
  onPosition,
  onToggleMute,
  onMinimize,
  onLike,
  onDislike,
  onSave,
  onShare,
  onOpenComments,
  onOpen,
  onMore,
}: {
  video: YoutubeTwoVideo;
  playing: boolean;
  position: number;
  muted: boolean;
  liked: boolean;
  disliked: boolean;
  saved: boolean;
  onTogglePlay: () => void;
  onPosition: (value: number) => void;
  onToggleMute: () => void;
  onMinimize: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenComments: () => void;
  onOpen: (video: YoutubeTwoVideo) => void;
  onMore: (video: YoutubeTwoVideo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [recommendationFilter, setRecommendationFilter] = useState("All");
  const [visibleRecommendations, setVisibleRecommendations] = useState(10);
  const creator = youtubeTwoCreator(video.creatorId);
  const recommendations = useMemo(() => youtubeTwoVideos.filter((candidate) => candidate.id !== video.id), [video.id]);
  const filteredRecommendations = useMemo(() => {
    const filtered = recommendationFilter === "From channel"
      ? recommendations.filter((candidate) => candidate.creatorId === video.creatorId)
      : recommendationFilter === "Related"
        ? recommendations.filter((candidate) => candidate.topic === video.topic)
        : recommendationFilter === "Recently uploaded"
          ? [...recommendations].reverse()
          : recommendations;
    return filtered.length ? filtered : recommendations;
  }, [recommendationFilter, recommendations, video.creatorId, video.topic]);
  const recommendationEntries = useMemo(
    () => repeatYoutubeTwoVideos(filteredRecommendations, visibleRecommendations, `watch-next-${video.id}-${recommendationFilter}`),
    [filteredRecommendations, recommendationFilter, video.id, visibleRecommendations],
  );

  useEffect(() => {
    const extendRecommendations = () => {
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 960) setVisibleRecommendations((count) => count + 8);
    };
    window.addEventListener("scroll", extendRecommendations, { passive: true });
    return () => window.removeEventListener("scroll", extendRecommendations);
  }, []);

  return (
    <main className="bg-[#0f0f0f] pb-24 text-[#f1f1f1] md:min-h-[calc(100dvh-56px)] md:min-w-0 md:flex-1 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1780px] md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-7">
        <section className="min-w-0">
          <Player muted={muted} onMinimize={onMinimize} onPosition={onPosition} onToggleMute={onToggleMute} onTogglePlay={onTogglePlay} playing={playing} position={position} video={video} />
          <div className="px-3 pt-3 md:px-0 md:pt-4">
            <h1 className="line-clamp-2 text-[21px] font-semibold leading-[1.24] tracking-[-.035em] md:text-[20px] md:leading-[1.3]">{video.title}</h1>
            <p className="mt-1 truncate text-[15px] text-[#aaa] md:hidden"><span>{creator.handle} <span aria-hidden="true">•</span> 3.7K likes <span aria-hidden="true">•</span> </span>{video.views} <span aria-hidden="true">•</span> {video.published} <button aria-expanded={expanded} className="ml-1 font-semibold text-[#f1f1f1]" onClick={() => setExpanded((value) => !value)} type="button">…more</button></p>
            <div className="mt-4 flex items-center gap-2 overflow-hidden md:hidden">
              <Avatar creatorId={creator.id} size={42} />
              <button aria-label={subscribed ? "Subscription options" : "Subscribe"} className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-[#272727] px-3 text-[#f1f1f1] outline-none hover:bg-[#3f3f3f]" onClick={() => setSubscribed((value) => !value)} type="button"><YoutubeTwoIcon className="h-6 w-6" name="bell-off" /><YoutubeTwoIcon className="h-4 w-4" name="chevron-down" /></button>
              <WatchActions disliked={disliked} liked={liked} onDislike={onDislike} onLike={onLike} onMore={() => onMore(video)} onSave={onSave} onShare={onShare} saved={saved} />
            </div>
            <div className="mt-4 hidden items-center gap-3 md:flex">
              <Avatar creatorId={creator.id} size={40} />
              <div className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{creator.name}</span><span className="block text-[12px] text-[#aaa]">{creator.subscribers}</span></div>
              <button className={`h-9 rounded-full px-4 text-[14px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${subscribed ? "bg-[#272727] text-white" : "bg-[#f1f1f1] text-[#0f0f0f]"}`} onClick={() => setSubscribed((value) => !value)} type="button">{subscribed ? "Subscribed" : "Subscribe"}</button>
            </div>
            <div className="mt-4 hidden md:block"><WatchActions disliked={disliked} liked={liked} onDislike={onDislike} onLike={onLike} onMore={() => onMore(video)} onSave={onSave} onShare={onShare} saved={saved} /></div>
            <button aria-expanded={expanded} className="mt-4 hidden w-full rounded-xl bg-[#272727] px-3 py-3 text-left text-[14px] leading-5 outline-none hover:bg-[#3a3a3a] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] md:block" onClick={() => setExpanded((value) => !value)} type="button">
              <span className="font-semibold">{video.views} views</span> <span className="font-semibold">{video.published}</span>
              <span className={`mt-1 block ${expanded ? "" : "line-clamp-2"}`}>{video.description}</span>
              <span className="mt-1 block font-semibold">{expanded ? "Show less" : "…more"}</span>
            </button>
            <button className="mt-5 block w-full rounded-2xl bg-[#202020] px-3 py-3 text-left outline-none hover:bg-[#2b2b2b] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onOpenComments} type="button">
              <span className="flex items-center justify-between"><span><span className="text-[18px] font-semibold">Comments</span><span className="ml-2 text-[18px] text-[#aaa]">265</span></span><span className="text-[20px] text-[#aaa]">••</span></span>
              <span className="mt-4 flex gap-3"><Image alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" height={88} src={youtubeTwoComments[0].avatar} width={88} /><span className="min-w-0"><span className="block text-[14px] font-semibold">{youtubeTwoComments[0].author}</span><span className="mt-1 line-clamp-2 block text-[15px] leading-5 text-[#ddd]">{youtubeTwoComments[0].body}</span></span></span>
            </button>
          </div>
        </section>
        <section className="mt-6 grid gap-y-7 md:hidden">
          {recommendationEntries.map((entry) => <VideoCard key={entry.id} onMore={onMore} onOpen={onOpen} video={entry.video} />)}
        </section>
        <aside className="mt-0 hidden px-0 md:sticky md:top-20 md:block md:self-start">
          <h2 className="sr-only">Up next</h2>
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[{ id: "All", label: "All" }, { id: "From channel", label: `From ${creator.name}` }, { id: "Related", label: "Related" }, { id: "Recently uploaded", label: "Recently uploaded" }].map((filter) => <button aria-pressed={recommendationFilter === filter.id} className={`h-8 shrink-0 rounded-lg px-3 text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${recommendationFilter === filter.id ? "bg-[#f1f1f1] text-[#0f0f0f]" : "bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f]"}`} key={filter.id} onClick={() => setRecommendationFilter(filter.id)} type="button">{filter.label}</button>)}
          </div>
          <div className="mb-3 flex items-center justify-between"><span className="text-[15px] font-semibold">Up next</span><button aria-pressed={autoplay} className="text-[13px] text-[#aaa]" onClick={() => setAutoplay((value) => !value)} type="button">Autoplay <span className={`ml-1 inline-block h-3 w-6 rounded-full align-middle ${autoplay ? "bg-[#3ea6ff]" : "bg-[#777]"}`}><span className={`block h-3 w-3 rounded-full bg-white transition-transform ${autoplay ? "translate-x-3" : "translate-x-0"}`} /></span></button></div>
          <div className="grid gap-3">{recommendationEntries.map((entry) => <VideoCard compact key={entry.id} onMore={onMore} onOpen={onOpen} video={entry.video} />)}</div>
        </aside>
      </div>
    </main>
  );
}

function HomePage({
  activeChip,
  onChooseChip,
  onOpen,
  onMore,
}: {
  activeChip: string;
  onChooseChip: (value: string) => void;
  onOpen: (video: YoutubeTwoVideo) => void;
  onMore: (video: YoutubeTwoVideo) => void;
}) {
  const [visible, setVisible] = useState(12);
  const videos = useMemo(() => {
    const eligible = activeChip === "All" ? youtubeTwoVideos : youtubeTwoVideos.filter((video) => video.topic === activeChip);
    const source = eligible.length ? eligible : youtubeTwoVideos;
    return repeatYoutubeTwoVideos(source, visible, "home");
  }, [activeChip, visible]);

  useEffect(() => {
    const extend = () => {
      if (document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 920) setVisible((count) => count + 8);
    };
    window.addEventListener("scroll", extend, { passive: true });
    return () => window.removeEventListener("scroll", extend);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-24 md:min-w-0 md:flex-1 md:pb-16">
      <div className="md:hidden"><FeedInlinePlayer onOpen={onOpen} video={youtubeTwoVideos[0]} /></div>
      <TopicRail active={activeChip} onChoose={onChooseChip} />
      <section className="grid gap-y-7 md:grid-cols-3 md:gap-x-4 md:gap-y-10 md:px-6 lg:grid-cols-4 lg:px-8 2xl:grid-cols-5 min-[1900px]:grid-cols-6">
        {videos.map((entry) => <VideoCard key={entry.id} onMore={onMore} onOpen={onOpen} video={entry.video} />)}
      </section>
    </main>
  );
}

function SubscriptionsPage({ onOpen, onMore }: { onOpen: (video: YoutubeTwoVideo) => void; onMore: (video: YoutubeTwoVideo) => void }) {
  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-24 text-[#f1f1f1] md:min-w-0 md:flex-1 md:px-6 md:py-5">
      <div className="flex items-center justify-between px-3 pt-4 md:px-0 md:pt-0"><h1 className="text-[22px] font-bold">Subscriptions</h1><button className="text-[14px] font-medium text-[#3ea6ff] md:text-[#065fd4]" type="button">All</button></div>
      <div className="mt-4 flex gap-4 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:px-0">
        {youtubeTwoCreators.map((creator) => <button className="w-[68px] shrink-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={creator.id} type="button"><Image alt="" className="mx-auto h-14 w-14 rounded-full object-cover" height={112} src={creator.avatar} width={112} /><span className="mt-1.5 block truncate text-[11px] font-medium">{creator.name}</span></button>)}
      </div>
      <h2 className="px-3 pb-3 pt-5 text-[18px] font-semibold md:px-0">Latest</h2>
      <section className="grid gap-y-7 md:grid-cols-2 md:gap-x-4 md:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">{youtubeTwoVideos.slice(0, 9).map((video) => <VideoCard key={video.id} onMore={onMore} onOpen={onOpen} video={video} />)}</section>
    </main>
  );
}

function YouPage({ onOpen }: { onOpen: (video: YoutubeTwoVideo) => void }) {
  return (
    <main className="min-h-screen bg-[#0f0f0f] px-3 pb-24 pt-5 text-[#f1f1f1] md:min-w-0 md:flex-1 md:px-6 md:py-6">
      <div className="flex items-center gap-3"><Image alt="Your account" className="h-16 w-16 rounded-full object-cover" height={128} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&h=160&q=80" width={128} /><div><h1 className="text-[20px] font-bold">Your channel</h1><p className="text-[14px] text-[#aaa]">@you</p></div></div>
      <section className="mt-6 grid gap-1">{["History", "Playlists", "Your videos", "Downloads", "Your clips"].map((item) => <button className="flex h-12 items-center rounded-lg px-3 text-left text-[15px] font-medium hover:bg-white/[.08]" key={item} onClick={() => item === "History" && onOpen(youtubeTwoVideos[0])} type="button">{item}</button>)}</section>
      <h2 className="mt-7 text-[18px] font-semibold">Watch later</h2>
      <div className="mt-3 grid gap-3 md:max-w-[680px]">{youtubeTwoVideos.slice(2, 5).map((video) => <VideoCard compact key={video.id} onMore={() => undefined} onOpen={onOpen} video={video} />)}</div>
    </main>
  );
}

function SearchPage({ query, onOpen, onMore }: { query: string; onOpen: (video: YoutubeTwoVideo) => void; onMore: (video: YoutubeTwoVideo) => void }) {
  const results = youtubeTwoVideos.filter((video) => `${video.title} ${video.topic} ${youtubeTwoCreator(video.creatorId).name}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="min-h-screen bg-[#0f0f0f] px-3 pb-24 text-[#f1f1f1] md:min-w-0 md:flex-1 md:px-6 md:py-6">
      <div className="mb-5 flex items-center justify-between"><h1 className="text-[20px] font-semibold">{query ? `Results for “${query}”` : "Search YouTube"}</h1><button className="rounded-full bg-[#272727] px-3 py-2 text-[13px] font-medium" type="button">Filters</button></div>
      {results.length ? <div className="grid max-w-[1100px] gap-4">{results.map((video) => <VideoCard compact key={video.id} onMore={onMore} onOpen={onOpen} video={video} />)}</div> : <p className="text-[14px] text-[#aaa]">Try a different search.</p>}
    </main>
  );
}

function ShortsPage({ onOpen }: { onOpen: (video: YoutubeTwoVideo) => void }) {
  return (
    <main className="min-h-screen bg-[#0f0f0f] px-3 pb-24 pt-4 text-[#f1f1f1] md:min-w-0 md:flex-1 md:px-6 md:pt-6"><h1 className="text-[22px] font-bold">Shorts</h1><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{youtubeTwoVideos.slice(0, 10).map((video) => <button className="relative aspect-[9/16] overflow-hidden rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={video.id} onClick={() => onOpen(video)} type="button"><Image alt={video.alt} className="object-cover" fill sizes="(max-width: 640px) 48vw, 18vw" src={video.thumbnail} /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 text-[13px] font-semibold leading-4 text-white">{video.title}</span></button>)}</div></main>
  );
}

function MoreMenu({ video, onDismiss, onSave, onToast }: { video: YoutubeTwoVideo | null; onDismiss: () => void; onSave: () => void; onToast: (message: string) => void }) {
  if (!video) return null;
  const options: { icon: YoutubeTwoIconName; label: string; action: () => void }[] = [
    { icon: "add", label: "Add to queue", action: () => onToast("Added to queue") },
    { icon: "save", label: "Save to Watch later", action: onSave },
    { icon: "download", label: "Download", action: () => onToast("Download started") },
  ];
  return <div className="fixed inset-0 z-50 flex items-end bg-black/55 md:items-center md:justify-center" onClick={onDismiss} role="presentation"><section aria-label={`Options for ${video.title}`} className="w-full max-w-[360px] rounded-t-2xl bg-[#272727] p-2 text-[#f1f1f1] shadow-2xl md:rounded-2xl" onClick={(event) => event.stopPropagation()}>{options.map((option) => <button className="flex h-12 w-full items-center gap-4 rounded-xl px-3 text-left text-[14px] font-medium hover:bg-white/[.12]" key={option.label} onClick={() => { option.action(); onDismiss(); }} type="button"><YoutubeTwoIcon className="h-5 w-5" name={option.icon} />{option.label}</button>)}</section></div>;
}

function CommentsSheet({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState(youtubeTwoComments);
  const publish = () => {
    const body = draft.trim();
    if (!body) return;
    setComments((current) => [{ id: `local-${current.length + 1}`, author: "You", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80", body, published: "now", likes: "" }, ...current]);
    setDraft("");
  };
  return (
    <div className="fixed inset-0 z-[55] flex items-end bg-black/65 md:items-center md:justify-center" onClick={onClose} role="presentation">
      <section aria-label="Comments" className="flex h-[min(78dvh,680px)] w-full max-w-[700px] flex-col rounded-t-2xl bg-[#171717] text-[#f1f1f1] shadow-2xl md:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex h-14 shrink-0 items-center justify-between px-4"><h2 className="text-[18px] font-semibold">Comments <span className="text-[#aaa]">1,264</span></h2><IconButton className="hover:bg-white/[.14]" icon="close" label="Close comments" onClick={onClose} /></header>
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"><button className="h-8 rounded-full bg-white px-3 text-[13px] font-medium text-[#0f0f0f]" type="button">Top</button><button className="h-8 rounded-full bg-[#303030] px-3 text-[13px] font-medium" type="button">Newest</button><button className="h-8 rounded-full bg-[#303030] px-3 text-[13px] font-medium" type="button">Topics</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">{comments.map((comment) => <article className="flex gap-3 py-3" key={comment.id}><Image alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" height={72} src={comment.avatar} width={72} /><div className="min-w-0"><p className="text-[13px] font-semibold">{comment.author} <span className="font-normal text-[#aaa]">{comment.published}</span></p><p className="mt-1 text-[14px] leading-5">{comment.body}</p><div className="mt-2 flex items-center gap-4 text-[12px] text-[#aaa]"><button className="hover:text-white" type="button">Like {comment.likes}</button><button className="hover:text-white" type="button">Reply</button></div></div></article>)}</div>
        <form className="flex shrink-0 items-center gap-3 border-t border-white/[.1] px-4 py-3" onSubmit={(event) => { event.preventDefault(); publish(); }}><Image alt="" className="h-8 w-8 rounded-full object-cover" height={64} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={64} /><input aria-label="Add a comment" className="h-10 min-w-0 flex-1 border-b border-[#777] bg-transparent text-[14px] outline-none focus:border-white" onChange={(event) => setDraft(event.target.value)} placeholder="Add a comment…" value={draft} /><button className="text-[14px] font-semibold text-[#3ea6ff] disabled:text-[#666]" disabled={!draft.trim()} type="submit">Send</button></form>
      </section>
    </div>
  );
}

function MiniPlayer({ video, playing, onTogglePlay, onOpen, onDismiss }: { video: YoutubeTwoVideo; playing: boolean; onTogglePlay: () => void; onOpen: () => void; onDismiss: () => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: offset.x, y: offset.y, pointerX: event.clientX, pointerY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = Math.max(-260, Math.min(260, drag.current.x + event.clientX - drag.current.pointerX));
    const y = Math.max(-520, Math.min(80, drag.current.y + event.clientY - drag.current.pointerY));
    setOffset({ x, y });
  };
  return (
    <aside aria-label="Miniplayer" className={`fixed bottom-[calc(70px+env(safe-area-inset-bottom))] right-2 z-35 overflow-hidden rounded-2xl bg-black text-white shadow-[0_12px_36px_rgba(0,0,0,.48)] md:bottom-5 md:right-5 md:w-[320px] md:max-w-none ${expanded ? "w-[min(390px,calc(100vw-24px))]" : "w-[47vw] max-w-[220px]"}`} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}>
      <div className="relative aspect-video w-full cursor-grab touch-none active:cursor-grabbing" onClick={onOpen} onDoubleClick={() => setExpanded((value) => !value)} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} role="button" tabIndex={0}>
        <Image alt={video.alt} className="object-cover" fill sizes="390px" src={video.thumbnail} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent p-2">
          <button aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full bg-black/35 outline-none hover:bg-black/55" onClick={(event) => { event.stopPropagation(); onTogglePlay(); }} onPointerDown={(event) => event.stopPropagation()} type="button"><YoutubeTwoIcon className="h-6 w-6" name={playing ? "pause" : "play"} /></button>
          <button aria-label="Dismiss miniplayer" className="grid h-10 w-10 place-items-center rounded-full bg-black/35 outline-none hover:bg-black/55" onClick={(event) => { event.stopPropagation(); onDismiss(); }} onPointerDown={(event) => event.stopPropagation()} type="button"><YoutubeTwoIcon className="h-7 w-7" name="close" /></button>
        </div>
      </div>
    </aside>
  );
}

export function YoutubeTwoScreen() {
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState(youtubeTwoVideos[0].id);
  const [activeChip, setActiveChip] = useState("All");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [miniplayer, setMiniplayer] = useState(false);
  const [menuVideo, setMenuVideo] = useState<YoutubeTwoVideo | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const selected = youtubeTwoVideo(selectedId);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    const restore = () => {
      const id = new URL(window.location.href).searchParams.get("v");
      if (id && youtubeTwoVideos.some((video) => video.id === id)) {
        setSelectedId(id);
        setView("watch");
        setPlaying(true);
        setMiniplayer(false);
      } else {
        setView("home");
        setPlaying(false);
      }
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    if (!playing || view !== "watch") return;
    const duration = secondsFromDuration(selected.duration);
    const timer = window.setInterval(() => setPosition((current) => current + 1 >= duration ? 0 : current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing, selected.duration, view]);

  const openVideo = (video: YoutubeTwoVideo) => {
    setSelectedId(video.id);
    setPosition(0);
    setPlaying(true);
    setMiniplayer(false);
    setView("watch");
    const url = new URL(window.location.href);
    url.searchParams.set("v", video.id);
    window.history.pushState({ video: video.id }, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigate = (next: View) => {
    if (next === "watch") return;
    setView(next);
    setDrawerOpen(false);
    if (view === "watch") {
      setMiniplayer(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("v");
      window.history.replaceState({}, "", url);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setView("search");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", selected.id);
    try { await navigator.clipboard?.writeText(url.toString()); } catch { /* clipboard access is optional */ }
    announce("Link copied");
  };

  const content: ReactNode = view === "watch" ? (
    <WatchPage key={selected.id} disliked={disliked} liked={liked} muted={muted} onDislike={() => { setDisliked((value) => !value); setLiked(false); }} onLike={() => { setLiked((value) => !value); setDisliked(false); }} onMinimize={() => navigate("home")} onMore={setMenuVideo} onOpen={openVideo} onOpenComments={() => setCommentsOpen(true)} onPosition={setPosition} onSave={() => { setSaved((value) => !value); announce(saved ? "Removed from Watch later" : "Saved to Watch later"); }} onShare={share} onToggleMute={() => setMuted((value) => !value)} onTogglePlay={() => setPlaying((value) => !value)} playing={playing} position={position} saved={saved} video={selected} />
  ) : view === "subscriptions" ? <SubscriptionsPage onMore={setMenuVideo} onOpen={openVideo} />
    : view === "you" ? <YouPage onOpen={openVideo} />
      : view === "search" ? <SearchPage onMore={setMenuVideo} onOpen={openVideo} query={query} />
        : view === "shorts" ? <ShortsPage onOpen={openVideo} />
          : <HomePage activeChip={activeChip} onChooseChip={setActiveChip} onMore={setMenuVideo} onOpen={openVideo} />;

  return (
    <div className="min-h-dvh bg-[#0f0f0f] font-sans text-[#f1f1f1]">
      {view !== "watch" ? <MobileHeader onBack={() => navigate("home")} onHome={() => navigate("home")} onMenu={() => setDrawerOpen(true)} onOpenSearch={() => { setView("search"); window.scrollTo({ top: 0, behavior: "instant" }); }} onSearch={submitSearch} onToast={announce} query={query} setQuery={setQuery} view={view} /> : null}
      <DesktopHeader onHome={() => navigate("home")} onMenu={() => setGuideExpanded((value) => !value)} onSearch={submitSearch} onToast={announce} query={query} setQuery={setQuery} view={view} />
      <div className="md:flex"><DesktopGuide active={view} expanded={guideExpanded} onNavigate={navigate} />{content}</div>
      {view !== "watch" && miniplayer ? <MiniPlayer onDismiss={() => setMiniplayer(false)} onOpen={() => { setView("watch"); setMiniplayer(false); }} onTogglePlay={() => setPlaying((value) => !value)} playing={playing} video={selected} /> : null}
      {view !== "watch" ? <MobileNav active={view} onCreate={() => announce("Choose a video to create") } onNavigate={navigate} /> : null}
      {drawerOpen ? <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setDrawerOpen(false)} role="presentation"><aside className="h-full w-[286px] bg-[#0f0f0f] p-3 text-[#f1f1f1] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex h-11 items-center gap-2 px-1"><IconButton className="hover:bg-white/[.14]" icon="menu" label="Close guide" onClick={() => setDrawerOpen(false)} /><Logo /></div><nav className="mt-4 grid gap-1">{desktopNav.map((item) => <button className={`flex h-11 items-center gap-5 rounded-xl px-3 text-left text-[14px] ${view === item.view ? "bg-[#272727] font-semibold" : "hover:bg-white/[.1]"}`} key={item.view} onClick={() => navigate(item.view)} type="button"><YoutubeTwoIcon className="h-5 w-5" name={item.icon} />{item.label}</button>)}</nav><h2 className="mt-6 px-3 text-[16px] font-semibold">Subscriptions</h2><div className="mt-2 grid gap-1">{youtubeTwoCreators.slice(0, 5).map((creator) => <button className="flex h-10 items-center gap-3 rounded-lg px-3 text-left text-[14px] hover:bg-white/[.1]" key={creator.id} onClick={() => navigate("subscriptions")} type="button"><Image alt="" className="h-6 w-6 rounded-full object-cover" height={48} src={creator.avatar} width={48} />{creator.name}</button>)}</div></aside></div> : null}
      <MoreMenu onDismiss={() => setMenuVideo(null)} onSave={() => { setSaved(true); announce("Saved to Watch later"); }} onToast={announce} video={menuVideo} />
      {commentsOpen ? <CommentsSheet onClose={() => setCommentsOpen(false)} /> : null}
      {toast ? <div aria-live="polite" className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-[#f1f1f1] px-4 py-2.5 text-[14px] font-medium text-[#0f0f0f] shadow-xl md:bottom-6">{toast}</div> : null}
    </div>
  );
}
