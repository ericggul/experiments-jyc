import type { ReactNode } from 'react';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const thumb = 'M8.4 20H5.2A1.7 1.7 0 0 1 3.5 18.3v-6.6A1.7 1.7 0 0 1 5.2 10h3.2m0 10V10l3.6-6.3c.4-.7 1.2-1 1.9-.8 1 .3 1.6 1.3 1.4 2.3L14.6 9h4.2a2.2 2.2 0 0 1 2.1 2.8l-1.7 6.1A2.9 2.9 0 0 1 16.4 20h-8Z';

const paths: Record<string, ReactNode> = {
  home: <path {...line} d="M4 10.4 12 4l8 6.4V20h-5.2v-5.6H9.2V20H4z"/>,
  'home-fill': <path fill="currentColor" d="M3.3 10.1 12 3.2l8.7 6.9V21h-6.5v-6H9.8v6H3.3z"/>,
  shorts: <path {...line} d="M15.8 3.6c1.9 1 2.5 3.4 1.4 5.2l-.9 1.1 1 .6c1.8 1.1 2.3 3.5 1.2 5.3-.4.6-.9 1.1-1.6 1.4l-6.8 3.4c-1.9 1-4.3.3-5.3-1.6-1-1.9-.3-4.2 1.6-5.2l.9-1.1-1-.6c-1.8-1.1-2.4-3.4-1.3-5.2.3-.6.9-1.1 1.5-1.4l6.8-3.4c.8-.4 1.7-.6 2.5-.5ZM10 9.4v5.2l4.4-2.6z"/>,
  'shorts-fill': <path fill="currentColor" fillRule="evenodd" d="M15.8 3.6c1.9 1 2.5 3.4 1.4 5.2l-.9 1.1 1 .6c1.8 1.1 2.3 3.5 1.2 5.3-.4.6-.9 1.1-1.6 1.4l-6.8 3.4c-1.9 1-4.3.3-5.3-1.6-1-1.9-.3-4.2 1.6-5.2l.9-1.1-1-.6c-1.8-1.1-2.4-3.4-1.3-5.2.3-.6.9-1.1 1.5-1.4l6.8-3.4c.8-.4 1.7-.6 2.5-.5ZM10 9.4v5.2l4.4-2.6z"/>,
  subs: <><rect {...line} x="3.5" y="7.5" width="17" height="12.5" rx="2"/><path {...line} d="M6 4.5h12M10.3 10.8v5.9l4.9-2.95z"/></>,
  'subs-fill': <><path fill="currentColor" fillRule="evenodd" d="M5.4 6.8h13.2c1.6 0 2.7 1.2 2.7 2.7v9c0 1.5-1.1 2.7-2.7 2.7H5.4c-1.6 0-2.7-1.2-2.7-2.7v-9c0-1.5 1.1-2.7 2.7-2.7Zm4.6 3.5v6.3l5.3-3.15z"/><path {...line} d="M6 3.8h12"/></>,
  create: <><circle {...line} cx="12" cy="12" r="9.2"/><path {...line} d="M12 7.6v8.8M7.6 12h8.8"/></>,
  cast: <><path {...line} d="M3.5 9V6.5c0-1 .8-1.8 1.8-1.8h13.4c1 0 1.8.8 1.8 1.8v11c0 1-.8 1.8-1.8 1.8h-5.2"/><path {...line} d="M3.5 12.4a7 7 0 0 1 6.9 6.9M3.5 15.8a3.5 3.5 0 0 1 3.4 3.5"/><circle fill="currentColor" cx="3.9" cy="19.1" r=".9"/></>,
  bell: <path {...line} d="M18 15.6V11a6 6 0 0 0-12 0v4.6L4.3 17.8h15.4zM10 20.2a2.2 2.2 0 0 0 4 0"/>,
  'bell-ring': <><path {...line} d="M18 15.6V11a6 6 0 0 0-12 0v4.6L4.3 17.8h15.4zM10 20.2a2.2 2.2 0 0 0 4 0"/><path {...line} d="M3.3 8.5a8.8 8.8 0 0 1 2.4-4.1M20.7 8.5a8.8 8.8 0 0 0-2.4-4.1"/></>,
  'bell-off': <><path {...line} d="M18 15.6V11a6 6 0 0 0-9.4-5M6.2 9.4c-.1.5-.2 1-.2 1.6v4.6l-1.7 2.2h13.4M10 20.2a2.2 2.2 0 0 0 4 0"/><path {...line} d="m4 4 16 16"/></>,
  search: <><circle {...line} cx="10.5" cy="10.5" r="6.2"/><path {...line} d="m15.2 15.2 5.3 5.3"/></>,
  compass: <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/></>,
  kebab: <><circle fill="currentColor" cx="12" cy="5.5" r="1.6"/><circle fill="currentColor" cx="12" cy="12" r="1.6"/><circle fill="currentColor" cx="12" cy="18.5" r="1.6"/></>,
  like: <path {...line} d={thumb}/>,
  'like-fill': <path fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" d={thumb}/>,
  dislike: <g transform="rotate(180 12 12)"><path {...line} d={thumb}/></g>,
  'dislike-fill': <g transform="rotate(180 12 12)"><path fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" d={thumb}/></g>,
  share: <path {...line} d="M14.2 4.6 21 11.3l-6.8 6.6v-3.8c-5 0-8.3 1.5-11 5.3 1-5.3 4.1-9.6 11-10.5z"/>,
  remix: <><path {...line} d="M4 7h11.5a4.5 4.5 0 0 1 0 9H9"/><path {...line} d="m12 4 3 3-3 3M11.5 13l-3 3 3 3"/></>,
  download: <path {...line} d="M12 4v11m0 0 4.4-4.4M12 15l-4.4-4.4M5 19.8h14"/>,
  downloaded: <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="m8.2 12.3 2.5 2.5 5.1-5.3"/></>,
  save: <path {...line} d="M6.2 3.8h11.6v16.6L12 16.4l-5.8 4z"/>,
  'save-fill': <path fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" d="M6.2 3.8h11.6v16.6L12 16.4l-5.8 4z"/>,
  clip: <><circle {...line} cx="6.5" cy="6.5" r="2.7"/><circle {...line} cx="6.5" cy="17.5" r="2.7"/><path {...line} d="M8.6 8.2 20 18M8.6 15.8 20 6"/></>,
  'chevron-down': <path {...line} strokeWidth="2" d="m5.5 9 6.5 6.5L18.5 9"/>,
  'chevron-right': <path {...line} d="m9 5.5 6.5 6.5L9 18.5"/>,
  play: <path fill="currentColor" d="M7.5 4.6v14.8c0 .8.9 1.3 1.6.9l11.8-7.4c.6-.4.6-1.3 0-1.7L9.1 3.7c-.7-.4-1.6.1-1.6.9Z"/>,
  pause: <path fill="currentColor" d="M6.5 4.5h3.6v15H6.5zm7.4 0h3.6v15h-3.6z"/>,
  next: <path fill="currentColor" d="M5.5 5.2v13.6L15 12zM16.3 5.2h2.4v13.6h-2.4z"/>,
  prev: <path fill="currentColor" d="M18.5 5.2v13.6L9 12zM5.3 5.2h2.4v13.6H5.3z"/>,
  replay: <><path {...line} strokeWidth="2" d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1"/><path {...line} strokeWidth="2" d="M6.6 3.5v3.7h3.7"/></>,
  fullscreen: <path {...line} strokeWidth="2" d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>,
  'exit-fullscreen': <path {...line} strokeWidth="2" d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5"/>,
  cc: <><rect {...line} x="3" y="5.5" width="18" height="13" rx="2"/><path {...line} d="M10.4 10.3a2.1 2.1 0 1 0 0 3.4M17 10.3a2.1 2.1 0 1 0 0 3.4"/></>,
  'cc-fill': <path fill="currentColor" fillRule="evenodd" d="M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm4.6 4.1a2.4 2.4 0 1 0 1.5 4.2l-.8-1a1.1 1.1 0 1 1 0-1.7l.8-1a2.4 2.4 0 0 0-1.5-.5Zm6.6 0a2.4 2.4 0 1 0 1.5 4.2l-.8-1a1.1 1.1 0 1 1 0-1.7l.8-1a2.4 2.4 0 0 0-1.5-.5Z"/>,
  settings: <><circle {...line} cx="12" cy="12" r="3.1"/><path {...line} d="M10.3 3.5h3.4l.5 2.4a6.6 6.6 0 0 1 1.7 1l2.3-.8 1.7 3-1.8 1.6a6.7 6.7 0 0 1 0 2l1.8 1.6-1.7 3-2.3-.8a6.6 6.6 0 0 1-1.7 1l-.5 2.4h-3.4l-.5-2.4a6.6 6.6 0 0 1-1.7-1l-2.3.8-1.7-3 1.8-1.6a6.7 6.7 0 0 1 0-2L4.1 9.1l1.7-3 2.3.8a6.6 6.6 0 0 1 1.7-1z"/></>,
  close: <path {...line} strokeWidth="1.9" d="m5.5 5.5 13 13m0-13-13 13"/>,
  back: <path {...line} strokeWidth="1.9" d="M20 12H4.5m6-6.5L4 12l6.5 6.5"/>,
  mic: <><rect {...line} x="9" y="3.5" width="6" height="11" rx="3"/><path {...line} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></>,
  history: <><path {...line} d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8"/><path {...line} d="M3.8 4.5v3.6h3.6M12 7.8V12l3 2"/></>,
  'arrow-up-left': <path {...line} d="M17.5 17.5 7 7m0 0v7.5M7 7h7.5"/>,
  comment: <path {...line} d="M5 4.5h14a1.6 1.6 0 0 1 1.6 1.6v9.5a1.6 1.6 0 0 1-1.6 1.6H9.2L5 21v-3.8a1.6 1.6 0 0 1-1.6-1.6V6.1A1.6 1.6 0 0 1 5 4.5Z"/>,
  'comment-fill': <path fill="currentColor" d="M5 4.5h14a1.6 1.6 0 0 1 1.6 1.6v9.5a1.6 1.6 0 0 1-1.6 1.6H9.2L5 21v-3.8a1.6 1.6 0 0 1-1.6-1.6V6.1A1.6 1.6 0 0 1 5 4.5Z"/>,
  'share-fill': <path fill="currentColor" d="M14.2 4.6 21 11.3l-6.8 6.6v-3.8c-5 0-8.3 1.5-11 5.3 1-5.3 4.1-9.6 11-10.5z"/>,
  camera: <><path {...line} d="M3.5 8.2c0-1 .8-1.8 1.8-1.8h2.4L9.3 4h5.4l1.6 2.4h2.4c1 0 1.8.8 1.8 1.8v9.6c0 1-.8 1.8-1.8 1.8H5.3c-1 0-1.8-.8-1.8-1.8z"/><circle {...line} cx="12" cy="12.8" r="3.6"/></>,
  upload: <path {...line} d="M12 16V4.5m0 0L7.6 8.9M12 4.5l4.4 4.4M5 19.5h14"/>,
  live: <><circle fill="currentColor" cx="12" cy="12" r="2"/><path {...line} d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2m7.2 0a5.1 5.1 0 0 0 0-7.2M5.6 5.6a9 9 0 0 0 0 12.8m12.8 0a9 9 0 0 0 0-12.8"/></>,
  post: <><path {...line} d="M4 20h4l11-11-4-4L4 16z"/><path {...line} d="m13.5 6.5 4 4"/></>,
  check: <path {...line} strokeWidth="2" d="m5 12.5 4.5 4.5L19 7.5"/>,
  playlist: <path {...line} d="M3.5 6.5h11M3.5 11.5h11M3.5 16.5h7M16.5 13v7.5l5-3.75z"/>,
  'playlist-add': <path {...line} d="M3.5 6.5h12M3.5 11.5h12M3.5 16.5h7M18 13v8M14 17h8"/>,
  clock: <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="M12 7v5.3l3.4 2"/></>,
  video: <><rect {...line} x="3.5" y="5.5" width="17" height="13" rx="2"/><path {...line} d="m10 9.2 5 2.8-5 2.8z"/></>,
  help: <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.5"/><circle fill="currentColor" cx="12" cy="16.9" r="1"/></>,
  premium: <><rect {...line} x="3" y="5.5" width="18" height="13" rx="3.5"/><path fill="currentColor" d="m10 9 5 3-5 3z"/></>,
  chart: <path {...line} d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>,
  sort: <path {...line} d="M4 7h16M7 12h10M10 17h4"/>,
  send: <path {...line} d="m4 12 16-7.5-5.5 16-3-6.5zm7.5 2 3-3"/>,
  heart: <path fill="currentColor" d="M12 20.2s-7.6-4.6-7.6-10a4.4 4.4 0 0 1 7.6-3 4.4 4.4 0 0 1 7.6 3c0 5.4-7.6 10-7.6 10Z"/>,
  pin: <path {...line} d="M9 3.5h6l-1 5.3 3.5 3.4v1.6H6.5v-1.6L10 8.8zM12 13.8v6.7"/>,
  flag: <path {...line} d="M5.5 21V4M5.5 4.5h11.5l-2.2 4 2.2 4H5.5"/>,
  block: <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="m5.8 5.8 12.4 12.4"/></>,
  'not-interested': <><circle {...line} cx="12" cy="12" r="8.8"/><path {...line} d="M7.5 12h9"/></>,
  queue: <path {...line} d="M3.5 6.5h11M3.5 11.5h11M3.5 16.5h7M17 12.5h5M19.5 10v5"/>,
  link: <path {...line} d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.2-1.2"/>,
  mail: <><rect {...line} x="3" y="5.5" width="18" height="13" rx="2"/><path {...line} d="m3.5 6.5 8.5 7 8.5-7"/></>,
  message: <path {...line} d="M12 4c4.7 0 8.5 3.1 8.5 7S16.7 18 12 18c-.9 0-1.8-.1-2.6-.3L4.5 20l1.4-3.7C4.4 15 3.5 13.1 3.5 11 3.5 7.1 7.3 4 12 4Z"/>,
  more: <><circle fill="currentColor" cx="5.5" cy="12" r="1.6"/><circle fill="currentColor" cx="12" cy="12" r="1.6"/><circle fill="currentColor" cx="18.5" cy="12" r="1.6"/></>,
  incognito: <><path {...line} d="M3 11h18M6 11l1.6-5.5h8.8L18 11"/><circle {...line} cx="7.5" cy="16" r="2.6"/><circle {...line} cx="16.5" cy="16" r="2.6"/><path {...line} d="M10.1 16h3.8"/></>,
  account: <><circle {...line} cx="12" cy="12" r="8.8"/><circle {...line} cx="12" cy="10" r="3"/><path {...line} d="M6.3 18.4a6.5 6.5 0 0 1 11.4 0"/></>,
  switch: <><circle {...line} cx="9" cy="8" r="3.2"/><path {...line} d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5l3 3-3 3M19 9.5h-4"/></>,
  volume: <><path {...line} d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path {...line} d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.7 7.7 0 0 1 0 11"/></>,
  mute: <><path {...line} d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path {...line} d="m16 9.5 5 5m0-5-5 5"/></>,
  loop: <><path {...line} d="M4 11V9.5A3 3 0 0 1 7 6.5h12.5m-3-3 3 3-3 3M20 13v1.5a3 3 0 0 1-3 3H4.5m3 3-3-3 3-3"/></>,
  speed: <><path {...line} d="M4 17a8 8 0 1 1 16 0"/><path {...line} d="m12 17 4-5"/></>,
  quality: <><path {...line} d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle {...line} cx="16" cy="7" r="2"/><circle {...line} cx="10" cy="17" r="2"/></>,
  lock: <><rect {...line} x="5" y="10.5" width="14" height="10" rx="2"/><path {...line} d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></>,
  trash: <path {...line} d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5"/>,
  verified: <path fill="currentColor" d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm-1.6 13.7-4-4 1.4-1.4 2.6 2.6 5.8-5.8 1.4 1.4z"/>,
  plus: <path {...line} strokeWidth="1.9" d="M12 5v14M5 12h14"/>,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

export function LogoMark() {
  return <svg viewBox="0 0 28 20" aria-hidden="true" focusable="false">
    <path fill="#FF0033" d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z"/>
    <path fill="#fff" d="M11.2 14.3 18.5 10l-7.3-4.3z"/>
  </svg>;
}
