"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { snsPosts, type SnsPost } from "./data";

const batchSize = 12;
const initialCount = 18;

function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7">
      <path
        d="M20.8 4.6c-2-2-5.2-1.8-6.9.4L12 7.3 10.1 5C8.4 2.8 5.2 2.6 3.2 4.6.9 6.9 1 10.5 3.4 12.8L12 21l8.6-8.2c2.4-2.3 2.5-5.9.2-8.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconButton({
  label,
  children,
  onClick,
  pressed,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-10 w-10 place-items-center text-current transition active:scale-90 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7">
      <path
        d="M21 11.5a8.4 8.4 0 0 1-8.7 8.3 9.7 9.7 0 0 1-3.5-.7L3 20.6l1.6-5.2a8.1 8.1 0 0 1-.9-3.9A8.4 8.4 0 0 1 12.3 3 8.4 8.4 0 0 1 21 11.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7">
      <path
        d="m21 3-7.2 18-4.1-8.7L1 8.2 21 3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7">
      <path
        d="M6 3.8h12v17L12 17l-6 3.8v-17Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M5 12h.01M12 12h.01M19 12h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="h-2.5 w-2.5">
      <path
        d="M2.2 6.2 4.8 8.7 9.8 3.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MediaCarousel({
  post,
  itemKey,
  liked,
  setLiked,
}: {
  post: SnsPost;
  itemKey: string;
  liked: boolean;
  setLiked: () => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [burst, setBurst] = useState(false);

  return (
    <div className="relative overflow-hidden bg-[#080808]">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth || 1;
          setActiveSlide(Math.round(event.currentTarget.scrollLeft / width));
        }}
        style={{ scrollbarWidth: "none" }}
      >
        {post.media.map((media) => (
          <figure
            key={media.id}
            className="relative aspect-[4/5] min-w-full snap-center overflow-hidden bg-[#161616]"
            onDoubleClick={() => {
              if (!liked) {
                setLiked();
              }
              setBurst(true);
              window.setTimeout(() => setBurst(false), 620);
            }}
          >
            <Image
              alt={media.alt}
              className="h-full w-full object-cover"
              draggable={false}
              fill
              loading="lazy"
              sizes="(max-width: 470px) 100vw, 470px"
              src={media.src}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent_0%,transparent_46%,rgba(0,0,0,0.22)_100%)]" />
            <span className="absolute bottom-3 left-3 rounded-full bg-black/42 px-2.5 py-1 text-[11px] font-medium text-white/88 backdrop-blur-md">
              {media.tone}
            </span>
          </figure>
        ))}
      </div>

      <div className="absolute right-3 top-3 rounded-full bg-black/48 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md">
        {activeSlide + 1}/{post.media.length}
      </div>

      {burst ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.55)]">
          <div className="animate-[ping_0.62s_cubic-bezier(0,0,0.2,1)]">
            <HeartIcon filled />
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {post.media.map((media, index) => (
          <span
            key={`${itemKey}-${media.id}-dot`}
            className={`h-1.5 rounded-full transition-all ${
              index === activeSlide ? "w-5 bg-white" : "w-1.5 bg-white/45"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FeedPost({
  post,
  itemKey,
}: {
  post: SnsPost;
  itemKey: string;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const likeCount = post.likes + (liked ? 1 : 0);

  return (
    <article className="border-b border-[#dbdbdb] bg-white">
      <header className="flex h-14 items-center gap-3 px-3">
        <Image
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-2 ring-[#e1306c] ring-offset-1"
          height={36}
          loading="lazy"
          src={post.author.avatar}
          width={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{post.author.handle}</span>
            {post.author.verified ? (
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0095f6] text-white">
                <CheckIcon />
              </span>
            ) : null}
          </div>
          <div className="truncate text-xs text-[#737373]">{post.location}</div>
        </div>
        <span className="text-xs text-[#737373]">{post.timeAgo}</span>
        <IconButton label="More options">
          <MoreIcon />
        </IconButton>
      </header>

      <MediaCarousel
        itemKey={itemKey}
        liked={liked}
        post={post}
        setLiked={() => setLiked(true)}
      />

      <section className="px-3 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <IconButton
              label={liked ? "Unlike" : "Like"}
              onClick={() => setLiked(!liked)}
              pressed={liked}
              className={liked ? "text-[#ed4956]" : ""}
            >
              <HeartIcon filled={liked} />
            </IconButton>
            <IconButton label="Comment">
              <MessageIcon />
            </IconButton>
            <IconButton label="Send">
              <SendIcon />
            </IconButton>
          </div>
          <IconButton
            label={saved ? "Unsave" : "Save"}
            onClick={() => setSaved(!saved)}
            pressed={saved}
          >
            <BookmarkIcon filled={saved} />
          </IconButton>
        </div>

        <div className="grid gap-1.5 text-sm leading-5">
          <p className="font-semibold">{formatCount(likeCount)} likes</p>
          <p>
            <span className="font-semibold">{post.author.handle}</span>{" "}
            {post.caption}{" "}
            {post.tags.map((tag) => (
              <span key={`${itemKey}-${tag}`} className="text-[#00376b]">
                #{tag}{" "}
              </span>
            ))}
          </p>
          <p className="text-[#737373]">Liked by {post.likedBy} and others</p>
          <button
            type="button"
            className="w-fit text-left text-[#737373]"
            aria-label={`View ${post.comments} comments`}
          >
            View all {formatCount(post.comments)} comments
          </button>
          <p>
            <span className="font-semibold">{post.likedBy}</span> {post.firstComment}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-[#737373]">
            <span>{post.audio}</span>
            <span>{formatCount(post.shares)} shares</span>
          </div>
        </div>
      </section>
    </article>
  );
}

export default function SnsFeedOne() {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const feedItems = useMemo(
    () =>
      Array.from({ length: visibleCount }, (_, index) => ({
        itemKey: `feed-${index}`,
        post: snsPosts[index % snsPosts.length],
      })),
    [visibleCount],
  );

  const addMoreIfNeeded = useCallback((node: HTMLElement) => {
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;

    if (remaining < 1600) {
      setVisibleCount((count) => count + batchSize);
    }
  }, []);

  return (
    <main
      className="h-dvh overflow-y-auto bg-[#f5f5f5] text-[#111]"
      onScroll={(event) => addMoreIfNeeded(event.currentTarget)}
    >
      <div className="mx-auto min-h-dvh w-full max-w-[470px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
        <section>
          {feedItems.map(({ itemKey, post }) => (
            <FeedPost key={itemKey} itemKey={itemKey} post={post} />
          ))}
        </section>
      </div>
    </main>
  );
}
