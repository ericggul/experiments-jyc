import type { CSSProperties } from "react";

/**
 * Generic line glyphs drawn on a 24-unit grid. They stand in for system
 * symbols without copying any vendor symbol set. Clones may add local glyphs
 * in their own folder; shared ones belong here.
 */
const paths = {
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v10h-13z",
  alarm: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M4 5l3-2.5M20 5l-3-2.5",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  hourglass: "M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
  cloud: "M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z",
  run: "M14 4.5a1.75 1.75 0 1 0 0-.01M9 21l3-6 3 3v4M7 12l3-4 4 1 3 3h3M12 15l-1.5-5",
  train: "M7 3.5h10a2 2 0 0 1 2 2V15a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5.5a2 2 0 0 1 2-2zM5 11h14M8.5 14.5h.01M15.5 14.5h.01M8 18l-2 3M16 18l2 3",
  arrow: "M4 11.5 20 4l-7.5 16-2-6.5z",
  car: "M5 16.5h14M6 16.5V19M18 16.5V19M4.5 16.5v-4l2-5.5h11l2 5.5v4M4.5 12.5h15M8 14.5h.01M16 14.5h.01",
  note: "M9 18.5V5.5l11-2v12.5M9 18.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  hash: "M9.5 3.5 7.5 20.5M16.5 3.5l-2 17M4 8.5h17M3 15.5h17",
  video: "M3.5 6.5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM16.5 10.5l5-3v9l-5-3",
  envelope: "M3 6h18v12H3zM3 6.5l9 7 9-7",
  calendar: "M4 5.5h16v15H4zM4 10h16M8.5 3v4M15.5 3v4",
  chart: "M4 20V10M10 20V4M16 20v-7M2.5 20.5h19",
  bag: "M5 8h14l-1 13H6zM9 8V6.5a3 3 0 0 1 6 0V8",
  bubble: "M12 4C7 4 3 7.1 3 11c0 2.2 1.3 4.2 3.3 5.5L5.5 20l4-2.2c.8.2 1.6.2 2.5.2 5 0 9-3.1 9-7s-4-7-9-7z",
  fork: "M7 3v7a2 2 0 0 0 4 0V3M9 3v18M16 21V3c-2 1.5-3 4-3 7h3",
  plate: "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19z",
  card: "M2.5 6h19v12h-19zM2.5 10h19M6 14.5h4",
  bank: "M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18",
  cart: "M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4M9.5 19.5a1 1 0 1 0 0-.01M17 19.5a1 1 0 1 0 0-.01",
  school: "M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v5c3 2.5 8 2.5 11 0v-5",
  baby: "M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM12 6c0-2 1-3 2.5-3M9.5 13h.01M14.5 13h.01M10 16.5c1.2.8 2.8.8 4 0",
  play: "M7 4.5v15l12.5-7.5z",
  camera: "M4 7.5h3.5L9 5h6l1.5 2.5H20v12H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  paper: "M5 4h11v16H6a1 1 0 0 1-1-1zM16 8h3v11a1 1 0 0 1-1 1h-2M8 8h5M8 11.5h5M8 15h5",
  tag: "M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5zM8 8.5h.01",
  // Interface glyphs
  chevronLeft: "M15 4.5 7.5 12l7.5 7.5",
  chevronRight: "M9 4.5l7.5 7.5L9 19.5",
  chevronDown: "M4.5 9l7.5 7.5L19.5 9",
  plus: "M12 4v16M4 12h16",
  close: "M5.5 5.5l13 13M18.5 5.5l-13 13",
  search: "M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  heart: "M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z",
  share: "M12 3.5v12M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5",
  send: "M3.5 11.5 20.5 4l-7 16.5-2.5-7z",
  mic: "M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3",
  micOff: "M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-6.9-.8M5.5 11.5a6.5 6.5 0 0 0 11 4.6M12 18v3M3.5 3.5l17 17",
  phone: "M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  house: "M3.5 11 12 4l8.5 7M6 9.5v10.5h12V9.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  pin: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  bell: "M6 17V11a6 6 0 0 1 12 0v6l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
  flashlight: "M8 2.5h8v4l-2 3v12h-4v-12l-2-3zM8 6.5h8",
  check: "M4.5 12.5l5 5 10-11",
  bolt: "M13 2.5 5 13.5h6l-1 8 8-11h-6z",
  compose: "M4 20h4L19.5 8.5l-4-4L4 16zM13.5 6.5l4 4",
  filter: "M4 6h16M7 12h10M10 18h4",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, stroke = 1.8, filled = false, style, className }: {
  name: IconName;
  size?: number;
  stroke?: number;
  filled?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
