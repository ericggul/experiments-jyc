"use client";

import { useMemo, useState } from "react";
import { Amount, Choice, Section } from "../../foundations/controller/fields";
import { ControlShell, useDisplay } from "../../foundations/controller/shell";
import { useControl } from "../../foundations/controller/use-control";
import { Preview } from "./controller/preview";
import { agents, clampSetting, defaults, links, ranges, sounds, type Settings } from "./model/settings";
import { compose, definition } from "./plan";

const ENDPOINT = "/desktop-collage/hype/1/control";

export default function HypeOne() {
  const { status, busy, error, send } = useControl<Settings>(ENDPOINT, definition);
  const [draft, setDraft] = useState<Settings>(defaults);
  const display = useDisplay(status.display);
  const shape = status.running && status.settings ? status.settings : draft;
  const { arrivals } = useMemo(() => compose(shape, display, ""), [display, shape]);
  const duration = arrivals.length ? arrivals[arrivals.length - 1].at / 1000 : 0;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const amount = (key: keyof typeof ranges) => (raw: string) => {
    const value = clampSetting(key, raw);
    if (value !== undefined) set(key, value);
  };
  const active = status.running || status.moving;

  return (
    <ControlShell
      crumbs={[{ label: "desktop-collage", href: "/desktop-collage" }, { label: "hype", href: "/desktop-collage/hype" }, { label: "1" }]}
      display={display}
      measured={!!status.display}
      preview={<Preview display={display} arrivals={arrivals} limit={shape.limit} progress={status.running || status.moving ? status.progress : 0} />}
    >
      <Section title="Rhythm">
        <Amount id="interval" label="Interval" unit="s" value={draft.interval} range={ranges.interval} onChange={amount("interval")} />
        <Amount id="burst" label="Burst" unit="%" value={draft.burst} range={ranges.burst} onChange={amount("burst")} />
        <Amount id="count" label="Windows" unit="" value={draft.count} range={ranges.count} onChange={amount("count")} />
      </Section>
      <Section title="Windows">
        <Amount id="size" label="Size" unit="%" value={draft.size} range={ranges.size} onChange={amount("size")} />
        <Amount id="limit" label="Kept open" unit="" value={draft.limit} range={ranges.limit} onChange={amount("limit")} />
      </Section>
      <Section title="Material">
        <Amount id="clones" label="Cloned pages" unit="%" value={draft.clones} range={ranges.clones} onChange={amount("clones")} />
        <Choice label="Sound" options={sounds} value={draft.sound} onChange={(value) => set("sound", value)} />
      </Section>
      <Section title="Reader">
        <Choice label="Reads" options={agents} value={draft.agent} names={{ none: "no one", passive: "scrolls", active: "scrolls and writes" }} onChange={(value) => set("agent", value)} />
        <Choice label="Links" options={links} value={draft.links} names={{ follow: "may follow", leave: "leaves alone" }} onChange={(value) => set("links", value)} />
      </Section>
      <Section title="Run">
        <Amount id="seed" label="Pattern" unit="#" value={draft.seed} range={ranges.seed} onChange={amount("seed")} />
        <Choice label="Before a run" options={["clear", "keep"] as const} value={draft.clearFirst ? "clear" : "keep"} names={{ clear: "clear earlier windows", keep: "keep them" }} onChange={(value) => set("clearFirst", value === "clear")} />
      </Section>

      <div className="mt-auto grid gap-1 px-3 pt-4">
        <button
          type="button"
          disabled={busy || !status.enabled}
          onClick={() => void send(active ? "stop" : "start", draft)}
          className="h-11 bg-(--scc-fg) text-[13px] font-semibold text-(--scc-bg) hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--scc-fg) disabled:opacity-30"
        >
          {status.running ? `Stop · ${status.progress} / ${status.total}` : status.moving ? "Stop reading" : `Open ${draft.count} windows over ${Math.round(duration)} s`}
        </button>
        <button type="button" disabled={busy || !status.enabled} onClick={() => void send("clear")} className="h-9 font-mono text-[10px] text-(--scc-fg)/55 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none disabled:opacity-30">
          clear all{status.open ? ` · ${status.open}` : ""}
        </button>
        <p role="status" aria-live="polite" className="min-h-9 pt-1 font-mono text-[10px] leading-relaxed text-(--scc-fg)/55">
          {error || status.message}
        </p>
      </div>
    </ControlShell>
  );
}
