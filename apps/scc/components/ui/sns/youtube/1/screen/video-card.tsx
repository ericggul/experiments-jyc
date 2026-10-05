import Image from "next/image";
import type { ReactNode } from "react";
import { getCreator } from "../model/data";
import type { VideoRecord } from "../model/types";
import { Icon } from "./icons";

export function ChannelAvatar({
  creatorId,
  size = "md",
  className = "",
}: {
  creatorId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const creator = getCreator(creatorId);
  const dimensions = size === "lg" ? 56 : size === "md" ? 38 : 28;

  return (
    <Image
      alt=""
      className={`block shrink-0 rounded-full object-cover ${className}`}
      height={dimensions}
      src={creator.avatar}
      style={{ height: dimensions, width: dimensions }}
      width={dimensions}
    />
  );
}

export function IconButton({
  label,
  children,
  className = "",
  onClick,
  pressed,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#0f0f0f] outline-none transition hover:bg-black/[0.07] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-3 pb-3 pt-7 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#0f0f0f]">{title}</h2>
        {detail ? <p className="mt-0.5 text-sm text-[#606060]">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function VideoCard({
  video,
  onOpen,
  onMore,
  variant = "grid",
}: {
  video: VideoRecord;
  onOpen: () => void;
  onMore?: () => void;
  variant?: "grid" | "row" | "hero" | "feed";
}) {
  const creator = getCreator(video.creatorId);
  const isRow = variant === "row";
  const isFeed = variant === "feed";

  return (
    <article
      className={`group min-w-0 ${
        isRow ? "grid grid-cols-[minmax(140px,42%)_1fr] gap-3" : "grid gap-2.5"
      }`}
    >
      <button
        aria-label={`Play ${video.title}`}
        className={`relative block overflow-hidden bg-[#e8e8e8] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${
          isRow ? "aspect-video rounded-lg" : isFeed ? "aspect-video rounded-none sm:rounded-xl" : "aspect-video rounded-xl"
        }`}
        onClick={onOpen}
        type="button"
      >
        <Image
          alt={video.thumbnailAlt}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          fill
          loading="lazy"
          sizes={isRow ? "(max-width: 680px) 42vw, 240px" : "(max-width: 680px) 100vw, (max-width: 1200px) 42vw, 320px"}
          src={video.thumbnail}
        />
        {video.progress ? (
          <span className="absolute bottom-0 left-0 h-[3px] bg-[#ff0033]" style={{ width: `${video.progress}%` }} />
        ) : null}
        <span
          className={`absolute bottom-1.5 right-1.5 rounded bg-black/82 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ${
            video.live ? "bg-[#ff0033]" : ""
          }`}
        >
          {video.live ? "LIVE" : video.duration}
        </span>
        {variant === "hero" ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#0f0f0f] shadow-xl backdrop-blur-sm">
              <Icon className="ml-0.5 h-5 w-5" name="play" />
            </span>
          </span>
        ) : null}
      </button>

      <div className={`min-w-0 ${isRow ? "pt-0.5" : `flex gap-3 ${isFeed ? "px-3 sm:px-0" : ""}`}`}>
        {!isRow ? <ChannelAvatar creatorId={video.creatorId} size={isFeed ? "md" : "md"} /> : null}
        <div className="min-w-0 flex-1">
          <button
            className={`block w-full text-left font-semibold leading-[1.32] text-[#0f0f0f] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#3ea6ff] ${
              isRow ? "line-clamp-2 text-sm" : "line-clamp-2 text-[15px]"
            }`}
            onClick={onOpen}
            type="button"
          >
            {video.title}
          </button>
          <button
            className="mt-1 block max-w-full truncate text-left text-[13px] text-[#606060] outline-none hover:text-[#0f0f0f] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#3ea6ff]"
            onClick={onOpen}
            type="button"
          >
            {creator.name}
          </button>
          <p className="mt-0.5 text-[13px] leading-4 text-[#606060]">
            {video.views} <span aria-hidden="true">•</span> {video.published}
          </p>
          {isRow ? (
            <p className="mt-1 hidden line-clamp-2 text-xs leading-4 text-[#606060] lg:block">
              {video.description}
            </p>
          ) : null}
        </div>
        {onMore ? (
          <IconButton className="-mr-2 -mt-2" label={`More options for ${video.title}`} onClick={onMore}>
            <Icon className="h-5 w-5" name="more" />
          </IconButton>
        ) : null}
      </div>
    </article>
  );
}
