import Image from "next/image";
import type { FormEvent } from "react";
import { videoCreators } from "../model/data";
import { Icon } from "./icons";
import { IconButton } from "./video-card";

export type VideoHubView =
  | "home"
  | "explore"
  | "subscriptions"
  | "library"
  | "history"
  | "watch-later"
  | "playlist"
  | "search"
  | "watch"
  | "channel";

export function BrandMark() {
  return (
    <span aria-hidden="true" className="grid h-5 w-7 place-items-center rounded-[5px] bg-[#ff0033] text-white">
      <Icon className="ml-px h-3.5 w-3.5" name="play" />
    </span>
  );
}

type HeaderProps = {
  onToggleMenu: () => void;
  onHome: () => void;
  onSearch: () => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  onOpenNotifications: () => void;
  onOpenAccount: () => void;
  onOpenCreate: () => void;
  onExitSearch: () => void;
  isSearchView: boolean;
  query: string;
  setQuery: (value: string) => void;
};

export function Header({
  onToggleMenu,
  onHome,
  onSearch,
  onSubmitSearch,
  onOpenNotifications,
  onOpenAccount,
  onOpenCreate,
  onExitSearch,
  isSearchView,
  query,
  setQuery,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-black/[0.04] bg-white/95 px-2 backdrop-blur-sm sm:px-4">
      {isSearchView ? (
        <form className="flex w-full min-w-0 items-center gap-1 sm:hidden" onSubmit={onSubmitSearch}>
          <IconButton label="Close search" onClick={onExitSearch}><Icon className="h-5 w-5" name="arrow-left" /></IconButton>
          <input autoFocus aria-label="Search videos" className="h-10 min-w-0 flex-1 border-b border-[#909090] bg-transparent px-2 text-[16px] outline-none focus:border-[#0f0f0f]" onChange={(event) => setQuery(event.target.value)} placeholder="Search" value={query} />
          <IconButton label="Search with your voice"><Icon className="h-5 w-5" name="mic" /></IconButton>
        </form>
      ) : null}

      <div className={`h-full flex-1 items-center gap-1 ${isSearchView ? "hidden sm:flex" : "flex"}`}>
        <IconButton label="Open navigation" onClick={onToggleMenu}>
          <Icon className="h-5 w-5" name="menu" />
        </IconButton>
        <button aria-label="Home" className="ml-1 grid h-10 w-9 place-items-center outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onHome} type="button">
          <BrandMark />
        </button>

        <form className="mx-auto hidden max-w-[680px] flex-1 items-center gap-2 px-5 sm:flex" onSubmit={onSubmitSearch}>
          <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-full border border-[#c6c6c6] bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[#1c62b9] focus-within:shadow-[0_0_0_1px_#1c62b9]">
            <input aria-label="Search" className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-[#606060]" onChange={(event) => setQuery(event.target.value)} placeholder="Search" value={query} />
            <button aria-label="Search" className="grid w-16 place-items-center border-l border-[#d3d3d3] bg-[#f8f8f8] text-[#0f0f0f] transition hover:bg-[#f0f0f0]" type="submit"><Icon className="h-5 w-5" name="search" /></button>
          </div>
          <IconButton label="Search with your voice"><Icon className="h-5 w-5" name="mic" /></IconButton>
        </form>

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton className="sm:hidden" label="Search" onClick={onSearch}><Icon className="h-5 w-5" name="search" /></IconButton>
          <IconButton className="hidden min-[380px]:grid sm:hidden" label="Cast"><Icon className="h-5 w-5" name="cast" /></IconButton>
          <IconButton className="hidden sm:grid" label="Create" onClick={onOpenCreate}><Icon className="h-5 w-5" name="create" /></IconButton>
          <IconButton className="hidden min-[380px]:grid" label="Notifications" onClick={onOpenNotifications}>
            <span className="relative"><Icon className="h-5 w-5" name="bell" /><span className="absolute -right-1 -top-1.5 h-2 w-2 rounded-full border border-white bg-[#ff0033]" /></span>
          </IconButton>
          <button aria-label="Open account menu" className="ml-1 hidden h-8 w-8 overflow-hidden rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] sm:block" onClick={onOpenAccount} type="button">
            <Image alt="Your profile" className="h-full w-full object-cover" height={64} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={64} />
          </button>
        </div>
      </div>
    </header>
  );
}

const mainNavigation: { id: VideoHubView; label: string; icon: "home" | "compass" | "subscriptions" }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "compass" },
  { id: "subscriptions", label: "Subscriptions", icon: "subscriptions" },
];

