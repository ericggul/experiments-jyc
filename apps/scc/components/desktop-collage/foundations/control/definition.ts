import type { Display, Plan } from '../surfaces/index.ts';

// What an experiment gives the control: pure and browser-safe, so the same
// definition runs in the Next route, the Mac helper and the browser fallback.

/** Where the Mac helper (../../helper) listens: this Mac's loopback, with the repository's local certificate. */
export const HELPER_PORT = 2099;
export const HELPER_ORIGIN = `https://127.0.0.1:${HELPER_PORT}`;

export type Rect = { x: number; y: number; width: number; height: number };

export type Definition<S extends { clearFirst: boolean }> = {
  validate: (input: unknown) => S;
  /** `origin` is where the controlling page came from; windows load its pages. */
  plan: (settings: S, display: Display, origin: string) => Plan;
  /** Keeps moving the opened windows; returns a function that stops it. */
  animate?: (settings: S, plan: Plan, display: Display, move: (index: number, rect: Rect) => void) => (() => void) | null;
};

export const defineControl = <S extends { clearFirst: boolean }>(definition: Definition<S>) => definition;
