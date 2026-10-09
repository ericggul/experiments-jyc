import type { SceneSpec } from "../../stage/timeline";

// 라이나생명 (무)첫날부터암보험(갱신형) 엑스레이편 (2026), compressed from 60 s
// to five scenes. Beat times are seconds inside each scene.
export type LinaScene = "street" | "phone" | "xray" | "clinic" | "call";

export const LINA_SCENES: readonly SceneSpec<LinaScene>[] = [
  { id: "street", duration: 8.5, enter: { kind: "dissolve", duration: 0.8 } },
  { id: "phone", duration: 9.5, enter: { kind: "cut", duration: 0 } },
  { id: "xray", duration: 10, enter: { kind: "cut", duration: 0 } },
  { id: "clinic", duration: 11, enter: { kind: "cut", duration: 0 } },
  { id: "call", duration: 10, enter: { kind: "cut", duration: 0 } },
];

export const BEATS = {
  street: { title: [0.3, 3.2], busStop: 3.2, card: 3.9, subtitle: [4.6, 8.3] },
  phone: { list: [0, 4.2], zoom: [4.2, 5.8], check: 5.8, chart: 7.0 },
  xray: { reveal: 2.2, revealDuration: 1.1, copy2: 3.0, product: 6.2, bar: 6.6, search: 7.6 },
  clinic: { lines: [0.4, 1.2, 2.0], hundred: 4.6, count: [5.6, 6.6], circles: 7.4 },
  call: { copy: 0.3, phone: 1.0, qr: 1.6, legal: 5.4 },
} as const;

/** Whether the persistent top-left "광고방송" number badge is on screen. */
export function badgeVisible(scene: LinaScene, local: number) {
  if (scene === "street") return local >= BEATS.street.busStop;
  if (scene === "call") return local < BEATS.call.legal;
  return true;
}

/** 0 → 1 slide of the bottom call bar; it stays once the product is named. */
export function barProgress(scene: LinaScene, local: number) {
  if (scene === "street" || scene === "phone") return 0;
  if (scene === "xray") return Math.min(1, Math.max(0, (local - BEATS.xray.bar) / 0.45));
  return 1;
}
