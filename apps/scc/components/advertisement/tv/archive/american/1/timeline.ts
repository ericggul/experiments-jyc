import type { SceneSpec } from "../../stage/timeline";

// Ozempic® "Oh!" (Novo Nordisk, 2018–2020 national cut), five scenes.
// Beat times are seconds inside each scene.
export type OzempicScene = "open" | "product" | "firehouse" | "outdoors" | "finale";

export const OZEMPIC_SCENES: readonly SceneSpec<OzempicScene>[] = [
  { id: "open", duration: 6, enter: { kind: "dissolve", duration: 0.7 } },
  { id: "product", duration: 5, enter: { kind: "cut", duration: 0 } },
  { id: "firehouse", duration: 8, enter: { kind: "cut", duration: 0 } },
  { id: "outdoors", duration: 10, enter: { kind: "cut", duration: 0 } },
  { id: "finale", duration: 9.5, enter: { kind: "wipe", duration: 0.6 } },
];

export const BEATS = {
  open: { pill: [0.5, 5.8], farm: 3.0 },
  product: { letters: [0.15, 1.1], sub: 1.2, pen: [1.5, 2.3], fine: 2.0 },
  firehouse: { pill: [1.0, 4.9], close: 4.9, oh: 5.5 },
  outdoors: { scale: [0, 1.6], farmer: 1.6, oh: 3.1, garden: 5.0, heart: 5.4, heartOh: 7.4 },
  finale: { ohs: [0.3, 0.75, 1.2], sweep: [3.0, 3.9], card: 3.9 },
} as const;

/** Whether the white safety band with the logo sits at the bottom of frame. */
export function bandVisible(scene: OzempicScene) {
  return scene === "firehouse" || scene === "outdoors";
}
