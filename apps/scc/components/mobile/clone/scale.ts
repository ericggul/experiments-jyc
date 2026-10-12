import { createContext, useContext } from "react";

/**
 * How much a host page scales a clone's phone viewport (`/mobiles/2` draws each 390 px phone smaller or larger).
 * Pointer positions and boxes are measured on screen, so a clone divides them by this to keep gestures in its own CSS pixels.
 */
export const CloneScale = createContext(1);

export const useCloneScale = () => useContext(CloneScale);

/** An element's box in the clone's own CSS pixels. */
export function localRect(element: Element, scale: number) {
  const rect = element.getBoundingClientRect();
  return new DOMRect(rect.x / scale, rect.y / scale, rect.width / scale, rect.height / scale);
}
