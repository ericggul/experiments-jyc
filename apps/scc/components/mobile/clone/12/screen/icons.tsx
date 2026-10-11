// Glyphs redrawn against TikTok's 2026 App Store frames (feed rail, top bar, bottom nav) and the
// September 2026 newsroom comment-sheet image; see docs/experiments/sns/mobile/12.md.
export type IconName = 'home' | 'friends' | 'inbox' | 'profile' | 'plus' | 'search' | 'live' | 'heart' | 'comment' | 'bookmark' | 'share' | 'note' | 'play' | 'back' | 'close' | 'more' | 'menu' | 'addUser' | 'userCheck' | 'bell' | 'shareOut' | 'grid' | 'lock' | 'arrowUp' | 'image' | 'emoji' | 'at' | 'dislike' | 'chevron' | 'caret' | 'trend' | 'clear' | 'notInterested' | 'speed' | 'message' | 'follower' | 'system' | 'check';

const filledByDefault = new Set<IconName>(['heart', 'comment', 'bookmark', 'share', 'play', 'live']);

export function Icon({ name, filled }: { name: IconName; filled?: boolean }) {
  const fill = filled ?? filledByDefault.has(name);
  const common = { fill: fill ? 'currentColor' : 'none', stroke: fill ? 'none' : 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
    {name === 'home' ? (fill ? <path d="M12 2.6 2.7 10c-.45.36-.7.9-.7 1.47v8.4c0 .9.73 1.63 1.63 1.63H9.3v-6.1h5.4v6.1h5.67c.9 0 1.63-.73 1.63-1.63v-8.4c0-.57-.25-1.1-.7-1.47Z"/> : <path d="M3 11.3 12 4l9 7.3V20a1 1 0 0 1-1 1h-5v-6.2H9V21H4a1 1 0 0 1-1-1Z"/>) :
    name === 'friends' ? <g fill="none" stroke="currentColor"><circle cx="8.6" cy="8" r="3.7"/><path d="M2.2 20.2c.4-3.9 3-6.2 6.4-6.2s6 2.3 6.4 6.2"/><circle cx="17" cy="9.4" r="2.7"/><path d="M16.6 14.4c2.9.1 4.7 2 5.1 4.9"/></g> :
    name === 'inbox' ? (fill ? <path fillRule="evenodd" d="M4.2 3.5h15.6c.94 0 1.7.76 1.7 1.7v11.1c0 .94-.76 1.7-1.7 1.7h-4.9L12 21l-2.9-3H4.2c-.94 0-1.7-.76-1.7-1.7V5.2c0-.94.76-1.7 1.7-1.7ZM8.9 9.6a1 1 0 0 0 0 2h6.2a1 1 0 0 0 0-2Z"/> : <><path d="M4.2 4h15.6c.66 0 1.2.54 1.2 1.2v11.1c0 .66-.54 1.2-1.2 1.2h-5.1L12 20.3l-2.7-2.8H4.2c-.66 0-1.2-.54-1.2-1.2V5.2C3 4.54 3.54 4 4.2 4Z"/><path d="M9 10.6h6"/></>) :
    name === 'profile' ? (fill ? <><circle cx="12" cy="7.8" r="4.6"/><path d="M3.4 21.4c.4-4.6 4-7.6 8.6-7.6s8.2 3 8.6 7.6Z"/></> : <><circle cx="12" cy="7.8" r="4.1"/><path d="M4 21c.5-4.2 3.8-6.9 8-6.9s7.5 2.7 8 6.9"/></>) :
    name === 'plus' ? <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6"/> :
    name === 'search' ? <><circle cx="10.6" cy="10.6" r="7"/><path d="m15.8 15.8 5 5"/></> :
    name === 'live' ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m8.3 2.8 3.7 3 3.7-3"/><rect x="2.6" y="5.8" width="18.8" height="15" rx="3"/><text x="12" y="16.7" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.4" fontWeight="800" fontFamily="inherit">LIVE</text></g> :
    name === 'heart' ? <path d="M12 21.2c-.3 0-.6-.1-.85-.28C7.2 18.1 2 13.9 2 8.9 2 5.9 4.3 3.6 7.1 3.6c2 0 3.7 1.05 4.9 2.8 1.2-1.75 2.9-2.8 4.9-2.8 2.8 0 5.1 2.3 5.1 5.3 0 5-5.2 9.2-9.15 12.02-.25.18-.55.28-.85.28Z"/> :
    name === 'comment' ? <path fillRule="evenodd" d="M12 2.9c5.6 0 10 3.85 10 8.75s-4.4 8.75-10 8.75c-.84 0-1.65-.08-2.43-.24L5.1 22.1c-.5.2-1-.27-.84-.78l1.08-3.6C3.3 16.15 2 14.03 2 11.65 2 6.75 6.4 2.9 12 2.9ZM7.3 10.3a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm4.7 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm4.7 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z"/> :
    name === 'bookmark' ? (fill ? <path d="M6.4 2.6h11.2c.9 0 1.6.7 1.6 1.6v16.9c0 .7-.8 1.1-1.35.7L12 17.4l-5.85 4.4c-.55.4-1.35 0-1.35-.7V4.2c0-.9.7-1.6 1.6-1.6Z"/> : <path d="M6.6 3h10.8c.6 0 1.1.5 1.1 1.1v16.3L12 15.8l-6.5 4.6V4.1C5.5 3.5 6 3 6.6 3Z"/>) :
    name === 'share' ? <path d="M13.3 3.5c0-.6.7-.9 1.15-.5l8.05 7.6c.3.3.3.8 0 1.1l-8.05 7.6c-.45.4-1.15.1-1.15-.5v-3.9c-5.2.1-8.6 1.6-10.8 4.9-.3.4-.95.2-.9-.3.9-6.5 4.9-10.8 11.7-11.6Z"/> :
    name === 'note' ? <><path d="M9 17.5V5.6l11-2.1v11.7"/><circle cx="6.3" cy="17.6" r="2.7"/><circle cx="17.3" cy="15.4" r="2.7"/></> :
    name === 'play' ? <path d="M7.5 4.9v14.2c0 .95 1.05 1.53 1.85 1.02l11.1-7.1a1.2 1.2 0 0 0 0-2.04l-11.1-7.1c-.8-.5-1.85.07-1.85 1.02Z"/> :
    name === 'back' ? <path d="m15 4-8 8 8 8"/> :
    name === 'close' ? <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5"/> :
    name === 'more' ? <g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></g> :
    name === 'menu' ? <path d="M3.5 6h17M3.5 12h17M3.5 18h17"/> :
    name === 'addUser' ? <><circle cx="9.5" cy="8" r="4"/><path d="M2.5 20.5c.4-4 3.3-6.4 7-6.4 1.5 0 2.9.4 4 1.1M18.5 13v7M15 16.5h7"/></> :
    name === 'userCheck' ? <><circle cx="9.5" cy="8" r="4"/><path d="M2.5 20.5c.4-4 3.3-6.4 7-6.4 1.5 0 2.9.4 4 1.1M15 17l2.3 2.3 4.5-4.6"/></> :
    name === 'bell' ? (fill ? <><path d="M12 3a6.4 6.4 0 0 1 6.4 6.4v5.2l1.8 2.6c.3.5 0 1.1-.6 1.1H4.4c-.6 0-.9-.6-.6-1.1l1.8-2.6V9.4A6.4 6.4 0 0 1 12 3Z"/><circle cx="12" cy="20.4" r="1.9"/></> : <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2H4.4Z"/><path d="M10 21h4"/></>) :
    name === 'shareOut' ? <><path d="M12 15V3.5m0 0L7.5 8M12 3.5 16.5 8"/><path d="M5 12.5v7h14v-7"/></> :
    name === 'grid' ? <><path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/></> :
    name === 'lock' ? <><rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9"/></> :
    name === 'arrowUp' ? <path d="M12 19V5m0 0-6 6m6-6 6 6" strokeWidth="2.6"/> :
    name === 'image' ? <><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m4 17.5 5-5 4.2 4.2 2.6-2.6 4.2 4.2"/></> :
    name === 'emoji' ? <><circle cx="12" cy="12" r="8.8"/><path d="M8.3 14.2c.9 1.4 2.2 2.1 3.7 2.1s2.8-.7 3.7-2.1"/><path d="M9 9.6v.6M15 9.6v.6" strokeWidth="2.4"/></> :
    name === 'at' ? <><circle cx="12" cy="12" r="3.6"/><path d="M15.6 9v4.2c0 1.6 1 2.6 2.4 2.6 1.6 0 2.8-1.5 2.8-3.8a8.8 8.8 0 1 0-3.4 7"/></> :
    name === 'dislike' ? <path d="M7.5 4h9.6c.9 0 1.7.6 1.9 1.5l1.4 6.2c.3 1.3-.7 2.5-2 2.5h-4.5l.6 3.4c.2 1.3-.8 2.4-2 2.4L7.5 14V4Zm0 0H4v10h3.5"/> :
    name === 'chevron' ? <path d="m9 5 7 7-7 7"/> :
    name === 'caret' ? <path d="m6.5 9.5 5.5 5.5 5.5-5.5"/> :
    name === 'trend' ? <><path d="m3.5 16.5 6-6 4 4 7-7"/><path d="M15 7.5h5.5V13"/></> :
    name === 'clear' ? <><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 15.5h8"/></> :
    name === 'notInterested' ? <><path d="M12 20.4c-4-2.9-8.6-6.6-8.6-11 0-2.6 2-4.6 4.5-4.6 1.7 0 3.1.9 4.1 2.4 1-1.5 2.4-2.4 4.1-2.4 2.5 0 4.5 2 4.5 4.6 0 4.4-4.6 8.1-8.6 11Z"/><path d="m12.6 7-1.8 4 2.6 1.4-1.6 4"/></> :
    name === 'speed' ? <><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/></> :
    name === 'message' ? <path d="m3 11.2 17.6-7.6c.6-.3 1.2.3 1 .9l-6.6 16.3c-.3.7-1.3.6-1.5-.1L11.6 13 4.1 12.6c-.8 0-1-1.1-.3-1.4ZM11.6 13l5-5"/> :
    name === 'follower' ? <g fill="currentColor" stroke="none"><circle cx="9.5" cy="8" r="3.8"/><path d="M2.6 19.6c.4-3.9 3.2-6.1 6.9-6.1s6.5 2.2 6.9 6.1c0 .4-.3.7-.7.7H3.3c-.4 0-.7-.3-.7-.7Z"/><circle cx="17.4" cy="9" r="2.6"/><path d="M17.2 13.7c2.6.2 4.2 2 4.5 4.6 0 .4-.3.7-.7.7h-2.8c-.2-2-1-3.8-2.3-5 .4-.2.8-.3 1.3-.3Z"/></g> :
    name === 'system' ? <g fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9.2h8M8 12h8M8 14.8h5" stroke="#161823" strokeWidth="1.6" strokeLinecap="round"/></g> :
    <path d="m4 12 5 5L20 6"/>}
  </svg>;
}
