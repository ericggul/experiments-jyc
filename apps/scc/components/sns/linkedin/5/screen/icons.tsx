import type { ReactNode } from "react";

type IconName =
  | "bell"
  | "bookmark"
  | "briefcase"
  | "close"
  | "calendar"
  | "chevron"
  | "comment"
  | "dots"
  | "home"
  | "image"
  | "like"
  | "location"
  | "message"
  | "network"
  | "plus"
  | "repost"
  | "search"
  | "send"
  | "sliders"
  | "smile"
  | "video"
  | "write";

const paths: Record<IconName, ReactNode> = {
  home: <><path d="M3.3 10.3 12 3.5l8.7 6.8v9.2a1 1 0 0 1-1 1h-4.9v-6.4H9.2v6.4H4.3a1 1 0 0 1-1-1v-9.2Z" /><path d="M8.9 20.5v-6.4h6.2v6.4" /></>,
  network: <><circle cx="12" cy="6.5" r="3.1" /><path d="M5 20.5v-1.1c0-3.3 2.9-5.7 7-5.7s7 2.4 7 5.7v1.1M3.4 14.5v-.5c0-2.1 1.4-3.7 3.5-4.2M20.6 14.5v-.5c0-2.1-1.4-3.7-3.5-4.2" /></>,
  briefcase: <><rect x="3.2" y="7.4" width="17.6" height="12.2" rx="1.3" /><path d="M8.4 7.4V5.6c0-1 .8-1.8 1.8-1.8h3.6c1 0 1.8.8 1.8 1.8v1.8M3.2 12.2h17.6M10.1 12.2v2h3.8v-2" /></>,
  message: <><rect x="3.2" y="4.2" width="17.6" height="14.2" rx="1.8" /><path d="m7 18.4-2.6 2.2v-2.2M7.8 9.4h8.4M7.8 13.3h5.4" /></>,
  bell: <><path d="M18.5 16.5H5.5c1.4-1.5 1.9-3 1.9-6.1 0-2.9 2-5 4.6-5s4.6 2.1 4.6 5c0 3.1.5 4.6 1.9 6.1Z" /><path d="M9.5 19.1c.5.8 1.4 1.2 2.5 1.2s2-.4 2.5-1.2M10.1 3.9c.3-.7 1-1.2 1.9-1.2s1.6.5 1.9 1.2" /></>,
  bookmark: <path d="M6.2 3.7h11.6a1 1 0 0 1 1 1v16l-6.8-4.2-6.8 4.2v-16a1 1 0 0 1 1-1Z" />,
  search: <><circle cx="10.3" cy="10.3" r="5.8" /><path d="m14.7 14.7 4.4 4.4" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  dots: <><circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none" /></>,
  chevron: <path d="m7 9 5 5 5-5" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="9" r="1.5" /><path d="m4.8 17 4.4-4.4 3.2 3 2.6-2.5 4 3.9" /></>,
  video: <><rect x="3.5" y="6.5" width="12.5" height="11" rx="1.5" /><path d="m16 10.1 4.5-2.4v8.6L16 13.9" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="1.5" /><path d="M7.5 3.5v4M16.5 3.5v4M4 9.5h16M8 13h.1M12 13h.1M16 13h.1M8 16.2h.1M12 16.2h.1" /></>,
  write: <><path d="m4.5 16.8-.9 3.6 3.6-.9L18.5 8.2l-2.7-2.7L4.5 16.8Z" /><path d="m13.9 7.4 2.7 2.7M4.5 16.8l2.7 2.7" /></>,
  like: <path d="M7.6 20.2H5.2a1.7 1.7 0 0 1-1.7-1.7v-6.2a1.7 1.7 0 0 1 1.7-1.7h2.4m0 9.6V10.6l3.1-6.2c.4-.8 1.3-1.1 2-.7.6.3.9 1 .7 1.7l-1.1 4.1h5.2c1.4 0 2.3 1.3 1.9 2.6l-1.6 6.2c-.3 1.1-1.3 1.9-2.5 1.9H7.6Z" />,
  location: <><path d="M19 10.2c0 4.8-7 10.1-7 10.1S5 15 5 10.2a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10.2" r="2.4" /></>,
  comment: <><path d="M4 5.1h16v11.3H9l-4.7 3.4v-3.4H4V5.1Z" /><path d="M7.4 9.1h9.2M7.4 12.3h5.8" /></>,
  repost: <><path d="M7.2 7.1h9.9l-2.7-2.7M16.8 16.9H6.9l2.7 2.7M17.1 7.1l2.7 2.7-2.7 2.7M6.9 16.9l-2.7-2.7 2.7-2.7" /></>,
  send: <><path d="m3.5 4.1 17 7.9-17 7.9 3-7.9-3-7.9Z" /><path d="M6.5 12h14" /></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="1.7" fill="currentColor" /><circle cx="15" cy="12" r="1.7" fill="currentColor" /><circle cx="7" cy="18" r="1.7" fill="currentColor" /></>,
  smile: <><circle cx="12" cy="12" r="8.5" /><path d="M8.2 14.1c.8 1.3 2.1 2 3.8 2s3-.7 3.8-2M8.6 9.5h.1M15.3 9.5h.1" /></>,
};

export function LinkedinIcon({ className, name, solid = false }: { className?: string; name: IconName; solid?: boolean }) {
  return <svg aria-hidden="true" className={className} fill={solid ? "currentColor" : "none"} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75">{paths[name]}</g></svg>;
}
