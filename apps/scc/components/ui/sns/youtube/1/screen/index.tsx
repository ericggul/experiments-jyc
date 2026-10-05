"use client";

import Image from "next/image";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  commentThreads,
  exploreCollections,
  getCreator,
  getVideo,
  playlists,
  recentSearches,
  videoCreators,
  videos,
  videosByIds,
} from "../model/data";
import type { CommentRecord, VideoRecord } from "../model/types";
import {
  BrandMark,
  DesktopSidebar,
  Header,
  MobileNavigation,
  type VideoHubView,
} from "./navigation";
import { Icon } from "./icons";
import { ChannelAvatar, IconButton, SectionHeader, VideoCard } from "./video-card";

type ChannelTab = "home" | "videos" | "playlists" | "community";
type SearchFilter = "All" | "This week" | "Video" | "Channel";

const desktopOnlyViews = new Set<VideoHubView>(["watch", "search", "channel", "playlist"]);

function durationInSeconds(duration: string) {
  if (duration === "LIVE") return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function formatPlaybackTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function mergeThreadReplies(comments: CommentRecord[], repliesByParentId: Record<string, CommentRecord[]>): CommentRecord[] {
  return comments.map((comment) => ({
    ...comment,
    replies: [
      ...(repliesByParentId[comment.id] ?? []),
      ...mergeThreadReplies(comment.replies ?? [], repliesByParentId),
    ],
  }));
}

function SolidButton({
  children,
  onClick,
  className = "",
  pressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      aria-pressed={pressed}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#0f0f0f] px-4 text-[14px] font-semibold text-white outline-none transition hover:bg-[#272727] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] focus-visible:ring-offset-2 ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SoftButton({
  children,
  onClick,
  className = "",
  pressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      aria-pressed={pressed}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#f2f2f2] px-3.5 text-[14px] font-semibold text-[#0f0f0f] outline-none transition hover:bg-[#e5e5e5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function HomeView({
  onOpen,
  onMore,
}: {
  onOpen: (video: VideoRecord) => void;
  onMore: (video: VideoRecord) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(12);
  const continuousFeed = useMemo(
    () => Array.from({ length: visibleCount }, (_, index) => videos[index % videos.length]),
    [visibleCount],
  );

  useEffect(() => {
    function extendFeed() {
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 1100) setVisibleCount((count) => count + 8);
    }
    window.addEventListener("scroll", extendFeed, { passive: true });
    return () => window.removeEventListener("scroll", extendFeed);
  }, []);

  return (
    <>
      <section className="grid gap-y-7 pb-10 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">
        {continuousFeed.map((video, index) => (
          <VideoCard
            key={`home-${index}-${video.id}`}
            onMore={() => onMore(video)}
            onOpen={() => onOpen(video)}
            variant="feed"
            video={video}
          />
        ))}
      </section>
    </>
  );
}

function ExploreView({ onOpen, onMore }: { onOpen: (video: VideoRecord) => void; onMore: (video: VideoRecord) => void }) {
  return (
    <div className="pb-10">
      <div className="px-3 pb-4 pt-6 sm:px-5">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Explore</h1>
      </div>
      <section className="grid grid-cols-2 gap-x-3 gap-y-5 px-3 sm:grid-cols-3 sm:px-5 lg:grid-cols-4">
        {exploreCollections.map((collection) => (
          <button className="group min-w-0 text-left outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={collection.id} onClick={() => onOpen(getVideo(collection.videoIds[0]))} type="button">
            <span className="relative block aspect-video overflow-hidden rounded-xl bg-[#e8e8e8]">
              <Image alt={collection.imageAlt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" fill sizes="(max-width: 680px) 50vw, (max-width: 1024px) 33vw, 25vw" src={collection.image} />
              <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">{collection.videoIds.length} videos</span>
            </span>
            <span className="mt-2 block truncate text-[15px] font-semibold">{collection.title}</span>
            <span className="mt-0.5 block line-clamp-2 text-[13px] leading-4 text-[#606060]">{collection.description}</span>
          </button>
        ))}
      </section>
      <SectionHeader title="Trending videos" />
      <section className="grid gap-y-7 pb-10 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">
        {videos.slice(3, 11).map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} variant="feed" video={video} />)}
      </section>
    </div>
  );
}

function SubscriptionView({
  onOpen,
  onOpenChannel,
  onMore,
}: {
  onOpen: (video: VideoRecord) => void;
  onOpenChannel: (creatorId: string) => void;
  onMore: (video: VideoRecord) => void;
}) {
  return (
    <div className="pb-10">
      <div className="flex items-center justify-between px-3 pb-4 pt-6 sm:px-5">
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Subscriptions</h1>
        <button className="text-sm font-medium text-[#065fd4] outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => onOpenChannel(videoCreators[0].id)} type="button">Manage</button>
      </div>
      <section className="flex gap-4 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-5">
        {videoCreators.map((creator) => (
          <button className="w-[72px] shrink-0 text-center outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={creator.id} onClick={() => onOpenChannel(creator.id)} type="button">
            <Image alt="" className="mx-auto h-14 w-14 rounded-full object-cover" height={112} src={creator.avatar} width={112} />
            <span className="mt-2 block truncate text-xs font-medium">{creator.name}</span>
          </button>
        ))}
      </section>
      <SectionHeader title="Latest" />
      <section className="grid gap-y-7 pb-10 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-8 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">
        {videos.slice(0, 8).map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} variant="feed" video={video} />)}
      </section>
    </div>
  );
}

function LibraryView({
  onHistory,
  onWatchLater,
  onPlaylist,
  onOpen,
}: {
  onHistory: () => void;
  onWatchLater: () => void;
  onPlaylist: (playlistId: string) => void;
  onOpen: (video: VideoRecord) => void;
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-3 pb-12 sm:px-5">
      <SectionHeader title="You" />
      <section className="grid gap-1 sm:max-w-[620px]">
        {[
          { label: "History", icon: "history" as const, action: onHistory },
          { label: "Watch later", icon: "clock" as const, action: onWatchLater },
          { label: "Playlists", icon: "list" as const, action: () => onPlaylist(playlists[1].id) },
          { label: "Downloads", icon: "download" as const, action: () => onOpen(videos[6]) },
        ].map((item) => (
          <button className="flex h-12 items-center gap-4 rounded-lg px-3 text-left text-sm font-medium outline-none transition hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={item.label} onClick={item.action} type="button">
            <Icon className="h-5 w-5" name={item.icon} />
            <span className="flex-1">{item.label}</span>
            <Icon className="h-4 w-4 text-[#606060]" name="chevron-right" />
          </button>
        ))}
      </section>
      <SectionHeader action={<button className="text-sm font-semibold text-[#065fd4]" onClick={onHistory} type="button">View all</button>} title="History" />
      <section className="grid gap-3">
        {videos.filter((video) => video.progress).map((video) => <VideoCard key={video.id} onOpen={() => onOpen(video)} variant="row" video={video} />)}
      </section>
      <SectionHeader title="Playlists" />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((playlist) => (
          <button className="flex gap-3 rounded-xl p-1 text-left outline-none transition hover:bg-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={playlist.id} onClick={() => onPlaylist(playlist.id)} type="button">
            <span className="relative aspect-video w-[44%] overflow-hidden rounded-lg bg-[#e8e8e8]"><Image alt={playlist.thumbnailAlt} className="h-full w-full object-cover" fill sizes="190px" src={playlist.thumbnail} /><span className="absolute inset-x-0 bottom-0 bg-black/72 px-2 py-1 text-xs text-white">{playlist.count} videos</span></span>
            <span className="min-w-0 py-1"><span className="block line-clamp-2 text-[15px] font-semibold">{playlist.title}</span><span className="mt-1 block text-xs text-[#606060]">{playlist.updated}</span></span>
          </button>
        ))}
      </section>
    </div>
  );
}

