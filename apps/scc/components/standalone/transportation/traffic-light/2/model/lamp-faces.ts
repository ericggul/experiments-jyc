import type { SignalLamp } from "./signal-cycle";

/**
 * What each round lamp shows when lit, in its own colour. `led` is the plain
 * emitter board; an image face redraws a picture in emitters, its brightness
 * carried by their intensity. A new face is a new entry here.
 */
/** A picture and the ellipse (in 0–1 image coordinates, y down) outside which nothing lights. */
export type FaceImage = { url: string; mask: { x: number; y: number; rx: number; ry: number } };

export type LampFace = {
  id: string;
  label: string;
  /** Images for the round lamps, keyed by colour; unlisted lamps keep the LED board. */
  images?: Partial<Record<Exclude<SignalLamp, "arrow">, FaceImage>>;
};

export const LAMP_FACES: readonly LampFace[] = [
  { id: "led", label: "LED" },
  {
    // Official White House portraits (public domain), cropped to the head.
    id: "presidents",
    label: "트럼프·오바마·바이든",
    // Masks enclose head and hair in each crop, leaving out background, collar and suit.
    images: {
      red: { url: "/images/transportation/traffic-light/trump.jpg", mask: { x: 0.48, y: 0.46, rx: 0.37, ry: 0.46 } },
      yellow: { url: "/images/transportation/traffic-light/obama.jpg", mask: { x: 0.5, y: 0.46, rx: 0.34, ry: 0.43 } },
      green: { url: "/images/transportation/traffic-light/biden.jpg", mask: { x: 0.49, y: 0.45, rx: 0.33, ry: 0.45 } },
    },
  },
];
