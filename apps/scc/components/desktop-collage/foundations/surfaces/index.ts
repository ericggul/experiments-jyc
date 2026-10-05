// What each window surface can do. Pure data, safe to import in the browser.
// Order is preference: the first is the default.

export const surfaces = ['chrome-app', 'terminal', 'bare'] as const;
export type Surface = typeof surfaces[number];

export const surfaceInfo: Record<Surface, {
  label: string;
  /** Approximate chrome height at the top of each window, points. */
  bar: number;
  /** Can show a web page instead of a flat colour. */
  pages: boolean;
  /** Can take any stacking rank; otherwise newest is always in front. */
  stacking: boolean;
}> = {
  'chrome-app': { label: 'chrome app', bar: 28, pages: true, stacking: false },
  terminal: { label: 'terminal', bar: 28, pages: false, stacking: true },
  bare: { label: 'bare', bar: 0, pages: true, stacking: true },
};

export type Display = { width: number; height: number; visible: { x: number; y: number; width: number; height: number }; scale: number; measuredAt: number };
/** `color` is `#rrggbb`; `url` replaces the colour with a page. `rank` 1 = front among this run. */
export type PlanItem = { x: number; y: number; width: number; height: number; rank: number; color: string; url?: string };
export type Plan = { surface: Surface; intervalMs: number; items: PlanItem[] };
export type Outcome = { opened: number; failed: number; spreadMs: number; resized: number };
export type Handlers = { progress: (index: number) => void; done: (outcome: Outcome) => void; failed: (message: string) => void };