function HistoryView({ onBack, onOpen, onMore }: { onBack: () => void; onOpen: (video: VideoRecord) => void; onMore: (video: VideoRecord) => void }) {
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-3 pb-10 pt-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section>
        <button className="mb-3 flex items-center gap-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] lg:hidden" onClick={onBack} type="button"><Icon className="h-5 w-5" name="arrow-left" />Back</button>
        <h1 className="text-3xl font-bold tracking-[-0.04em]">History</h1>
        <p className="mt-1 text-sm text-[#606060]">Videos you watched recently</p>
        <div className="mt-6 grid gap-4">
          {videos.slice(0, 9).map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} variant="row" video={video} />)}
        </div>
      </section>
      <aside className="hidden self-start rounded-xl bg-[#f7f7f7] p-5 lg:block">
        <h2 className="font-bold">History controls</h2>
        <button className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#065fd4]" type="button"><Icon className="h-5 w-5" name="search" />Search watch history</button>
        <button className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#065fd4]" type="button"><Icon className="h-5 w-5" name="trash" />Clear all watch history</button>
        <button className="mt-4 flex items-center gap-3 text-sm font-semibold text-[#065fd4]" type="button"><Icon className="h-5 w-5" name="settings" />Manage all history</button>
      </aside>
    </div>
  );
}

function PlaylistView({
  onBack,
  onOpen,
  onMore,
  playlistId,
}: {
  onBack: () => void;
  onOpen: (video: VideoRecord) => void;
  onMore: (video: VideoRecord) => void;
  playlistId: string;
}) {
  const playlist = playlists.find((item) => item.id === playlistId) ?? playlists[0];
  const selected = playlist.id === "watch-later" ? videos.slice(0, 8) : videos.slice(3, 11);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-3 pb-10 pt-5 sm:px-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start lg:sticky lg:top-20">
        <button className="mb-4 flex items-center gap-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onBack} type="button"><Icon className="h-5 w-5" name="arrow-left" />Back</button>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#272727]"><Image alt={playlist.thumbnailAlt} className="h-full w-full object-cover opacity-75" fill sizes="300px" src={playlist.thumbnail} /><span className="absolute inset-0 grid place-items-center bg-black/20"><Icon className="h-11 w-11 text-white" name="list" /></span></div>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.035em]">{playlist.title}</h1>
        <p className="mt-1 text-sm text-[#606060]">You • {playlist.count} videos</p>
        <p className="mt-3 text-sm text-[#606060]">{playlist.updated} • Private</p>
        <SolidButton className="mt-5 w-full" onClick={() => onOpen(selected[0])}><Icon className="h-4 w-4" name="play" />Play all</SolidButton>
        <SoftButton className="mt-2 w-full"><Icon className="h-4 w-4" name="share" />Share</SoftButton>
      </aside>
      <section className="grid gap-4">
        {selected.map((video, index) => (
          <div className="flex items-center gap-2" key={video.id}><span className="w-5 text-center text-sm text-[#606060]">{index + 1}</span><div className="min-w-0 flex-1"><VideoCard onMore={() => onMore(video)} onOpen={() => onOpen(video)} variant="row" video={video} /></div></div>
        ))}
      </section>
    </div>
  );
}

