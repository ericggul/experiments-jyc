"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { impacts, institutions } from "./network";
import { LOOP_GAIN, createStress, propagate, recover, shock, spectralRadius, systemDistress } from "./stress";
import { layoutIds, layouts, morph, slides, values, type Layout, type Point } from "./layout";
import type { DebtRankHandle } from "./graph";
import type { TraceHandle } from "./strip";

const BETA = LOOP_GAIN / spectralRadius(institutions.length, impacts);
/** Idiosyncratic hits per second across the system, and their size range. */
const IDIOSYNCRATIC_RATE = 1.4;
const IDIOSYNCRATIC = [0.1, 0.3] as const;
/** Common shocks: seconds between them, and their size range (0.10 alone starts a cascade). */
const COMMON_EVERY = [6, 11] as const;
const COMMON = [0.03, 0.11] as const;
const MORPH_SECONDS = 1.4;
const SAMPLE_SECONDS = 0.1;

const ease = (t: number) => t * t * (3 - 2 * t);
const between = ([low, high]: readonly [number, number]) => low + (high - low) * Math.random();

/**
 * The clock. Shocks arrive continuously and overlap: idiosyncratic hits to
 * random institutions, and every few seconds a common shock to all. Each
 * round, all new distress moves one link onward at once. It also morphs the
 * placement and feeds the system-distress trace. A tapped institution takes an extra hit.
 */
export function useStress(layout: Layout, tempo: number, graph: RefObject<DebtRankHandle | null>, trace: RefObject<TraceHandle | null>) {
  const settings = useRef({ layout, tempo });
  useEffect(() => { settings.current = { layout, tempo }; }, [layout, tempo]);
  const pending = useRef<number[]>([]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = createStress(institutions.length);
    let transfers: Map<string, number> | null = null;
    let phase = 0;
    let untilCommon = between(COMMON_EVERY) / 2;
    let untilSample = 0;
    let commonSinceSample = false;
    let frame = 0;
    let previous = performance.now();

    // Morph from a snapshot of the drawn positions, so a change mid-morph continues smoothly.
    let target = settings.current.layout;
    let snapshot: Point[] = layouts[target];
    let current: Point[] = layouts[target];
    let progress = 1;
    let polarPath = true;
    const guideFor = (layout: Layout) => Object.fromEntries(layoutIds.map((id) => [id, id === layout ? 1 : 0])) as Record<Layout, number>;
    let guideStart = guideFor(target);
    let guideNow = guideStart;
    graph.current?.place(current, guideNow);

    const tick = (now: number) => {
      const seconds = Math.min(now - previous, 250) / 1000;
      previous = now;
      const { layout, tempo } = settings.current;

      if (layout !== target) {
        // Interrupted mid-morph, the snapshot is between panels; slide only if all three are rings.
        polarPath = slides(target, layout) && (progress >= 1 || polarPath);
        snapshot = current;
        guideStart = guideNow;
        target = layout;
        progress = 0;
      }
      if (progress < 1) {
        progress = reducedMotion.matches ? 1 : Math.min(1, progress + seconds / MORPH_SECONDS);
        const t = ease(progress);
        current = morph(snapshot, layouts[target], t, polarPath);
        guideNow = Object.fromEntries(layoutIds.map((id) => [id, guideStart[id] * (1 - t) + (id === target ? t : 0)])) as Record<Layout, number>;
        graph.current?.place(current, guideNow);
      }

      for (const id of pending.current.splice(0)) shock(state, id, IDIOSYNCRATIC[1]);
      // Idiosyncratic hits arrive as a Poisson stream; the common shock on its own schedule.
      if (Math.random() < IDIOSYNCRATIC_RATE * seconds) {
        shock(state, Math.floor(Math.random() * institutions.length), between(IDIOSYNCRATIC));
      }
      untilCommon -= seconds;
      if (untilCommon <= 0) {
        const amount = between(COMMON);
        institutions.forEach(({ id }) => shock(state, id, amount));
        untilCommon = between(COMMON_EVERY);
        commonSinceSample = true;
      }

      phase += seconds * tempo;
      if (phase >= 1) {
        phase %= 1;
        transfers = propagate(state, impacts, BETA);
      }
      recover(state, seconds);

      untilSample -= seconds;
      if (untilSample <= 0) {
        trace.current?.push(systemDistress(state, values), commonSinceSample);
        commonSinceSample = false;
        untilSample += SAMPLE_SECONDS;
      }

      graph.current?.draw(reducedMotion.matches ? null : transfers, phase, state.level, state.defaulted);
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        previous = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [graph, trace]);

  /** A tap adds one more idiosyncratic hit, at the top of the usual range. */
  return useCallback((id: number) => { pending.current.push(id); }, []);
}
