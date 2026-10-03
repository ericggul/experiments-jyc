/**
 * Contract shared by the day model and the clone screens: every app a phone
 * can show and the views it supports. Names are generic or fictional; no
 * real brand names or logos. The model may only schedule views listed here.
 */
export const catalogue = {
  // System
  lock: { title: "Lock Screen", group: "system", icon: "lock", tint: "#1c1c1e", views: ["lock", "sleep", "always-on", "standby"] },
  alarm: { title: "Clock", group: "system", icon: "alarm", tint: "#1c1c1e", views: ["ringing", "snoozed", "set"] },
  home: { title: "Home Screen", group: "system", icon: "grid", tint: "#1c1c1e", views: ["page", "search"] },
  "screen-time": { title: "Screen Time", group: "system", icon: "hourglass", tint: "#5e5ce6", views: ["weekly-report", "daily"] },
  "system-sheet": { title: "Settings", group: "system", icon: "gear", tint: "#8e8e93", views: ["low-battery", "update"] },
  // Morning and commute
  weather: { title: "Weather", group: "commute", icon: "sun", tint: "#2f7fe0", views: ["today", "hourly"] },
  run: { title: "Pace", group: "commute", icon: "run", tint: "#ff6a1f", views: ["active", "summary"] },
  transit: { title: "Transit", group: "commute", icon: "train", tint: "#1f9d55", views: ["departures", "trip", "delay"] },
  navigation: { title: "Maps", group: "commute", icon: "arrow", tint: "#34aadc", views: ["route-overview", "driving"] },
  "ride-hail": { title: "Ride", group: "commute", icon: "car", tint: "#111111", views: ["requesting", "arriving", "on-trip"] },
  audio: { title: "Music", group: "commute", icon: "note", tint: "#fa2d55", views: ["now-playing", "podcast"] },
  // Work
  "team-chat": { title: "Desk", group: "work", icon: "hash", tint: "#4a154b", views: ["channels", "thread", "huddle", "reconnecting"] },
  meeting: { title: "Room", group: "work", icon: "video", tint: "#2d5be3", views: ["joining", "grid", "speaker"] },
  mail: { title: "Mail", group: "work", icon: "envelope", tint: "#1a82fb", views: ["inbox", "message", "compose"] },
  calendar: { title: "Calendar", group: "work", icon: "calendar", tint: "#ff3b30", views: ["day"] },
  "social-manager": { title: "Queue", group: "work", icon: "chart", tint: "#0f62fe", views: ["scheduler", "analytics", "comments"] },
  courier: { title: "Drop", group: "work", icon: "bag", tint: "#e8402a", views: ["job-offer", "navigating", "earnings"] },
  // Life
  messages: { title: "Messages", group: "life", icon: "bubble", tint: "#30d158", views: ["list", "conversation"] },
  "food-delivery": { title: "Bite", group: "life", icon: "fork", tint: "#ff8a00", views: ["browse", "tracking"] },
  reservation: { title: "Table", group: "life", icon: "plate", tint: "#c8102e", views: ["search", "confirmed"] },
  wallet: { title: "Wallet", group: "life", icon: "card", tint: "#000000", views: ["tap-to-pay", "transactions"] },
  bank: { title: "Ledger", group: "life", icon: "bank", tint: "#0b6e4f", views: ["balance", "transaction-alert"] },
  grocery: { title: "Basket", group: "life", icon: "cart", tint: "#43b02a", views: ["list", "recipe"] },
  school: { title: "Homeroom", group: "life", icon: "school", tint: "#f2a900", views: ["updates"] },
  drift: { title: "Drift", group: "life", icon: "moon", tint: "#3d3b8e", views: ["sounds", "wind-down"] },
  baby: { title: "Little", group: "life", icon: "baby", tint: "#9b7bd8", views: ["tracker", "monitor"] },
  // Feeds
  "short-video": { title: "Loop", group: "feeds", icon: "play", tint: "#111111", views: ["feed", "comments"] },
  "photo-feed": { title: "Frame", group: "feeds", icon: "camera", tint: "#d62976", views: ["feed", "story"] },
  news: { title: "Daily", group: "feeds", icon: "paper", tint: "#e0002a", views: ["front", "article"] },
  shopping: { title: "Cart", group: "feeds", icon: "tag", tint: "#ff9900", views: ["browse", "product", "cart"] },
} as const satisfies Record<string, { title: string; group: AppGroup; icon: string; tint: string; views: readonly string[] }>;

export type AppGroup = "system" | "commute" | "work" | "life" | "feeds";
export type AppId = keyof typeof catalogue;
export type AppView<A extends AppId> = (typeof catalogue)[A]["views"][number];

export const appIds = Object.keys(catalogue) as AppId[];

export const isAppId = (value: string): value is AppId => Object.hasOwn(catalogue, value);

export const hasView = (app: AppId, view: string) => (catalogue[app].views as readonly string[]).includes(view);
