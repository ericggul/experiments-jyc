import type { SVGProps } from "react";

export type YoutubeTwoIcon =
  | "add"
  | "arrow-left"
  | "bell"
  | "bell-off"
  | "cast"
  | "captions"
  | "chevron-down"
  | "close"
  | "comment"
  | "download"
  | "dislike"
  | "fullscreen"
  | "home"
  | "like"
  | "like-filled"
  | "menu"
  | "music"
  | "more"
  | "miniplayer"
  | "mute"
  | "pause"
  | "play"
  | "forward"
  | "rewind"
  | "save"
  | "search"
  | "settings"
  | "share"
  | "shorts"
  | "subscriptions"
  | "user"
  | "volume";

export function YoutubeTwoIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: YoutubeTwoIcon }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.9 };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      {name === "menu" ? <path {...stroke} d="M4 7h16M4 12h16M4 17h16" /> : null}
      {name === "search" ? <path {...stroke} d="m20 20-4.35-4.35m2.1-4.9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /> : null}
      {name === "bell" ? <path {...stroke} d="M18 10.1c0-3.5-2.15-6-6-6s-6 2.5-6 6c0 5.65-2.1 6.6-2.1 7.55h16.2C20.1 16.7 18 15.75 18 10.1ZM9.55 20.15h4.9" /> : null}
      {name === "bell-off" ? <><path {...stroke} d="M18 10.1c0-3.5-2.15-6-6-6a5.9 5.9 0 0 0-3.35 1.03M6.1 8.6c-.1.48-.1.98-.1 1.5 0 5.65-2.1 6.6-2.1 7.55h12.3M9.55 20.15h4.9" /><path {...stroke} d="m4 4 16 16" /></> : null}
      {name === "cast" ? <><path {...stroke} d="M4 17.5v-3.25A2.25 2.25 0 0 1 6.25 12H19a2 2 0 0 0 2-2V6.25A2.25 2.25 0 0 0 18.75 4H6.25A2.25 2.25 0 0 0 4 6.25v1" /><path {...stroke} d="M4 19.5v-3.2A3.3 3.3 0 0 1 7.2 19.5M4 14.2a5.8 5.8 0 0 1 5.8 5.8" /></> : null}
      {name === "captions" ? <><rect {...stroke} x="3.6" y="5.2" width="16.8" height="13.6" rx="1.9" /><path {...stroke} d="M10 10.1c-.5-.45-1.05-.7-1.65-.7-1.35 0-2.35 1.07-2.35 2.6s1 2.6 2.35 2.6c.6 0 1.15-.25 1.65-.7m8-3.8c-.5-.45-1.05-.7-1.65-.7-1.35 0-2.35 1.07-2.35 2.6s1 2.6 2.35 2.6c.6 0 1.15-.25 1.65-.7" /></> : null}
      {name === "chevron-down" ? <path {...stroke} d="m5.5 8.5 6.5 6.5 6.5-6.5" /> : null}
      {name === "home" ? <path {...stroke} d="m3.8 11.15 8.2-7.05 8.2 7.05v8.3a.95.95 0 0 1-.95.95h-4.7v-5.8h-5.1v5.8h-4.7a.95.95 0 0 1-.95-.95v-8.3Z" /> : null}
      {name === "shorts" ? <path {...stroke} d="M9.3 3.8c2.1-1.2 5.1.3 5.1 2.75 0 1.1-.65 2.1-1.65 2.55l2.95 1.7c2.1 1.2 2.1 4.2 0 5.4l-5.1 2.95c-2.1 1.2-4.7-.3-4.7-2.7 0-1.1.6-2.1 1.55-2.6L10.3 12 7.45 10.35A3 3 0 0 1 5.9 7.7c0-2.4 1.3-3.05 3.4-3.9Z" /> : null}
      {name === "subscriptions" ? <><rect {...stroke} x="3.4" y="5.1" width="17.2" height="14.4" rx="2" /><path {...stroke} d="m10 9 5 3-5 3V9Z" /></> : null}
      {name === "user" ? <><circle {...stroke} cx="12" cy="8.1" r="3.4" /><path {...stroke} d="M4.8 20c.95-3.35 3.35-5 7.2-5s6.25 1.65 7.2 5" /></> : null}
      {name === "add" ? <path {...stroke} d="M12 5v14M5 12h14" /> : null}
      {name === "more" ? <path d="M5.4 12h.01M12 12h.01M18.6 12h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.2" /> : null}
      {name === "miniplayer" ? <><rect {...stroke} x="3.5" y="5.1" width="17" height="13.8" rx="1.8" /><path d="M13.4 12.5h5.1v4h-5.1z" fill="currentColor" /></> : null}
      {name === "music" ? <><path {...stroke} d="M9 18.5V6.2l8-1.7v11.8" /><circle {...stroke} cx="6.8" cy="18.2" r="2.2" /><circle {...stroke} cx="14.8" cy="16.3" r="2.2" /></> : null}
      {name === "play" ? <path d="m8 5 11 7-11 7V5Z" fill="currentColor" /> : null}
      {name === "pause" ? <path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor" /> : null}
      {name === "volume" ? <><path {...stroke} d="M4.2 10.1h3.3l4-3.25v10.3l-4-3.25H4.2v-3.8Z" /><path {...stroke} d="M15.2 9.1a4.15 4.15 0 0 1 0 5.8m2.2-8.05a7.25 7.25 0 0 1 0 10.3" /></> : null}
      {name === "mute" ? <><path {...stroke} d="M4.2 10.1h3.3l4-3.25v10.3l-4-3.25H4.2v-3.8Z" /><path {...stroke} d="m16.1 9.6 4 4m0-4-4 4" /></> : null}
      {name === "settings" ? <><circle {...stroke} cx="12" cy="12" r="2.7" /><path {...stroke} d="m19.1 13.5.1 1.5-2.1 1.2-1.25-.85a7 7 0 0 1-1.3.75l-.3 1.5h-2.5l-.3-1.5a7 7 0 0 1-1.3-.75l-1.25.85L6.8 15l.1-1.5a7 7 0 0 1 0-1.5L6.8 10l2.1-1.2 1.25.85a7 7 0 0 1 1.3-.75l.3-1.5h2.5l.3 1.5a7 7 0 0 1 1.3.75l1.25-.85 2.1 1.2-.1 1.5a7 7 0 0 1 0 1.5Z" /></> : null}
      {name === "fullscreen" ? <path {...stroke} d="M8.7 4.5H4.5v4.2m0-4.2 5.3 5.3m5.5-5.3h4.2v4.2m0-4.2-5.3 5.3m5.3 5.5v4.2h-4.2m4.2 0-5.3-5.3m-5.5 5.3H4.5v-4.2m0 4.2 5.3-5.3" /> : null}
      {name === "like" ? <path {...stroke} d="M8.9 19.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6h3.8m0 9.4V10.2l3.2-5.8a1.45 1.45 0 0 1 2.7.95L14.1 10h4.3a2.1 2.1 0 0 1 2 2.7l-1.45 5a2.65 2.65 0 0 1-2.55 1.9H8.9Z" /> : null}
      {name === "like-filled" ? <path d="M8.9 20H5.1A2.1 2.1 0 0 1 3 17.9v-6.1a2.1 2.1 0 0 1 2.1-2.1h3V20Zm1.7 0v-9.5l3.05-5.54a1.85 1.85 0 0 1 3.45 1.2L16.4 10h2.15a2.6 2.6 0 0 1 2.5 3.32l-1.45 4.94A2.55 2.55 0 0 1 17.15 20H10.6Z" fill="currentColor" /> : null}
      {name === "dislike" ? <g transform="rotate(180 12 12)"><path {...stroke} d="M8.9 19.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-6.2a1.6 1.6 0 0 1 1.6-1.6h3.8m0 9.4V10.2l3.2-5.8a1.45 1.45 0 0 1 2.7.95L14.1 10h4.3a2.1 2.1 0 0 1 2 2.7l-1.45 5a2.65 2.65 0 0 1-2.55 1.9H8.9Z" /></g> : null}
      {name === "share" ? <><path {...stroke} d="M14.5 5.2 20.3 11l-5.8 5.8" /><path {...stroke} d="M20 11H11a6.5 6.5 0 0 0-6.5 6.5" /></> : null}
      {name === "download" ? <><path {...stroke} d="M12 4.2v10.1m0 0 3.8-3.8M12 14.3l-3.8-3.8M4.5 19.8h15" /></> : null}
      {name === "save" ? <path {...stroke} d="M6.2 4.1h11.6v16L12 16.6l-5.8 3.5v-16Z" /> : null}
      {name === "comment" ? <path {...stroke} d="M20.4 11.2a7.8 7.8 0 0 1-8.1 7.6 9.2 9.2 0 0 1-3.4-.65L3.6 19.7l1.45-4.8a7.3 7.3 0 0 1-.8-3.7 7.8 7.8 0 0 1 8.1-7.6 7.8 7.8 0 0 1 8.1 7.6Z" /> : null}
      {name === "arrow-left" ? <path {...stroke} d="M19 12H5m6-6-6 6 6 6" /> : null}
      {name === "close" ? <path {...stroke} d="m5 5 14 14M19 5 5 19" /> : null}
      {name === "rewind" ? <><path d="m11 7-6 5 6 5V7Zm7 0-6 5 6 5V7Z" fill="currentColor" /></> : null}
      {name === "forward" ? <><path d="m13 7 6 5-6 5V7ZM6 7l6 5-6 5V7Z" fill="currentColor" /></> : null}
    </svg>
  );
}
