"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "@/foundations/navigation/navigation.module.css";
import { ThemeToggle, useSccTheme } from "@/foundations/navigation/theme";
import { surfaceInfo, surfaces, type Display } from "../../foundations/surfaces";
import { Amount, Choice, Section } from "./controller/fields";
import { Preview } from "./controller/preview";
import { useControl } from "./controller/use-control";
import { layoutHeart } from "./model/heart";
import { clampSetting, defaults, fillsFor, orders, ranges, stacksFor, timings, type Settings } from "./model/settings";

const ENDPOINT = "/desktop-collage/primitives/1/control";
const linkTone = "text-(--scc-fg)/55 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none";

const sized = (width: number, height: number): Display => ({ width, height, visible: { x: 0, y: 0, width, height }, scale: 1, measuredAt: 0 });
const serverDisplay = sized(1440, 900);
let screenDisplay: Display | undefined;
const noSubscription = () => () => {};
/** This browser's screen, used only until the Mac's desktop has been measured. */
const readScreen = () => (screenDisplay ??= sized(window.screen.width, window.screen.height));

function clock(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

export default function PrimitivesOne() {
  const theme = useSccTheme();
  const { status, busy, error, send } = useControl(ENDPOINT);
  const [draft, setDraft] = useState<Settings>(defaults);
  const [rehearsal, setRehearsal] = useState<number | null>(null);
  const fallback = useSyncExternalStore(noSubscription, readScreen, () => serverDisplay);
  const display = status.display ?? fallback;
  // While a run is in progress the preview follows the settings it was started with.
  const shape = status.running && status.settings ? status.settings : draft;
  const tiles = useMemo(() => layoutHeart(display.visible, shape), [display, shape]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const amount = (key: keyof typeof ranges) => (raw: string) => {
    const value = clampSetting(key, raw);
    if (value !== undefined) set(key, value);
  };

  // Local rehearsal of the rhythm: the same order and interval, no windows.
  useEffect(() => {
    if (rehearsal === null) return;
    if (rehearsal >= tiles.length) {
      const done = setTimeout(() => setRehearsal(null), 900);
      return () => clearTimeout(done);
    }
    const next = setTimeout(() => setRehearsal(draft.timing === "together" ? tiles.length : rehearsal + 1), rehearsal === 0 ? 250 : draft.interval * 1000);
    return () => clearTimeout(next);
  }, [rehearsal, tiles.length, draft.timing, draft.interval]);

  const shown = status.running ? status.progress : rehearsal ?? tiles.length;
  const measured = status.display ? `measured ${clock(status.display.measuredAt)}` : "not measured · showing this screen";

  return (
    <main data-scc-navigation data-theme={theme === "system" ? undefined : theme} className={`${styles.root} flex min-h-svh flex-col bg-(--scc-bg) text-(--scc-fg) lg:h-svh`}>
      <header className="flex min-h-14 items-center justify-between gap-4 px-4">
        <h1 className="flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold tracking-[-0.02em]">
          <Link href="/" className={linkTone}>SCC</Link>
          <span aria-hidden="true" className="text-(--scc-fg)/25">/</span>
          <Link href="/desktop-collage" className={linkTone}>desktop-collage</Link>
          <span aria-hidden="true" className="text-(--scc-fg)/25">/</span>
          <Link href="/desktop-collage/primitives" className={linkTone}>primitives</Link>
          <span aria-hidden="true" className="text-(--scc-fg)/25">/</span>
          <span>1</span>
        </h1>
        <div className="font-mono text-[10px] text-(--scc-fg)/45"><ThemeToggle /></div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Desktop preview" className="flex min-h-[50svh] min-w-0 flex-col px-4 pb-4">
          <div className="min-h-0 flex-1">
            <Preview display={display} tiles={tiles} shown={shown} settings={shape} />
          </div>
          <p className="flex flex-wrap gap-x-4 pt-3 font-mono text-[10px] text-(--scc-fg)/45">
            <span>{display.width} × {display.height}</span>
            <span>visible {display.visible.width} × {display.visible.height}</span>
            <span>{measured}</span>
          </p>
        </section>

        <aside aria-label="Parameters" className="flex min-h-0 flex-col overflow-y-auto px-1 pb-4 lg:pr-3">
          <Section title="Rhythm">
            <Choice label="Timing" options={timings} value={draft.timing} names={{ sequence: "one by one", together: "all at once" }} onChange={(value) => set("timing", value)} />
            {draft.timing === "sequence" ? <Amount id="interval" label="Interval" unit="s" value={draft.interval} range={ranges.interval} onChange={amount("interval")} /> : null}
            <Choice label="Order" options={orders} value={draft.order} names={{ trace: "trace", mirror: "both sides", shuffle: "shuffle" }} onChange={(value) => set("order", value)} />
            {draft.order === "shuffle" ? <Amount id="seed" label="Pattern" unit="#" value={draft.seed} range={ranges.seed} onChange={amount("seed")} /> : null}
          </Section>
          <Section title="Shape">
            <Amount id="count" label="Windows" unit="" value={draft.count} range={ranges.count} onChange={amount("count")} />
            <Amount id="size" label="Heart size" unit="%" value={draft.size} range={ranges.size} onChange={amount("size")} />
            <Amount id="tile-width" label="Window width" unit="%" value={draft.tileWidth} range={ranges.tileWidth} onChange={amount("tileWidth")} />
            <Amount id="tile-height" label="Window height" unit="%" value={draft.tileHeight} range={ranges.tileHeight} onChange={amount("tileHeight")} />
            <Choice label="In front" options={stacksFor(draft.surface)} value={draft.stack} onChange={(value) => set("stack", value)} />
          </Section>
          <Section title="Material">
            <Choice label="Surface" options={surfaces} value={draft.surface} names={Object.fromEntries(surfaces.map((surface) => [surface, surfaceInfo[surface].label]))} onChange={(value) => setDraft((current) => ({
              ...current,
              surface: value,
              fill: (fillsFor(value) as readonly string[]).includes(current.fill) ? current.fill : "pink",
              stack: (stacksFor(value) as readonly string[]).includes(current.stack) ? current.stack : "newest",
            }))} />
            <Choice label="Fill" options={fillsFor(draft.surface)} value={draft.fill} names={{ pink: "hot pink", red: "red", "pink-red": "pink + red", wikipedia: "random wikipedia" }} onChange={(value) => set("fill", value)} />
            <Choice label="Before a run" options={["clear", "keep"] as const} value={draft.clearFirst ? "clear" : "keep"} names={{ clear: "clear earlier windows", keep: "keep them" }} onChange={(value) => set("clearFirst", value === "clear")} />
          </Section>

          <div className="mt-auto grid gap-1 px-3 pt-4">
            <button
              type="button"
              disabled={busy || !status.enabled}
              onClick={() => void send(status.running ? "stop" : "start", draft)}
              className="h-11 bg-(--scc-fg) text-[13px] font-semibold text-(--scc-bg) hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--scc-fg) disabled:opacity-30"
            >
              {status.running ? `Stop · ${status.progress} / ${status.total}` : `Open ${draft.count} windows`}
            </button>
            <div className="grid grid-cols-2 font-mono text-[10px] text-(--scc-fg)/55">
              <button type="button" disabled={status.running} onClick={() => setRehearsal(0)} className="h-9 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none disabled:opacity-30">
                rehearse here
              </button>
              <button type="button" disabled={busy || !status.enabled} onClick={() => void send("clear")} className="h-9 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none disabled:opacity-30">
                clear all{status.open ? ` · ${status.open}` : ""}
              </button>
            </div>
            <p role="status" aria-live="polite" className="min-h-9 pt-1 font-mono text-[10px] leading-relaxed text-(--scc-fg)/55">
              {error || status.message}
              {status.result && !status.running ? (
                <>
                  <br />
                  {status.result.opened} opened · first → last {(status.result.spreadMs / 1000).toFixed(2)} s
                  {status.result.resized ? ` · ${status.result.resized} resized by the browser` : ""}
                  {status.result.failed ? ` · ${status.result.failed} failed` : ""}
                </>
              ) : null}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
