"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { nodes, type NodeId, type Panel } from "../model/configurations";
import { SHOCK, createDistress, propagate, quiet, recover, shock } from "../model/distress";
import type { NetworkHandle } from "./network";

/** Seconds of stillness before banks recover and the next outside shock arrives. */
const SETTLE = 1.4;
const SOURCES: NodeId[] = [5, 6];

/**
 * Round clock. Each round moves every bank's new distress one link onward;
 * pulses show the round in flight. When the network is quiet, banks recover
 * and an outside shock arrives at 5 or 6 (the figure's external lenders).
 * A tapped bank is shocked at once. A new panel starts from rest.
 */
export function usePropagation(panel: Panel, omega: number, tempo: number, network: RefObject<NetworkHandle | null>) {
  const settings = useRef({ omega, tempo });
  useEffect(() => { settings.current = { omega, tempo }; }, [omega, tempo]);
  const pending = useRef<NodeId[]>([]);

  useEffect(() => {
    const state = createDistress(nodes.map(({ id }) => id));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let transfers: Map<string, number> | null = null;
    let phase = 1;
    let still = SETTLE;
    let source = 0;
    let frame = 0;
    let previous = performance.now();
    pending.current = [];

    const tick = (now: number) => {
      const seconds = Math.min(now - previous, 250) / 1000;
      previous = now;
      const { omega, tempo } = settings.current;
      for (const id of pending.current.splice(0)) {
        shock(state, id, SHOCK);
        still = 0;
      }
      phase += seconds * tempo;
      if (phase >= 1) {
        phase %= 1;
        transfers = quiet(state) ? null : propagate(state, panel.links, omega);
      }
      if (quiet(state) && !transfers) {
        still += seconds;
        if (still > SETTLE * 0.4) recover(state, seconds);
        if (still > SETTLE && [...state.level.values()].every((level) => level < 0.01)) {
          shock(state, SOURCES[source++ % SOURCES.length], SHOCK);
          still = 0;
        }
      } else {
        still = 0;
      }
      network.current?.draw(reducedMotion.matches ? null : transfers, phase, state.level);
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
  }, [panel, network]);

  return useCallback((id: NodeId) => { pending.current.push(id); }, []);
}
