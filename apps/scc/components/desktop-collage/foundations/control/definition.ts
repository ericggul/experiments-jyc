import type { Display, Plan, PlanItem } from '../surfaces/index.ts';

// What an experiment gives the control: pure and browser-safe, so the same
// definition runs in the Next route, the Mac helper and the browser fallback.

/** Where the Mac helper (../../helper) listens: this Mac's loopback, with the repository's local certificate. */
export const HELPER_PORT = 2099;
export const HELPER_ORIGIN = `https://127.0.0.1:${HELPER_PORT}`;

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * What an experiment can keep doing with its windows once they are open.
 * A member is absent where the surface cannot do it; browser pop-ups, for
 * instance, can only be read on this page's own origin.
 */
export type Acting = {
  /** When window `index` appeared and was placed (ms epoch); undefined before that and once it is closed. */
  opened?: (index: number) => number | undefined;
  /** Runs an expression in the window's page and returns its value. */
  evaluate?: (index: number, expression: string) => Promise<unknown>;
  scroll?: (index: number, dy: number) => void;
  /** Clicks at a point in the window's page, in CSS pixels from its top-left. */
  click?: (index: number, x: number, y: number) => void;
  close?: (index: number) => void;
  /** Opens one more window now; returns its index. */
  open?: (item: PlanItem) => number;
};

export type Definition<S extends { clearFirst: boolean }> = {
  validate: (input: unknown) => S;
  /** `origin` is where the controlling page came from; windows load its pages. */
  plan: (settings: S, display: Display, origin: string) => Plan;
  /** Keeps acting on the opened windows (moving, reading, closing, opening more); returns a function that stops it. */
  animate?: (settings: S, plan: Plan, display: Display, move: (index: number, rect: Rect) => void, acting: Acting) => (() => void) | null;
};

export const defineControl = <S extends { clearFirst: boolean }>(definition: Definition<S>) => definition;