const libraryNavigation: { id: VideoHubView; label: string; icon: "library" | "history" | "clock" }[] = [
  { id: "library", label: "You", icon: "library" },
  { id: "history", label: "History", icon: "history" },
  { id: "watch-later", label: "Watch later", icon: "clock" },
];

function NavigationItem({
  active,
  label,
  icon,
  onClick,
  expanded,
}: {
  active: boolean;
  label: string;
  icon: "home" | "compass" | "subscriptions" | "library" | "history" | "clock";
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-5 rounded-lg px-3 text-left text-[14px] outline-none transition hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${
        active ? "bg-[#f2f2f2] font-semibold" : "font-medium"
      } ${expanded ? "w-full" : "mx-auto w-12 justify-center px-0"}`}
      onClick={onClick}
      title={!expanded ? label : undefined}
      type="button"
    >
      <Icon className="h-5 w-5 shrink-0" name={icon} />
      {expanded ? <span>{label}</span> : null}
    </button>
  );
}

export function DesktopSidebar({
  activeView,
  expanded,
  onNavigate,
  onOpenChannel,
}: {
  activeView: VideoHubView;
  expanded: boolean;
  onNavigate: (view: VideoHubView) => void;
  onOpenChannel: (creatorId: string) => void;
}) {
  return (
    <aside
      className={`sticky top-14 hidden h-[calc(100dvh-56px)] shrink-0 overflow-y-auto px-2 py-3 md:block ${
        expanded ? "w-[222px]" : "w-[72px]"
      }`}
    >
      <nav className="grid gap-1" aria-label="Primary">
        {mainNavigation.map((item) => (
          <NavigationItem key={item.id} active={activeView === item.id} expanded={expanded} icon={item.icon} label={item.label} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>
      <div className="my-3 h-px bg-[#e5e5e5]" />
      <nav className="grid gap-1" aria-label="Library">
        {libraryNavigation.map((item) => (
          <NavigationItem key={item.id} active={activeView === item.id} expanded={expanded} icon={item.icon} label={item.label} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>
      {expanded ? (
        <>
          <div className="my-3 h-px bg-[#e5e5e5]" />
          <section className="px-3">
            <h2 className="pb-2 pt-1 text-base font-semibold">Subscriptions</h2>
            <div className="grid gap-1">
              {videoCreators.slice(0, 5).map((creator, index) => (
                <button className="flex h-10 items-center gap-3 rounded-lg px-1 text-left text-[14px] font-medium hover:bg-[#f2f2f2]" key={creator.id} onClick={() => onOpenChannel(creator.id)} type="button">
                  <Image alt="" className="h-6 w-6 rounded-full object-cover" height={48} src={creator.avatar} width={48} />
                  <span className="min-w-0 flex-1 truncate">{creator.name}</span>
                  {index < 2 ? <span className="h-1 w-1 rounded-full bg-[#065fd4]" /> : null}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </aside>
  );
}

export function MobileNavigation({ activeView, onNavigate }: { activeView: VideoHubView; onNavigate: (view: VideoHubView) => void }) {
  const items: { id: VideoHubView; label: string; icon: "home" | "compass" | "subscriptions" | "library" }[] = [
    { id: "home", label: "Home", icon: "home" },
    { id: "explore", label: "Explore", icon: "compass" },
    { id: "subscriptions", label: "Subscriptions", icon: "subscriptions" },
    { id: "library", label: "You", icon: "library" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[#e7e7e7] bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile navigation">
      {items.map((item) => (
        <button
          aria-current={activeView === item.id ? "page" : undefined}
          className={`grid place-items-center gap-0.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${activeView === item.id ? "font-semibold text-[#0f0f0f]" : "text-[#606060]"}`}
          key={item.id}
          onClick={() => onNavigate(item.id)}
          type="button"
        >
          <Icon className="h-5 w-5" name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
