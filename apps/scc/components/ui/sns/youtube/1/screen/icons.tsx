import type { SVGProps } from "react";

export type IconName =
  | "arrow-left"
  | "bell"
  | "cast"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "clock"
  | "close"
  | "comment"
  | "compass"
  | "create"
  | "download"
  | "dislike"
  | "filter"
  | "flag"
  | "folder"
  | "fullscreen"
  | "fullscreen-exit"
  | "game"
  | "history"
  | "home"
  | "keyboard"
  | "library"
  | "like"
  | "like-filled"
  | "list"
  | "live"
  | "menu"
  | "mic"
  | "more"
  | "music"
  | "pause"
  | "play"
  | "plus"
  | "queue"
  | "save"
  | "search"
  | "send"
  | "settings"
  | "share"
  | "subscriptions"
  | "theater"
  | "trash"
  | "user"
  | "volume"
  | "volume-muted";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

export function Icon({ name, ...props }: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      {name === "menu" ? <path {...common} d="M4 7h16M4 12h16M4 17h16" /> : null}
      {name === "search" ? (
        <path {...common} d="m20 20-4.35-4.35m2.1-4.9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
      ) : null}
      {name === "cast" ? (
        <>
          <path {...common} d="M4 17.5v-3.25A2.25 2.25 0 0 1 6.25 12H19a2 2 0 0 0 2-2V6.25A2.25 2.25 0 0 0 18.75 4H6.25A2.25 2.25 0 0 0 4 6.25v1" />
          <path {...common} d="M4 19.5v-3.2A3.3 3.3 0 0 1 7.2 19.5M4 14.2a5.8 5.8 0 0 1 5.8 5.8" />
        </>
      ) : null}
      {name === "bell" ? <path {...common} d="M18 10.1c0-3.5-2.15-6-6-6s-6 2.5-6 6c0 5.65-2.1 6.6-2.1 7.55h16.2C20.1 16.7 18 15.75 18 10.1ZM9.55 20.15h4.9" /> : null}
      {name === "home" ? <path {...common} d="m3.8 11.15 8.2-7.05 8.2 7.05v8.3a.95.95 0 0 1-.95.95h-4.7v-5.8h-5.1v5.8h-4.7a.95.95 0 0 1-.95-.95v-8.3Z" /> : null}
      {name === "compass" ? <><circle {...common} cx="12" cy="12" r="8.1" /><path {...common} d="m14.9 9.1-1.65 3.5-3.5 1.65 1.65-3.5 3.5-1.65Z" /></> : null}
      {name === "create" ? <><rect {...common} x="3.5" y="6.2" width="17" height="11.6" rx="2" /><path {...common} d="M12 9.2v5.6m-2.8-2.8h5.6" /></> : null}
      {name === "subscriptions" ? <><rect {...common} x="3.4" y="5.1" width="17.2" height="14.4" rx="2" /><path {...common} d="m10 9 5 3-5 3V9Z" /></> : null}
      {name === "library" ? <><path {...common} d="M6.2 4.2h11.6M6.2 8.2h11.6" /><rect {...common} x="4.2" y="12" width="15.6" height="7.8" rx="1.6" /><path {...common} d="m10 14.4 4 1.5-4 1.5v-3Z" /></> : null}
      {name === "history" ? <><path {...common} d="M4.1 12a7.9 7.9 0 1 0 2.3-5.6L4.1 8.7" /><path {...common} d="M4.1 4.7v4h4M12 7.8V12l3 1.8" /></> : null}
      {name === "clock" ? <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M12 7.5V12l3.5 2" /></> : null}
      {name === "folder" ? <path {...common} d="M3.7 7.6h6l1.85 2H20a.85.85 0 0 1 .85.85v7.7A1.85 1.85 0 0 1 19 20H5a1.85 1.85 0 0 1-1.85-1.85V8.45a.85.85 0 0 1 .55-.85Z" /> : null}
      {name === "music" ? <><path {...common} d="M9 18.5V6.2l8-1.7v11.8" /><circle {...common} cx="6.8" cy="18.2" r="2.2" /><circle {...common} cx="14.8" cy="16.3" r="2.2" /></> : null}
      {name === "game" ? <><path {...common} d="M7.2 8.2h9.6c2.1 0 3.4 1.35 3.8 3.15l.6 2.65c.55 2.45-1.85 4.2-3.9 2.85l-2.05-1.35H8.75L6.7 16.87c-2.05 1.35-4.45-.4-3.9-2.85l.6-2.65c.4-1.8 1.7-3.15 3.8-3.15Z" /><path {...common} d="M7.2 11.7v3.6m-1.8-1.8h3.6M16.8 11.8h.01m1.75 2.1h.01" /></> : null}
      {name === "live" ? <><circle cx="12" cy="12" r="2.3" fill="currentColor" /><path {...common} d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2m9.2-9.2a6.5 6.5 0 0 1 0 9.2M4.9 4.9a10 10 0 0 0 0 14.2m14.2-14.2a10 10 0 0 1 0 14.2" /></> : null}
      {name === "play" ? <path d="m8 5 11 7-11 7V5Z" fill="currentColor" /> : null}
      {name === "pause" ? <path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor" /> : null}
      {name === "volume" ? <><path {...common} d="M4.2 10.1h3.3l4-3.25v10.3l-4-3.25H4.2v-3.8Z" /><path {...common} d="M15.2 9.1a4.15 4.15 0 0 1 0 5.8m2.2-8.05a7.25 7.25 0 0 1 0 10.3" /></> : null}
      {name === "volume-muted" ? <><path {...common} d="M4.2 10.1h3.3l4-3.25v10.3l-4-3.25H4.2v-3.8Z" /><path {...common} d="m16.1 9.6 4 4m0-4-4 4" /></> : null}
      {name === "settings" ? <><circle {...common} cx="12" cy="12" r="2.7" /><path {...common} d="m19.1 13.5.1 1.5-2.1 1.2-1.25-.85a7 7 0 0 1-1.3.75l-.3 1.5h-2.5l-.3-1.5a7 7 0 0 1-1.3-.75l-1.25.85L6.8 15l.1-1.5a7 7 0 0 1 0-1.5L6.8 10l2.1-1.2 1.25.85a7 7 0 0 1 1.3-.75l.3-1.5h2.5l.3 1.5a7 7 0 0 1 1.3.75l1.25-.85 2.1 1.2-.1 1.5a7 7 0 0 1 0 1.5Z" /></> : null}
      {name === "theater" ? <rect {...common} x="3.5" y="5" width="17" height="14" rx="1.2" /> : null}
      {name === "like" ? <path {...common} d="M8.9 19.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6h3.8m0 9.4V10.2l3.2-5.8a1.45 1.45 0 0 1 2.7.95L14.1 10h4.3a2.1 2.1 0 0 1 2 2.7l-1.45 5a2.65 2.65 0 0 1-2.55 1.9H8.9Z" /> : null}
      {name === "dislike" ? <g transform="rotate(180 12 12)"><path {...common} d="M8.9 19.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6h3.8m0 9.4V10.2l3.2-5.8a1.45 1.45 0 0 1 2.7.95L14.1 10h4.3a2.1 2.1 0 0 1 2 2.7l-1.45 5a2.65 2.65 0 0 1-2.55 1.9H8.9Z" /></g> : null}
      {name === "like-filled" ? <path d="M8.9 20H5.1A2.1 2.1 0 0 1 3 17.9v-6.1a2.1 2.1 0 0 1 2.1-2.1h3V20Zm1.7 0v-9.5l3.05-5.54a1.85 1.85 0 0 1 3.45 1.2L16.4 10h2.15a2.6 2.6 0 0 1 2.5 3.32l-1.45 4.94A2.55 2.55 0 0 1 17.15 20H10.6Z" fill="currentColor" /> : null}
      {name === "share" ? <><path {...common} d="M14.5 5.2 20.3 11l-5.8 5.8" /><path {...common} d="M20 11H11a6.5 6.5 0 0 0-6.5 6.5" /></> : null}
      {name === "download" ? <><path {...common} d="M12 4.2v10.1m0 0 3.8-3.8M12 14.3l-3.8-3.8M4.5 19.8h15" /></> : null}
      {name === "save" ? <path {...common} d="M6.2 4.1h11.6v16L12 16.6l-5.8 3.5v-16Z" /> : null}
      {name === "more" ? <path d="M5.4 12h.01M12 12h.01M18.6 12h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.2" /> : null}
      {name === "comment" ? <path {...common} d="M20.4 11.2a7.8 7.8 0 0 1-8.1 7.6 9.2 9.2 0 0 1-3.4-.65L3.6 19.7l1.45-4.8a7.3 7.3 0 0 1-.8-3.7 7.8 7.8 0 0 1 8.1-7.6 7.8 7.8 0 0 1 8.1 7.6Z" /> : null}
      {name === "send" ? <path {...common} d="m21 3-7.2 18-4.1-8.7L1 8.2 21 3Z" /> : null}
      {name === "filter" ? <path {...common} d="M4.2 6.2h15.6M7.4 12h9.2M10.6 17.8h2.8" /> : null}
      {name === "queue" ? <><path {...common} d="M4.2 6.2h10.5M4.2 11.9h10.5M4.2 17.6h7.2" /><path {...common} d="m16 15.2 4 2.4-4 2.4v-4.8Z" fill="currentColor" /></> : null}
      {name === "keyboard" ? <><rect {...common} x="3.6" y="6.7" width="16.8" height="10.6" rx="1.4" /><path {...common} d="M6.6 10.1h.01m2.1 0h.01m2.1 0h.01m2.1 0h.01m2.1 0h.01M8 13.8h8" /></> : null}
      {name === "mic" ? <><rect {...common} x="9" y="3.7" width="6" height="10.1" rx="3" /><path {...common} d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0M12 16.8v3.5m-3.2 0h6.4" /></> : null}
      {name === "user" ? <><circle {...common} cx="12" cy="8.1" r="3.4" /><path {...common} d="M4.8 20c.95-3.35 3.35-5 7.2-5s6.25 1.65 7.2 5" /></> : null}
      {name === "plus" ? <path {...common} d="M12 5v14M5 12h14" /> : null}
      {name === "close" ? <path {...common} d="m5 5 14 14M19 5 5 19" /> : null}
      {name === "arrow-left" ? <path {...common} d="M19 12H5m6-6-6 6 6 6" /> : null}
      {name === "chevron-down" ? <path {...common} d="m6.5 9.2 5.5 5.5 5.5-5.5" /> : null}
      {name === "chevron-right" ? <path {...common} d="m9.2 6.5 5.5 5.5-5.5 5.5" /> : null}
      {name === "check" ? <path {...common} d="m5.2 12.2 4.1 4.1 9.5-9.4" /> : null}
      {name === "trash" ? <><path {...common} d="M5.5 7.4h13M9.3 7.4V5.2h5.4v2.2m-7.7 0 .7 11.1h8.6L17 7.4" /><path {...common} d="M10 10.7v4.8m4 0v-4.8" /></> : null}
      {name === "flag" ? <path {...common} d="M6.2 20V4.2m0 .8h10.2l-1.6 3.3 1.6 3.3H6.2" /> : null}
      {name === "fullscreen" ? <path {...common} d="M8.7 4.5H4.5v4.2m0-4.2 5.3 5.3m5.5-5.3h4.2v4.2m0-4.2-5.3 5.3m5.3 5.5v4.2h-4.2m4.2 0-5.3-5.3m-5.5 5.3H4.5v-4.2m0 4.2 5.3-5.3" /> : null}
      {name === "fullscreen-exit" ? <path {...common} d="M9.8 4.5v5.3H4.5m0 0 4-4m5.7-1.3v5.3h5.3m0 0-4-4M9.8 19.5v-5.3H4.5m0 0 4 4m5.7 1.3v-5.3h5.3m0 0-4 4" /> : null}
    </svg>
  );
}
