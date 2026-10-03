"use client";

import { useEffect, useRef } from "react";
import { edges } from "../model/k6";
import { completeFractalEdges, fractalEdges } from "../model/fractal-k6";
import { createFlux, MAX_PACKETS } from "./flux";
import styles from "../k6.module.css";
import { getK3ForMode } from "../model/fractal-k3";
import type { GraphMode, ConnectionWeights } from "../model/types";
import type { LineStyle } from "../edges/geometry";

const slots = Array.from({ length: MAX_PACKETS }, (_, id) => ({ id: `packet-slot-${id}` }));

export default function Flow({ mode, rate, weights, lineStyle }: { mode: GraphMode; rate: number; weights: ConnectionWeights; lineStyle: LineStyle }) {
  const fieldRef = useRef<SVGGElement>(null);
  const rateRef = useRef(rate);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  const weightsRef = useRef(weights);
  useEffect(() => { weightsRef.current = weights; }, [weights]);

  useEffect(() => {
    const field = fieldRef.current!;
    const pool = Array.from(field.children, (slot) => ({
      packet: slot.children[0],
      clearance: slot.children[0].children[0],
      trail: slot.children[0].children[1],
      receipt: slot.children[1],
      compoundReceipt: slot.children[2],
    }));
    // Randomness starts only after hydration; SSR and first client render are static.
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const k3 = getK3ForMode(mode);
    const graphEdges = k3 ? k3.edges : mode === "fractal" ? fractalEdges
      : mode === "fractal-complete" ? completeFractalEdges : edges;
    let flux = createFlux(graphEdges, seed, mode !== "k6", lineStyle);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let elapsed = 0;
    let previous = 0;
    const interval = Math.ceil(1000 / 24);

    function hide() {
      for (const slot of pool) {
        slot.packet.setAttribute("opacity", "0");
        slot.receipt.setAttribute("opacity", "0");
        slot.compoundReceipt.setAttribute("opacity", "0");
      }
    }

    function draw() {
      const now = performance.now();
      elapsed += Math.min(0.1, (now - previous) / 1000);
      previous = now;
      const packets = flux.advance(elapsed, rateRef.current, weightsRef.current);
      for (let index = 0; index < pool.length; index++) {
        const slot = pool[index];
        const packet = packets[index];
        if (!packet) {
          slot.packet.setAttribute("opacity", "0");
          slot.receipt.setAttribute("opacity", "0");
          slot.compoundReceipt.setAttribute("opacity", "0");
          continue;
        }
        const frame = flux.sample(packet);
        slot.clearance.setAttribute("d", frame.trailPath);
        slot.trail.setAttribute("d", frame.trailPath);
        slot.packet.setAttribute("opacity", frame.visible ? "1" : "0");
        slot.receipt.setAttribute("cx", String(frame.to.x));
        slot.receipt.setAttribute("cy", String(frame.to.y));
        slot.receipt.setAttribute("r", String(frame.receiptRadius));
        slot.receipt.setAttribute("opacity", frame.receiving && !frame.to.receiptPath ? "1" : "0");
        slot.compoundReceipt.setAttribute("d", frame.to.receiptPath ?? "");
        slot.compoundReceipt.setAttribute("opacity", frame.to.receiptPath && frame.receiving ? String(frame.receiptOpacity) : "0");
      }
      timer = window.setTimeout(draw, interval);
    }

    function sync() {
      window.clearTimeout(timer);
      timer = undefined;
      if (preference.matches) {
        elapsed = 0;
        flux = createFlux(graphEdges, seed, mode !== "k6", lineStyle);
        hide();
      } else if (!document.hidden) {
        previous = performance.now();
        timer = window.setTimeout(draw, interval);
      }
    }

    sync();
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      hide();
    };
  }, [mode, lineStyle]);

  return (
    <g ref={fieldRef} className={styles.flow} aria-hidden="true" pointerEvents="none">
      {slots.map(({ id }) => (
        <g key={id}>
          <g opacity="0">
            <path fill="none" stroke="#000" strokeWidth={mode !== "k6" ? 3.6 : 4.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path fill="none" stroke="currentColor" strokeWidth={mode !== "k6" ? 1.8 : 2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
          <circle r="0" fill="currentColor" opacity="0" />
          <path fill="none" stroke="currentColor" strokeWidth="0.85" vectorEffect="non-scaling-stroke" opacity="0" />
        </g>
      ))}
    </g>
  );
}