function SearchView({
  filter,
  onFilter,
  onOpen,
  onOpenChannel,
  onMore,
  query,
}: {
  filter: SearchFilter;
  onFilter: (filter: SearchFilter) => void;
  onOpen: (video: VideoRecord) => void;
  onOpenChannel: (creatorId: string) => void;
  onMore: (video: VideoRecord) => void;
  query: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchResults = useMemo(() => {
    const lowered = query.toLowerCase();
    const matched = videos.filter((video) => `${video.title} ${video.description} ${video.tags.join(" ")}`.toLowerCase().includes(lowered));
    return matched.length > 0 ? matched : videos.slice(0, 7);
  }, [query]);
  const channelResults = useMemo(() => {
    const lowered = query.toLowerCase();
    const matched = videoCreators.filter((creator) => `${creator.name} ${creator.handle}`.toLowerCase().includes(lowered));
    return matched.length > 0 || query.trim() ? matched : videoCreators.slice(0, 4);
  }, [query]);
  const filteredVideos = useMemo(() => {
    if (filter === "This week") return searchResults.filter((video) => /(?:[1-6]|[1-9]\d) days ago/.test(video.published));
    return searchResults;
  }, [filter, searchResults]);
  const showChannels = filter === "Channel";
  const showVideos = filter !== "Channel";

  return (
    <div className="mx-auto max-w-[1120px] px-3 pb-12 pt-3 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-[-0.025em]">Results for “{query || "field recording city"}”</h1>
        <SoftButton onClick={() => setFiltersOpen((current) => !current)} pressed={filtersOpen}><Icon className="h-4 w-4" name="filter" />Filters</SoftButton>
      </div>
      {filtersOpen ? (
        <section aria-label="Search filters" className="mt-4 grid gap-3 rounded-xl bg-[#f2f2f2] p-4 sm:grid-cols-2">
          <div><p className="text-xs font-semibold text-[#606060]">Upload date</p><div className="mt-2 flex gap-2"><SoftButton className={filter === "This week" ? "bg-[#dcdcdc]" : ""} onClick={() => onFilter("This week")} pressed={filter === "This week"}>This week</SoftButton><SoftButton className={filter === "All" ? "bg-[#dcdcdc]" : ""} onClick={() => onFilter("All")} pressed={filter === "All"}>Any time</SoftButton></div></div>
          <div><p className="text-xs font-semibold text-[#606060]">Type</p><div className="mt-2 flex gap-2"><SoftButton className={filter === "Video" ? "bg-[#dcdcdc]" : ""} onClick={() => onFilter("Video")} pressed={filter === "Video"}>Video</SoftButton><SoftButton className={filter === "Channel" ? "bg-[#dcdcdc]" : ""} onClick={() => onFilter("Channel")} pressed={filter === "Channel"}>Channel</SoftButton></div></div>
        </section>
      ) : null}
      <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {(["All", "This week", "Video", "Channel"] as SearchFilter[]).map((item) => <button aria-pressed={filter === item} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${filter === item ? "bg-[#0f0f0f] text-white" : "bg-[#f2f2f2] hover:bg-[#e5e5e5]"}`} key={item} onClick={() => onFilter(item)} type="button">{item}</button>)}
      </div>
      <section className="mt-7 grid gap-5">
        {showChannels ? channelResults.map((creator) => <ChannelSearchResult creatorId={creator.id} key={creator.id} onOpen={() => onOpenChannel(creator.id)} />) : null}
        {showChannels && channelResults.length === 0 ? <p className="py-10 text-center text-sm text-[#606060]">No channels found for this search.</p> : null}
        {!showChannels && filter === "All" ? channelResults.slice(0, 1).map((creator) => <ChannelSearchResult creatorId={creator.id} key={creator.id} onOpen={() => onOpenChannel(creator.id)} />) : null}
        {showVideos ? filteredVideos.map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} variant="row" video={video} />) : null}
        {showVideos && filteredVideos.length === 0 ? <p className="py-10 text-center text-sm text-[#606060]">No videos found with these filters.</p> : null}
      </section>
    </div>
  );
}

function ChannelSearchResult({ creatorId, onOpen }: { creatorId: string; onOpen: () => void }) {
  const creator = getCreator(creatorId);
  return (
    <article className="flex items-center gap-4 py-1">
      <button aria-label={`Open ${creator.name}`} className="min-w-0 flex flex-1 items-center gap-3 text-left outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onOpen} type="button">
        <Image alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" height={128} src={creator.avatar} width={128} />
        <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{creator.name}</span><span className="mt-0.5 block truncate text-[13px] text-[#606060]">{creator.handle} · {creator.subscribers}</span></span>
      </button>
      <SolidButton onClick={onOpen}>View channel</SolidButton>
    </article>
  );
}

function CommentItem({ comment, onReplySubmit }: { comment: CommentRecord; onReplySubmit: (parentId: string, body: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  function submitReply() {
    if (!replyBody.trim()) return;
    onReplySubmit(comment.id, replyBody.trim());
    setReplyBody("");
    setReplying(false);
  }

  return (
    <article className="flex gap-3">
      <Image alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" height={72} src={comment.avatar} width={72} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]"><span className="font-semibold">{comment.author}</span> <span className="ml-1 text-[#606060]">{comment.published}</span></p>
        <p className="mt-1 text-sm leading-5 text-[#0f0f0f]">{comment.body}</p>
        <div className="mt-1 flex items-center gap-2"><IconButton className={liked ? "h-8 w-8 bg-[#f2f2f2]" : "h-8 w-8"} label={liked ? "Remove like from comment" : "Like comment"} onClick={() => setLiked((current) => !current)} pressed={liked}><Icon className="h-4 w-4" name={liked ? "like-filled" : "like"} /></IconButton><span className="text-xs text-[#606060]">{comment.likes}</span><button className="px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => setReplying((current) => !current)} type="button">Reply</button></div>
        {replying ? <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); submitReply(); }}><input aria-label={`Reply to ${comment.author}`} className="h-8 min-w-0 flex-1 border-b border-[#909090] bg-transparent text-sm outline-none focus:border-[#0f0f0f]" onChange={(event) => setReplyBody(event.target.value)} placeholder={`Reply to ${comment.author}`} value={replyBody} /><SolidButton className="min-h-8 bg-[#065fd4] px-3 hover:bg-[#0b57b3]" onClick={submitReply}>Reply</SolidButton></form> : null}
        {comment.replies?.map((reply) => <div className="mt-3" key={reply.id}><CommentItem comment={reply} onReplySubmit={onReplySubmit} /></div>)}
      </div>
    </article>
  );
}

function RecommendedFeed({
  currentVideoId,
  onOpen,
}: {
  currentVideoId: string;
  onOpen: (video: VideoRecord) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(15);
  const startingIndex = Math.max(0, videos.findIndex((video) => video.id === currentVideoId));
  const recommendedVideos = useMemo(
    () =>
      Array.from({ length: visibleCount }, (_, index) => {
        const candidate = videos[(startingIndex + index + 1) % videos.length];
        return candidate.id === currentVideoId
          ? videos[(startingIndex + index + 2) % videos.length]
          : candidate;
      }),
    [currentVideoId, startingIndex, visibleCount],
  );

  useEffect(() => {
    function extendRecommendations() {
      const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (remaining < 1300) setVisibleCount((count) => count + 12);
    }

    window.addEventListener("scroll", extendRecommendations, { passive: true });
    return () => window.removeEventListener("scroll", extendRecommendations);
  }, []);

  return (
    <section className="px-4 pb-8 lg:px-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-[-0.02em]">Up next</h2>
        <span className="text-xs font-medium text-[#606060]">Autoplay</span>
      </div>
      <div className="grid gap-4">
        {recommendedVideos.map((video, index) => (
          <VideoCard
            key={`watch-recommendation-${currentVideoId}-${index}-${video.id}`}
            onOpen={() => onOpen(video)}
            variant="row"
            video={video}
          />
        ))}
      </div>
    </section>
  );
}

function WatchView({
  comments,
  commentsOpen,
  currentSeconds,
  descriptionOpen,
  disliked,
  liked,
  onCommentSubmit,
  onReplySubmit,
  onBack,
  onDownload,
  onOpen,
  onOpenChannel,
  onOpenComments,
  onSetPlaybackRate,
  onShare,
  onToggleDescription,
  onToggleDislike,
  onToggleLike,
  onToggleMuted,
  onSeek,
  onTogglePlay,
  onToggleSave,
  onToggleSubscribe,
  playing,
  playbackRate,
  saved,
  subscribed,
  muted,
  video,
}: {
  comments: CommentRecord[];
  commentsOpen: boolean;
  currentSeconds: number;
  descriptionOpen: boolean;
  disliked: boolean;
  liked: boolean;
  onCommentSubmit: (body: string) => void;
  onReplySubmit: (parentId: string, body: string) => void;
  onBack: () => void;
  onDownload: () => void;
  onOpen: (video: VideoRecord) => void;
  onOpenChannel: (creatorId: string) => void;
  onOpenComments: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onShare: () => void;
  onToggleDescription: () => void;
  onToggleDislike: () => void;
  onToggleLike: () => void;
  onToggleMuted: () => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onToggleSave: () => void;
  onToggleSubscribe: () => void;
  playing: boolean;
  playbackRate: number;
  saved: boolean;
  subscribed: boolean;
  muted: boolean;
  video: VideoRecord;
}) {
  const creator = getCreator(video.creatorId);
  const [commentBody, setCommentBody] = useState("");
  const [likePulse, setLikePulse] = useState(false);
  const playerRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const durationSeconds = durationInSeconds(video.duration);
  const currentProgress = durationSeconds > 0 ? Math.min(100, (currentSeconds / durationSeconds) * 100) : 100;
  const playbackLabel = video.live
    ? "LIVE"
    : `${formatPlaybackTime(currentSeconds)} / ${formatPlaybackTime(durationSeconds)}`;

  function handleLike() {
    if (!liked) {
      setLikePulse(true);
      window.setTimeout(() => setLikePulse(false), 180);
    }
    onToggleLike();
  }

  function handleDislike() {
    setLikePulse(false);
    onToggleDislike();
  }

  function isPlayerFullscreen() {
    const documentWithWebkit = document as Document & { webkitFullscreenElement?: Element | null };
    return document.fullscreenElement === playerRef.current || documentWithWebkit.webkitFullscreenElement === playerRef.current;
  }

  async function exitFullscreen() {
    const documentWithWebkit = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    await documentWithWebkit.webkitExitFullscreen?.();
  }

  async function toggleFullscreen() {
    if (!playerRef.current) return;
    const playerWithWebkit = playerRef.current as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    try {
      if (isPlayerFullscreen()) {
        await exitFullscreen();
        return;
      }
      if (playerWithWebkit.requestFullscreen) await playerWithWebkit.requestFullscreen();
      else await playerWithWebkit.webkitRequestFullscreen?.();
    } catch {
      // Browsers can reject a full-screen request when they reserve the gesture.
    }
  }

  async function minimizePlayer() {
    if (isPlayerFullscreen()) await exitFullscreen();
    onBack();
  }

  useEffect(() => {
    function syncFullscreen() {
      setFullscreen(isPlayerFullscreen());
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1480px] pb-[calc(28px+env(safe-area-inset-bottom))]">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-6 lg:pt-5">
        <main className="min-w-0">
          <section ref={playerRef} className="relative aspect-video overflow-hidden bg-[#080808] text-white [&:fullscreen]:h-dvh [&:fullscreen]:w-dvw [&:fullscreen]:aspect-auto">
            <Image alt={video.thumbnailAlt} className={`h-full w-full object-cover transition duration-700 motion-reduce:transition-none ${playing ? "scale-[1.015]" : "scale-100"}`} fill priority sizes="(max-width: 1024px) 100vw, 72vw" src={video.thumbnail} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/18" />
            <IconButton className="absolute left-2 top-2 z-10 text-white hover:bg-black/35 md:hidden" label="Minimize player" onClick={minimizePlayer}><Icon className="h-5 w-5" name="chevron-down" /></IconButton>
            <button aria-label={playing ? "Pause video" : "Play video"} className="absolute inset-0 grid place-items-center outline-none focus-visible:ring-4 focus-visible:ring-white/90" onClick={onTogglePlay} type="button"><span className={`grid h-14 w-14 place-items-center rounded-full bg-black/44 backdrop-blur-sm transition motion-reduce:transition-none ${playing ? "scale-90 opacity-0 hover:scale-100 hover:opacity-100" : ""}`}><Icon className="h-7 w-7" name={playing ? "pause" : "play"} /></span></button>
            <div className="absolute inset-x-0 bottom-0 px-3 pb-1.5 pt-4 sm:px-5 sm:pb-2">
              {video.live ? (
                <div aria-label="Live video progress" className="h-0.5 rounded-full bg-[#ff0033]" />
              ) : (
                <label aria-label="Seek video" className="relative block h-3 cursor-pointer">
                  <span className="absolute inset-x-0 top-1 block h-0.5 rounded-full bg-white/35">
                    <span className="relative block h-full rounded-full bg-[#ff0033]" style={{ width: `${currentProgress}%` }}>
                      <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff0033]" />
                    </span>
                  </span>
                  <input
                    aria-label="Seek video"
                    className="absolute -top-2 left-0 h-7 w-full cursor-pointer opacity-0"
                    max={durationSeconds}
                    min="0"
                    onChange={(event) => onSeek(Number(event.target.value))}
                    step="1"
                    type="range"
                    value={Math.min(currentSeconds, durationSeconds)}
                  />
                </label>
              )}
              {settingsOpen ? (
                <div className="absolute bottom-12 right-3 z-20 w-48 rounded-lg bg-[#1f1f1f]/95 p-2 text-white shadow-xl backdrop-blur-sm" role="dialog" aria-label="Player settings">
                  <p className="px-2 py-1 text-xs font-medium text-white/70">Playback speed</p>
                  <div className="grid grid-cols-3 gap-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <button aria-pressed={playbackRate === rate} className={`rounded px-1 py-2 text-xs font-semibold outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white ${playbackRate === rate ? "bg-white text-[#0f0f0f]" : "text-white"}`} key={rate} onClick={() => { onSetPlaybackRate(rate); setSettingsOpen(false); }} type="button">{rate === 1 ? "Normal" : `${rate}×`}</button>)}
                  </div>
                </div>
              ) : null}
              <div className="mt-1 flex items-center justify-between"><div className="flex items-center gap-1"><IconButton className="h-8 w-8 text-white hover:bg-white/14" label={playing ? "Pause" : "Play"} onClick={onTogglePlay}><Icon className="h-5 w-5" name={playing ? "pause" : "play"} /></IconButton><IconButton className="hidden h-8 w-8 text-white hover:bg-white/14 min-[380px]:grid" label={muted ? "Unmute" : "Mute"} onClick={onToggleMuted}><Icon className="h-5 w-5" name={muted ? "volume-muted" : "volume"} /></IconButton><span className="ml-1 text-xs font-medium tabular-nums">{playbackLabel}</span></div><div className="flex items-center gap-1"><IconButton className="h-8 w-8 text-white hover:bg-white/14" label="Settings" onClick={() => setSettingsOpen((current) => !current)} pressed={settingsOpen}><Icon className="h-5 w-5" name="settings" /></IconButton><IconButton className="h-8 w-8 text-white hover:bg-white/14" label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}><Icon className="h-5 w-5" name={fullscreen ? "fullscreen-exit" : "fullscreen"} /></IconButton></div></div>
            </div>
          </section>
          <div className="px-4 sm:px-0">
            <h1 className="mt-4 text-[19px] font-bold leading-[1.35] tracking-[-0.025em] text-[#0f0f0f] sm:text-[22px]">{video.title}</h1>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><button className="flex min-w-0 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => onOpenChannel(creator.id)} type="button"><ChannelAvatar creatorId={creator.id} size="lg" /><span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{creator.name}</span><span className="mt-0.5 block text-xs text-[#606060]">{creator.subscribers}</span></span></button><SolidButton className={subscribed ? "bg-[#272727]" : ""} onClick={onToggleSubscribe}>{subscribed ? <><Icon className="h-4 w-4" name="check" />Subscribed</> : "Subscribe"}</SolidButton></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"><div className={`inline-flex min-h-9 shrink-0 overflow-hidden rounded-full bg-[#f2f2f2] ${liked || disliked ? "bg-[#e5e5e5]" : ""}`}><button aria-label={liked ? "Remove like" : "Like"} aria-pressed={liked} className="inline-flex items-center gap-2 px-3.5 text-[14px] font-semibold outline-none transition hover:bg-[#e5e5e5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3ea6ff]" onClick={handleLike} type="button"><span className={`grid transition-transform duration-150 ${likePulse ? "scale-[1.18]" : "scale-100"}`}><Icon className="h-4 w-4" name={liked ? "like-filled" : "like"} /></span><span>23K</span></button><span aria-hidden="true" className="my-2 w-px bg-[#d8d8d8]" /><button aria-label={disliked ? "Remove dislike" : "Dislike"} aria-pressed={disliked} className="grid w-10 place-items-center outline-none transition hover:bg-[#e5e5e5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3ea6ff]" onClick={handleDislike} type="button"><Icon className="h-4 w-4" name="dislike" /></button></div><SoftButton onClick={onShare}><Icon className="h-4 w-4" name="share" />Share</SoftButton><SoftButton onClick={onDownload}><Icon className="h-4 w-4" name="download" />Download</SoftButton><SoftButton onClick={onToggleSave} pressed={saved}><Icon className="h-4 w-4" name="save" />{saved ? "Saved" : "Save"}</SoftButton></div>
            <button aria-expanded={descriptionOpen} className="mt-4 block w-full rounded-xl bg-[#f2f2f2] px-3.5 py-3 text-left text-sm leading-5 outline-none hover:bg-[#e9e9e9] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onToggleDescription} type="button"><span className="font-semibold">{video.views} • {video.published}</span><span className={`mt-1 block whitespace-pre-line ${descriptionOpen ? "" : "line-clamp-2"}`}>{video.description}{descriptionOpen ? "\n\nMore from this channel every Tuesday. #fieldnotes #city" : ""}</span><span className="mt-2 block font-semibold">{descriptionOpen ? "Show less" : "...more"}</span></button>
            <section className="mt-5 rounded-xl bg-[#f7f7f7] p-4"><div className="flex items-center justify-between"><button className="flex items-baseline gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onOpenComments} type="button"><h2 className="font-bold">Comments</h2><span className="text-sm text-[#606060]">1,824</span></button><span className="text-xs font-medium text-[#606060]">Top comments</span></div><button className="mt-4 flex w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={onOpenComments} type="button"><Image alt="" className="h-7 w-7 rounded-full object-cover" height={56} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={56} /><span className="truncate text-sm text-[#606060]">Add a comment...</span></button><p className="mt-4 line-clamp-2 text-sm leading-5"><span className="font-semibold">{comments[0]?.author}</span> {comments[0]?.body}</p></section>
          </div>
        </main>
        <aside className="min-w-0 lg:pt-0"><RecommendedFeed currentVideoId={video.id} key={video.id} onOpen={onOpen} /></aside>
      </div>
      {commentsOpen ? <CommentsSheet comments={comments} onClose={onOpenComments} onReplySubmit={onReplySubmit} onSubmit={(body) => { onCommentSubmit(body); setCommentBody(""); }} value={commentBody} onValue={setCommentBody} /> : null}
    </div>
  );
}

function ChannelView({
  activeTab,
  creatorId,
  onBack,
  onOpen,
  onOpenPlaylist,
  onSetTab,
  onMore,
  subscribed,
  toggleSubscribed,
}: {
  activeTab: ChannelTab;
  creatorId: string;
  onBack: () => void;
  onOpen: (video: VideoRecord) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onSetTab: (tab: ChannelTab) => void;
  onMore: (video: VideoRecord) => void;
  subscribed: Set<string>;
  toggleSubscribed: (creatorId: string) => void;
}) {
  const creator = getCreator(creatorId);
  const channelVideos = videos.filter((video) => video.creatorId === creator.id);
  const shownVideos = channelVideos.length > 0 ? channelVideos : videos.slice(0, 5);
  const channelPlaylists = playlists.slice(0, 3);
  const [pollChoice, setPollChoice] = useState<"doors" | "crosswalks" | null>(null);
  return (
    <div className="mx-auto max-w-[1320px] pb-12">
      <button className="ml-3 mt-4 flex items-center gap-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] sm:ml-5" onClick={onBack} type="button"><Icon className="h-5 w-5" name="arrow-left" />Back</button>
      <section className="mt-4 overflow-hidden bg-[#c8d5d7] sm:mx-5 sm:rounded-2xl"><div className="relative h-28 sm:h-44"><Image alt="A muted blue coastal landscape" className="h-full w-full object-cover" fill sizes="(max-width: 680px) 100vw, 1280px" src="https://images.unsplash.com/photo-1519608487953-e999c86e7452?auto=format&fit=crop&w=1600&h=500&q=84" /><span className="absolute inset-0 bg-[#183c4d]/20" /></div></section>
      <section className="px-3 pt-4 sm:px-5 sm:pt-6"><div className="flex flex-wrap items-center gap-4"><Image alt="" className="h-20 w-20 rounded-full object-cover sm:h-28 sm:w-28" height={224} src={creator.avatar} width={224} /><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{creator.name}</h1><p className="mt-1 text-sm text-[#606060]">{creator.handle} • {creator.subscribers} • {shownVideos.length + 12} videos</p><p className="mt-2 line-clamp-2 text-sm text-[#606060]">Small observations, long walks, and an interest in sounds that should have disappeared.</p></div><SolidButton onClick={() => toggleSubscribed(creator.id)}>{subscribed.has(creator.id) ? <><Icon className="h-4 w-4" name="check" />Subscribed</> : "Subscribe"}</SolidButton></div>
        <div className="mt-6 flex gap-5 overflow-x-auto border-b border-[#e5e5e5] [scrollbar-width:none]">{(["home", "videos", "playlists", "community"] as ChannelTab[]).map((tab) => <button aria-current={activeTab === tab ? "page" : undefined} className={`relative h-11 shrink-0 text-sm font-semibold capitalize outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${activeTab === tab ? "text-[#0f0f0f] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#0f0f0f]" : "text-[#606060]"}`} key={tab} onClick={() => onSetTab(tab)} type="button">{tab}</button>)}</div>
      </section>
      {activeTab === "home" ? <><section className="px-3 pt-7 sm:px-5"><h2 className="text-xl font-bold tracking-[-0.025em]">Featured</h2><div className="mt-4 max-w-[760px]"><VideoCard onMore={() => onMore(shownVideos[0])} onOpen={() => onOpen(shownVideos[0])} variant="row" video={shownVideos[0]} /></div></section><section className="px-3 pt-8 sm:px-5"><h2 className="text-xl font-bold tracking-[-0.025em]">Uploads</h2><div className="mt-4 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{shownVideos.slice(1).map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} video={video} />)}</div></section></> : null}
      {activeTab === "videos" ? <section className="grid gap-x-4 gap-y-8 px-3 pt-7 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">{shownVideos.map((video) => <VideoCard key={video.id} onMore={() => onMore(video)} onOpen={() => onOpen(video)} video={video} />)}</section> : null}
      {activeTab === "playlists" ? <section className="grid gap-4 px-3 pt-7 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">{channelPlaylists.map((playlist) => <button className="flex gap-3 rounded-xl p-1 text-left outline-none transition hover:bg-[#f7f7f7] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={playlist.id} onClick={() => onOpenPlaylist(playlist.id)} type="button"><span className="relative aspect-video w-[45%] overflow-hidden rounded-lg bg-[#e8e8e8]"><Image alt={playlist.thumbnailAlt} className="h-full w-full object-cover" fill sizes="190px" src={playlist.thumbnail} /><span className="absolute inset-x-0 bottom-0 bg-black/72 px-2 py-1 text-xs text-white">{playlist.count} videos</span></span><span className="min-w-0 py-1"><span className="block line-clamp-2 text-[15px] font-semibold">{playlist.title}</span><span className="mt-1 block text-xs text-[#606060]">{playlist.updated}</span></span></button>)}</section> : null}
      {activeTab === "community" ? <section className="mx-3 mt-6 max-w-[680px] rounded-2xl bg-[#f7f7f7] p-5 sm:mx-5"><p className="text-sm font-semibold">{creator.name} • 3 days ago</p><p className="mt-3 text-[15px] leading-6">The late train episode is now up. Which sound from a city should never be cleaned out of a recording?</p><div className="mt-4 grid grid-cols-2 gap-2"><SoftButton className={pollChoice === "doors" ? "bg-[#dcdcdc]" : ""} onClick={() => setPollChoice("doors")} pressed={pollChoice === "doors"}>Train doors</SoftButton><SoftButton className={pollChoice === "crosswalks" ? "bg-[#dcdcdc]" : ""} onClick={() => setPollChoice("crosswalks")} pressed={pollChoice === "crosswalks"}>Crosswalks</SoftButton></div><p className="mt-4 text-sm text-[#606060]">{pollChoice ? "Your vote is in · " : ""}8.4K votes • 192 comments</p></section> : null}
    </div>
  );
}

function CommentsSheet({ comments, onClose, onReplySubmit, onSubmit, onValue, value }: { comments: CommentRecord[]; onClose: () => void; onReplySubmit: (parentId: string, body: string) => void; onSubmit: (body: string) => void; onValue: (body: string) => void; value: string }) {
  const [order, setOrder] = useState<"top" | "newest">("top");

  function submit() {
    if (value.trim()) onSubmit(value.trim());
  }

  const displayedComments = useMemo(() => {
    if (order === "top") return comments;
    return [...comments].sort((left, right) => {
      function ageInDays(comment: CommentRecord) {
        if (comment.published === "just now") return -1;
        const days = Number(comment.published.match(/(\d+) days?/)?.[1]);
        if (!Number.isNaN(days)) return days;
        const weeks = Number(comment.published.match(/(\d+) weeks?/)?.[1]);
        return Number.isNaN(weeks) ? Number.MAX_SAFE_INTEGER : weeks * 7;
      }
      return ageInDays(left) - ageInDays(right);
    });
  }, [comments, order]);

  return <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 backdrop-blur-[1px] md:items-center md:justify-center md:p-5" onClick={onClose} role="presentation"><section aria-label="Comments" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl md:max-w-[680px] md:rounded-2xl md:p-6" onClick={(event) => event.stopPropagation()} role="dialog"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Comments</h2><p className="text-sm text-[#606060]">1,824 comments</p></div><IconButton label="Close comments" onClick={onClose}><Icon className="h-5 w-5" name="close" /></IconButton></div><div className="mt-4 flex gap-2"><SoftButton className={order === "top" ? "bg-[#e5e5e5]" : ""} onClick={() => setOrder("top")} pressed={order === "top"}><Icon className="h-4 w-4" name="filter" />Top</SoftButton><SoftButton className={order === "newest" ? "bg-[#e5e5e5]" : ""} onClick={() => setOrder("newest")} pressed={order === "newest"}>Newest</SoftButton></div><form className="mt-5 flex gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}><Image alt="" className="h-9 w-9 rounded-full object-cover" height={72} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={72} /><div className="min-w-0 flex-1"><input aria-label="Add a comment" className="h-9 w-full border-b border-[#909090] bg-transparent text-sm outline-none focus:border-[#0f0f0f]" onChange={(event) => onValue(event.target.value)} placeholder="Add a comment..." value={value} /><div className="mt-2 flex justify-end gap-2"><SoftButton onClick={onClose}>Cancel</SoftButton><SolidButton className="min-h-8 bg-[#065fd4] px-3 hover:bg-[#0b57b3]" onClick={submit}>Comment</SolidButton></div></div></form><div className="mt-7 grid gap-6">{displayedComments.map((comment) => <CommentItem comment={comment} key={comment.id} onReplySubmit={onReplySubmit} />)}</div></section></div>;
}

function MobileMenu({ activeView, onClose, onNavigate, onOpenChannel }: { activeView: VideoHubView; onClose: () => void; onNavigate: (view: VideoHubView) => void; onOpenChannel: (creatorId: string) => void }) {
  const items: { view: VideoHubView; label: string; icon: "home" | "compass" | "subscriptions" | "library" | "history" | "clock" }[] = [{ view: "home", label: "Home", icon: "home" }, { view: "explore", label: "Explore", icon: "compass" }, { view: "subscriptions", label: "Subscriptions", icon: "subscriptions" }, { view: "library", label: "You", icon: "library" }, { view: "history", label: "History", icon: "history" }, { view: "watch-later", label: "Watch later", icon: "clock" }];

  return (
    <div className="fixed inset-0 z-50 bg-black/35 md:hidden" onClick={onClose} role="presentation">
      <aside aria-label="Navigation menu" aria-modal="true" className="flex h-full w-[82%] max-w-[332px] flex-col bg-white px-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex h-12 items-center justify-between px-2"><BrandMark /><IconButton label="Close menu" onClick={onClose}><Icon className="h-5 w-5" name="close" /></IconButton></div>
        <nav className="mt-4 grid gap-1" aria-label="Primary navigation">
          {items.map((item) => <button aria-current={activeView === item.view ? "page" : undefined} className={`flex h-11 items-center gap-5 rounded-lg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${activeView === item.view ? "bg-[#f2f2f2] font-semibold" : "font-medium"}`} key={item.view} onClick={() => onNavigate(item.view)} type="button"><Icon className="h-5 w-5" name={item.icon} />{item.label}</button>)}
        </nav>
        <section className="mt-7" aria-labelledby="menu-subscriptions"><p className="px-3 text-sm font-semibold text-[#606060]" id="menu-subscriptions">Subscriptions</p><div className="mt-2 grid gap-1">{videoCreators.slice(0, 4).map((creator) => <button className="flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium outline-none hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={creator.id} onClick={() => onOpenChannel(creator.id)} type="button"><Image alt="" className="h-6 w-6 rounded-full object-cover" height={48} src={creator.avatar} width={48} />{creator.name}<span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#065fd4]" /></button>)}</div></section>
        <button className="mt-auto flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium outline-none hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" onClick={() => onNavigate("library")} type="button"><Icon className="h-5 w-5" name="user" />Your channel</button>
      </aside>
    </div>
  );
}

function Popover({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  return <div className="fixed inset-0 z-50" onClick={onClose} role="presentation"><section aria-label={label} className="absolute right-3 top-14 w-[min(360px,calc(100vw-24px))] rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.22)]" onClick={(event) => event.stopPropagation()} role="dialog">{children}</section></div>;
}

function QueuePanel({ onClose, onOpen, queue }: { onClose: () => void; onOpen: (video: VideoRecord) => void; queue: VideoRecord[] }) {
  return <Popover label="Queue" onClose={onClose}><div className="flex items-center justify-between px-3 py-2"><div><h2 className="font-bold">Queue</h2><p className="text-xs text-[#606060]">Playing next</p></div><IconButton label="Close queue" onClick={onClose}><Icon className="h-5 w-5" name="close" /></IconButton></div><div className="mt-1 grid gap-2">{queue.map((video) => <button className="flex gap-3 rounded-xl p-2 text-left hover:bg-[#f2f2f2]" key={video.id} onClick={() => onOpen(video)} type="button"><span className="relative aspect-video w-28 overflow-hidden rounded-lg"><Image alt={video.thumbnailAlt} className="h-full w-full object-cover" fill sizes="112px" src={video.thumbnail} /></span><span className="min-w-0"><span className="line-clamp-2 text-sm font-semibold">{video.title}</span><span className="mt-1 block text-xs text-[#606060]">{getCreator(video.creatorId).name}</span></span></button>)}</div></Popover>;
}

function NotificationsPanel({ onClose, onOpen }: { onClose: () => void; onOpen: (video: VideoRecord) => void }) {
  return <Popover label="Notifications" onClose={onClose}><div className="flex items-center justify-between px-3 py-2"><h2 className="font-bold">Notifications</h2><IconButton label="Notification settings" onClick={onClose}><Icon className="h-5 w-5" name="settings" /></IconButton></div><div className="mt-1 grid gap-1">{videos.slice(0, 4).map((video, index) => <button className="flex gap-3 rounded-xl p-3 text-left hover:bg-[#f2f2f2]" key={video.id} onClick={() => onOpen(video)} type="button"><Image alt="" className="h-9 w-9 rounded-full object-cover" height={72} src={getCreator(video.creatorId).avatar} width={72} /><span className="min-w-0 flex-1 text-sm leading-5"><strong>{getCreator(video.creatorId).name}</strong> {index === 0 ? "uploaded: " : "recommended: "}<span className="font-medium">{video.title}</span><span className="mt-1 block text-xs text-[#606060]">{video.published}</span></span></button>)}</div></Popover>;
}

function AccountPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: VideoHubView) => void }) {
  return <Popover label="Account" onClose={onClose}><div className="flex gap-3 p-3"><Image alt="" className="h-10 w-10 rounded-full object-cover" height={80} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80" width={80} /><div><p className="font-semibold">Your channel</p><p className="text-sm text-[#606060]">@you</p><button className="mt-2 text-sm font-semibold text-[#065fd4]" onClick={() => onNavigate("channel")} type="button">View your channel</button></div></div><div className="my-1 h-px bg-[#e5e5e5]" />{[{ label: "Your channel", icon: "user" as const, view: "channel" as VideoHubView }, { label: "YouTube Studio", icon: "settings" as const, view: "library" as VideoHubView }, { label: "Switch account", icon: "user" as const, view: "home" as VideoHubView }].map((item) => <button className="flex h-11 w-full items-center gap-4 rounded-lg px-3 text-left text-sm hover:bg-[#f2f2f2]" key={item.label} onClick={() => onNavigate(item.view)} type="button"><Icon className="h-5 w-5" name={item.icon} />{item.label}</button>)}</Popover>;
}

function CreatePanel({ onClose, onSelect }: { onClose: () => void; onSelect: (action: string) => void }) {
  const actions = [
    { label: "Upload video", icon: "create" as const },
    { label: "Go live", icon: "live" as const },
    { label: "Create post", icon: "comment" as const },
  ];

  return (
    <Popover label="Create" onClose={onClose}>
      <div className="px-3 py-2"><h2 className="font-semibold">Create</h2></div>
      <div className="grid gap-1">
        {actions.map((action) => <button className="flex h-11 w-full items-center gap-4 rounded-lg px-3 text-left text-sm font-medium outline-none hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={action.label} onClick={() => onSelect(action.label)} type="button"><Icon className="h-5 w-5" name={action.icon} />{action.label}</button>)}
      </div>
    </Popover>
  );
}

function ShareSheet({ onClose, onCopy, video }: { onClose: () => void; onCopy: () => void; video: VideoRecord }) {
  const url = new URL(window.location.href);
  url.searchParams.set("v", video.id);
  const link = url.toString();

  function copyLink() {
    void navigator.clipboard?.writeText(link);
    onCopy();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 md:items-center md:justify-center md:p-5" onClick={onClose} role="presentation">
      <section aria-label="Share video" className="w-full rounded-t-2xl bg-white p-5 shadow-2xl md:max-w-[500px] md:rounded-2xl" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Share</h2><IconButton label="Close share sheet" onClick={onClose}><Icon className="h-5 w-5" name="close" /></IconButton></div>
        <div className="mt-5 flex justify-between gap-3">
          {["Copy link", "Email", "Message", "Embed"].map((label, index) => <button className="grid flex-1 place-items-center gap-2 text-center text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff]" key={label} onClick={index === 0 ? copyLink : undefined} type="button"><span className={`grid h-11 w-11 place-items-center rounded-full ${index === 0 ? "bg-[#0f0f0f] text-white" : "bg-[#f2f2f2]"}`}><Icon className="h-5 w-5" name={index === 0 ? "share" : index === 1 ? "send" : index === 2 ? "comment" : "keyboard"} /></span>{label}</button>)}
        </div>
        <div className="mt-6 flex h-10 items-center gap-2 rounded-lg bg-[#f2f2f2] px-3 text-sm"><span className="min-w-0 flex-1 truncate">{link}</span><button className="font-semibold text-[#065fd4]" onClick={copyLink} type="button">Copy</button></div>
        <label className="mt-4 flex items-center gap-3 text-sm"><input className="h-4 w-4 accent-[#0f0f0f]" type="checkbox" />Start at {video.duration === "LIVE" ? "live" : "0:42"}</label>
      </section>
    </div>
  );
}

export default function SnsYoutubeOne() {
  const [view, setView] = useState<VideoHubView>("home");
  const [previousView, setPreviousView] = useState<VideoHubView>("home");
  const [selectedVideoId, setSelectedVideoId] = useState(videos[0].id);
  const [selectedCreatorId, setSelectedCreatorId] = useState(videoCreators[0].id);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(playlists[0].id);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("All");
  const [channelTab, setChannelTab] = useState<ChannelTab>("home");
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(() => new Set());
  const [dislikedVideoIds, setDislikedVideoIds] = useState<Set<string>>(() => new Set());
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(() => new Set());
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(() => new Set(["field-notes", "counterweight", "mira-choi"]));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [extraComments, setExtraComments] = useState<CommentRecord[]>([]);
  const [extraRepliesByParentId, setExtraRepliesByParentId] = useState<Record<string, CommentRecord[]>>({});
  const replySequence = useRef(0);
  const [queueOpen, setQueueOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreVideo, setMoreVideo] = useState<VideoRecord | null>(null);
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [toast, setToast] = useState("");

  const selectedVideo = getVideo(selectedVideoId);
  const selectedDurationSeconds = durationInSeconds(selectedVideo.duration);
  const allComments = useMemo(() => mergeThreadReplies([...extraComments, ...commentThreads], extraRepliesByParentId), [extraComments, extraRepliesByParentId]);
  const activeNavigationView: VideoHubView = desktopOnlyViews.has(view) ? (view === "playlist" ? "library" : "home") : view;

  useEffect(() => {
    if (!playing || selectedDurationSeconds === 0 || playbackSeconds >= selectedDurationSeconds) return undefined;

    const timer = window.setTimeout(
      () => setPlaybackSeconds((current) => Math.min(current + 1, selectedDurationSeconds)),
      1000 / playbackRate,
    );
    return () => window.clearTimeout(timer);
  }, [playbackRate, playbackSeconds, playing, selectedDurationSeconds]);

  useEffect(() => {
    function applyVideoUrl() {
      const videoId = new URLSearchParams(window.location.search).get("v");
      const video = videoId ? videos.find((item) => item.id === videoId) : undefined;
      if (!video) {
        setPlaying(false);
        setMiniPlayerVisible(false);
        setView((current) => current === "watch" ? "home" : current);
        return;
      }
      const duration = durationInSeconds(video.duration);
      setPreviousView("home");
      setSelectedVideoId(video.id);
      setPlaybackSeconds(Math.round(duration * ((video.progress ?? 0) / 100)));
      setPlaying(true);
      setDescriptionOpen(false);
      setMiniPlayerVisible(false);
      setView("watch");
    }

    const initialSync = window.setTimeout(applyVideoUrl, 0);
    window.addEventListener("popstate", applyVideoUrl);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("popstate", applyVideoUrl);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, [selectedVideoId, view]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(nextView: VideoHubView) {
    if (nextView !== "watch") setMiniPlayerVisible(view === "watch" || miniPlayerVisible);
    if (nextView !== "watch" && view === "watch") {
      const url = new URL(window.location.href);
      url.searchParams.delete("v");
      window.history.replaceState({}, "", url);
    }
    setPreviousView(view);
    setView(nextView);
    setMobileMenuOpen(false);
    setAccountOpen(false);
    setNotificationsOpen(false);
    setQueueOpen(false);
    setCreateOpen(false);
  }

  function openVideo(video: VideoRecord) {
    if (view !== "watch") setPreviousView(view);
    setSelectedVideoId(video.id);
    const duration = durationInSeconds(video.duration);
    setPlaybackSeconds(Math.round(duration * ((video.progress ?? 0) / 100)));
    setPlaying(true);
    setDescriptionOpen(false);
    setView("watch");
    const url = new URL(window.location.href);
    url.searchParams.set("v", video.id);
    window.history.pushState({ videoId: video.id }, "", url);
    setMiniPlayerVisible(false);
    setQueueOpen(false);
    setMoreVideo(null);
  }

  function openChannel(creatorId: string) {
    setSelectedCreatorId(creatorId);
    setChannelTab("home");
    navigate("channel");
  }

  function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchQuery.trim()) setSearchQuery(recentSearches[0]);
    navigate("search");
  }

  function submitComment(body: string) {
    setExtraComments((current) => [{ id: `comment-you-${current.length + 1}`, author: "You", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80", body, published: "just now", likes: "0" }, ...current]);
    setToast("Comment added");
  }

  function submitReply(parentId: string, body: string) {
    replySequence.current += 1;
    const reply: CommentRecord = {
      id: `comment-reply-${replySequence.current}`,
      author: "You",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
      body,
      published: "just now",
      likes: "0",
    };
    setExtraRepliesByParentId((current) => ({
      ...current,
      [parentId]: [reply, ...(current[parentId] ?? [])],
    }));
    setToast("Reply added");
  }

  function openPlaylist(playlistId: string) {
    setSelectedPlaylistId(playlistId);
    navigate("playlist");
  }

  const queue = videosByIds(["tape-loop", "first-train", "designing-quiet"]);

  return (
    <main className={`min-h-dvh bg-white font-[Arial,Roboto,Helvetica,sans-serif] text-[#0f0f0f] ${view === "watch" ? "pb-0" : "pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"}`}>
      <div className={view === "watch" ? "hidden md:block" : ""}>
        <Header isSearchView={view === "search"} onExitSearch={() => navigate(previousView)} onHome={() => navigate("home")} onOpenAccount={() => { setAccountOpen(true); setNotificationsOpen(false); setCreateOpen(false); }} onOpenCreate={() => { setCreateOpen(true); setNotificationsOpen(false); setAccountOpen(false); }} onOpenNotifications={() => { setNotificationsOpen(true); setAccountOpen(false); setCreateOpen(false); }} onSearch={() => navigate("search")} onSubmitSearch={submitSearch} onToggleMenu={() => { if (typeof window !== "undefined" && window.innerWidth < 768) setMobileMenuOpen(true); else setSidebarExpanded((current) => !current); }} query={searchQuery} setQuery={setSearchQuery} />
      </div>
      <div className="flex">
        <DesktopSidebar activeView={activeNavigationView} expanded={sidebarExpanded} onNavigate={navigate} onOpenChannel={openChannel} />
        <section className="min-w-0 flex-1">
          {view === "home" ? <HomeView onMore={setMoreVideo} onOpen={openVideo} /> : null}
          {view === "explore" ? <ExploreView onMore={setMoreVideo} onOpen={openVideo} /> : null}
          {view === "subscriptions" ? <SubscriptionView onMore={setMoreVideo} onOpen={openVideo} onOpenChannel={openChannel} /> : null}
          {view === "library" ? <LibraryView onHistory={() => navigate("history")} onOpen={openVideo} onPlaylist={openPlaylist} onWatchLater={() => { setSelectedPlaylistId("watch-later"); navigate("watch-later"); }} /> : null}
          {view === "history" ? <HistoryView onBack={() => navigate("library")} onMore={setMoreVideo} onOpen={openVideo} /> : null}
          {view === "watch-later" ? <PlaylistView onBack={() => navigate("library")} onMore={setMoreVideo} onOpen={openVideo} playlistId="watch-later" /> : null}
          {view === "playlist" ? <PlaylistView onBack={() => navigate("library")} onMore={setMoreVideo} onOpen={openVideo} playlistId={selectedPlaylistId} /> : null}
          {view === "search" ? <SearchView filter={searchFilter} onFilter={setSearchFilter} onMore={setMoreVideo} onOpen={openVideo} onOpenChannel={openChannel} query={searchQuery || recentSearches[0]} /> : null}
          {view === "watch" ? <WatchView comments={allComments} commentsOpen={commentsOpen} currentSeconds={playbackSeconds} descriptionOpen={descriptionOpen} disliked={dislikedVideoIds.has(selectedVideo.id)} liked={likedVideoIds.has(selectedVideo.id)} muted={muted} onBack={() => navigate(previousView)} onCommentSubmit={submitComment} onDownload={() => setToast("Added to downloads")} onOpen={openVideo} onOpenChannel={openChannel} onOpenComments={() => setCommentsOpen((current) => !current)} onReplySubmit={submitReply} onSeek={setPlaybackSeconds} onSetPlaybackRate={(rate) => { setPlaybackRate(rate); setToast(`Playback speed ${rate === 1 ? "normal" : `${rate}×`}`); }} onShare={() => setShareOpen(true)} onToggleDescription={() => setDescriptionOpen((current) => !current)} onToggleDislike={() => { const wasDisliked = dislikedVideoIds.has(selectedVideo.id); toggleSet(setDislikedVideoIds, selectedVideo.id); if (!wasDisliked) setLikedVideoIds((current) => { const next = new Set(current); next.delete(selectedVideo.id); return next; }); setToast(wasDisliked ? "Removed dislike" : "We’ll tune recommendations"); }} onToggleLike={() => { const wasLiked = likedVideoIds.has(selectedVideo.id); toggleSet(setLikedVideoIds, selectedVideo.id); if (!wasLiked) setDislikedVideoIds((current) => { const next = new Set(current); next.delete(selectedVideo.id); return next; }); setToast(wasLiked ? "Removed from Liked videos" : "Added to Liked videos"); }} onToggleMuted={() => setMuted((current) => !current)} onTogglePlay={() => { if (selectedDurationSeconds > 0 && playbackSeconds >= selectedDurationSeconds) setPlaybackSeconds(0); setPlaying((current) => selectedDurationSeconds > 0 && playbackSeconds >= selectedDurationSeconds ? true : !current); }} onToggleSave={() => { toggleSet(setSavedVideoIds, selectedVideo.id); setToast(savedVideoIds.has(selectedVideo.id) ? "Removed from Watch later" : "Saved to Watch later"); }} onToggleSubscribe={() => toggleSet(setSubscribedCreatorIds, selectedVideo.creatorId)} playbackRate={playbackRate} playing={playing && (selectedDurationSeconds === 0 || playbackSeconds < selectedDurationSeconds)} saved={savedVideoIds.has(selectedVideo.id)} subscribed={subscribedCreatorIds.has(selectedVideo.creatorId)} video={selectedVideo} /> : null}
          {view === "channel" ? <ChannelView activeTab={channelTab} creatorId={selectedCreatorId} onBack={() => navigate(previousView)} onMore={setMoreVideo} onOpen={openVideo} onOpenPlaylist={openPlaylist} onSetTab={setChannelTab} subscribed={subscribedCreatorIds} toggleSubscribed={(id) => toggleSet(setSubscribedCreatorIds, id)} /> : null}
        </section>
      </div>
      {view !== "watch" ? <MobileNavigation activeView={activeNavigationView} onNavigate={navigate} /> : null}
      {miniPlayerVisible && view !== "watch" ? (
        <div className="fixed bottom-[calc(74px+env(safe-area-inset-bottom))] right-2 z-40 flex w-[min(360px,calc(100vw-16px))] items-center gap-2 overflow-hidden rounded-xl bg-[#0f0f0f] p-2 text-white shadow-2xl md:bottom-4 md:right-4">
          <button aria-label={`Return to ${selectedVideo.title}`} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-white" onClick={() => openVideo(selectedVideo)} type="button">
            <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg"><Image alt="" className="h-full w-full object-cover" fill sizes="112px" src={selectedVideo.thumbnail} /></span>
            <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold">{selectedVideo.title}</span><span className="mt-1 block text-xs text-white/65">{getCreator(selectedVideo.creatorId).name}</span></span>
          </button>
          <IconButton className="h-8 w-8 text-white hover:bg-white/15" label={playing ? "Pause mini player" : "Play mini player"} onClick={() => setPlaying((current) => !current)}><Icon className="h-5 w-5" name={playing ? "pause" : "play"} /></IconButton>
          <button aria-label="Close mini player" className="grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white" onClick={() => setMiniPlayerVisible(false)} type="button"><Icon className="h-5 w-5" name="close" /></button>
        </div>
      ) : null}
      {mobileMenuOpen ? <MobileMenu activeView={activeNavigationView} onClose={() => setMobileMenuOpen(false)} onNavigate={navigate} onOpenChannel={openChannel} /> : null}
      {queueOpen ? <QueuePanel onClose={() => setQueueOpen(false)} onOpen={openVideo} queue={queue} /> : null}
      {createOpen ? <CreatePanel onClose={() => setCreateOpen(false)} onSelect={(action) => { setCreateOpen(false); setToast(`${action} is ready`); }} /> : null}
      {notificationsOpen ? <NotificationsPanel onClose={() => setNotificationsOpen(false)} onOpen={openVideo} /> : null}
      {accountOpen ? <AccountPanel onClose={() => setAccountOpen(false)} onNavigate={(nextView) => { if (nextView === "channel") setSelectedCreatorId("field-notes"); navigate(nextView); }} /> : null}
      {shareOpen ? <ShareSheet onClose={() => setShareOpen(false)} onCopy={() => { setShareOpen(false); setToast("Link copied"); }} video={selectedVideo} /> : null}
      {moreVideo ? <Popover label="Video options" onClose={() => setMoreVideo(null)}><div className="p-1">{[{ label: "Add to queue", icon: "queue" as const, action: () => { setQueueOpen(true); setMoreVideo(null); } }, { label: savedVideoIds.has(moreVideo.id) ? "Remove from Watch later" : "Save to Watch later", icon: "clock" as const, action: () => { toggleSet(setSavedVideoIds, moreVideo!.id); setToast("Saved to Watch later"); setMoreVideo(null); } }, { label: "Download", icon: "download" as const, action: () => { setToast("Added to downloads"); setMoreVideo(null); } }, { label: "Not interested", icon: "flag" as const, action: () => { setToast("We’ll show fewer videos like this"); setMoreVideo(null); } }].map((item) => <button className="flex h-11 w-full items-center gap-4 rounded-lg px-3 text-left text-sm font-medium hover:bg-[#f2f2f2]" key={item.label} onClick={item.action} type="button"><Icon className="h-5 w-5" name={item.icon} />{item.label}</button>)}</div></Popover> : null}
      {toast ? <div aria-live="polite" className="fixed bottom-[calc(82px+env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-[#0f0f0f] px-4 py-3 text-sm font-medium text-white shadow-xl md:bottom-5">{toast}</div> : null}
    </main>
  );
}
