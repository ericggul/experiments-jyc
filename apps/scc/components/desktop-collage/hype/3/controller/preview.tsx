"use client";

import type { Display } from "../../../foundations/surfaces";
import type { Arrival } from "../plan";

// The planned run on the measured desktop: each window's rectangle in its
// order, and the arrivals in time, so the stochastic schedule can be read
// before it happens. Cloned pages are filled stronger than real ones; dark
// pages are filled fainter than light ones.

const TITLE_BAR = 28;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const label = (arrival: Arrival) => `${arrival.keyword} · ${arrival.entry.title}`;

export function Preview({ display, arrivals, limit, progress }: { display: Display; arrivals: Arrival[]; limit: number; progress: number }) {
  const total = arrivals.length ? arrivals[arrivals.length - 1].at : 1;
  const shown = arrivals.slice(Math.max(0, arrivals.length - limit));
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <svg viewBox={`0 0 ${display.width} ${display.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${arrivals.length} windows, the last ${shown.length} kept open`} className="min-h-0 w-full flex-1">
        <rect width={display.width} height={display.height} className="fill-(--scc-fg)/[0.06]" />
        <rect x={display.visible.x} y={display.visible.y} width={display.visible.width} height={display.visible.height} className="fill-(--scc-bg)" />
        {shown.map((arrival) => (
          <g key={arrival.index}>
            <rect x={arrival.rect.x} y={arrival.rect.y} width={arrival.rect.width} height={arrival.rect.height} className={arrival.entry.kind === "clone" ? (arrival.dark ? "fill-(--scc-fg)/[0.08]" : "fill-(--scc-fg)/[0.24]") : arrival.dark ? "fill-(--scc-fg)/[0.03]" : "fill-(--scc-fg)/[0.12]"} stroke="var(--scc-fg)" strokeOpacity={arrival.index < progress ? 0.9 : 0.35} vectorEffect="non-scaling-stroke" />
            <rect x={arrival.rect.x} y={arrival.rect.y} width={arrival.rect.width} height={TITLE_BAR} className="fill-(--scc-fg)/[0.12]" />
            <text x={arrival.rect.x + 10} y={arrival.rect.y + 19} fontSize={13} fontFamily="ui-monospace, monospace" className="fill-(--scc-fg)/70">{arrival.index + 1} · {arrival.keyword}</text>
          </g>
        ))}
      </svg>
      <div className="grid gap-1">
        <svg viewBox="0 0 1000 14" preserveAspectRatio="none" role="img" aria-label="arrival times" className="h-3.5 w-full">
          <line x1={0} y1={7} x2={1000} y2={7} stroke="var(--scc-fg)" strokeOpacity={0.2} vectorEffect="non-scaling-stroke" />
          {arrivals.map((arrival) => (
            <line key={arrival.index} x1={(arrival.at / total) * 1000} y1={arrival.entry.kind === "clone" ? 0 : 3} x2={(arrival.at / total) * 1000} y2={arrival.entry.kind === "clone" ? 14 : 11} stroke="var(--scc-fg)" strokeOpacity={arrival.index < progress ? 1 : 0.55} strokeWidth={arrival.entry.kind === "clone" ? 2 : 1} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <ol className="grid grid-cols-2 gap-x-4 font-mono text-[10px] leading-relaxed text-(--scc-fg)/55 lg:grid-cols-3" aria-label="arrivals">
          {arrivals.slice(0, 12).map((arrival) => (
            <li key={arrival.index} className="truncate">
              <span className={arrival.index < progress ? "text-(--scc-fg)" : undefined}>+{seconds(arrival.at)}</span> {label(arrival)}
              <span className="text-(--scc-fg)/35"> · {arrival.entry.kind}{arrival.dark ? " · dark" : ""}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
