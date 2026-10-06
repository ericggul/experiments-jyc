"use client";

import { useMemo, useState } from "react";
import { Amount, Choice, Section } from "../../foundations/controller/fields";
import { ControlShell, useDisplay } from "../../foundations/controller/shell";
import { useControl } from "../../foundations/controller/use-control";
import { Preview } from "./controller/preview";
import { arrange } from "./model/arrangement";
import { arrangements, clampSetting, colorAt, defaults, fills, forms, motions, ranges, type Settings } from "./model/settings";

const ENDPOINT = "/desktop-collage/primitives/2/control";

export default function PrimitivesTwo() {
  const { status, busy, error, send } = useControl<Settings>(ENDPOINT);
  const [draft, setDraft] = useState<Settings>(defaults);
  const display = useDisplay(status.display);
  const shape = status.running && status.settings ? status.settings : draft;
  const rects = useMemo(() => arrange(display.visible, shape), [display, shape]);
  const colors = rects.map((_, index) => colorAt(shape.fill, index));

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const amount = (key: keyof typeof ranges) => (raw: string) => {
    const value = clampSetting(key, raw);
    if (value !== undefined) set(key, value);
  };
  const active = status.running || status.moving;

  return (
    <ControlShell
      crumbs={[{ label: "desktop-collage", href: "/desktop-collage" }, { label: "primitives", href: "/desktop-collage/primitives" }, { label: "2" }]}
      display={display}
      measured={!!status.display}
      preview={<Preview display={display} rects={rects} colors={colors} form={shape.form} range={(display.visible.width * shape.range) / 100} />}
    >
      <Section title="Windows">
        <Amount id="count" label="Windows" unit="" value={draft.count} range={ranges.count} onChange={amount("count")} />
        <Choice label="Opening" options={arrangements} value={draft.arrangement} onChange={(value) => set("arrangement", value)} />
        {draft.arrangement === "scatter" ? <Amount id="seed" label="Pattern" unit="#" value={draft.seed} range={ranges.seed} onChange={amount("seed")} /> : null}
        <Amount id="tile-width" label="Width" unit="%" value={draft.tileWidth} range={ranges.tileWidth} onChange={amount("tileWidth")} />
        <Amount id="tile-height" label="Height" unit="%" value={draft.tileHeight} range={ranges.tileHeight} onChange={amount("tileHeight")} />
      </Section>
      <Section title="Field">
        <Choice label="Form" options={forms} value={draft.form} names={{ clouds: "entangled clouds", cubes: "source cubes", network: "evolving network" }} onChange={(value) => set("form", value)} />
        {draft.form === "network" ? <Amount id="turnover" label="Turnover" unit="%" value={draft.turnover} range={ranges.turnover} onChange={amount("turnover")} /> : null}
        {draft.form !== "cubes" ? (
          <>
            <Amount id="range" label="Reach" unit="%" value={draft.range} range={ranges.range} onChange={amount("range")} />
            <Choice label="Colours" options={fills} value={draft.fill} names={{ "green-red": "green + red", "pink-red": "pink + red" }} onChange={(value) => set("fill", value)} />
          </>
        ) : null}
      </Section>
      <Section title="Motion">
        <Choice label="Windows move" options={motions} value={draft.motion} names={{ still: "by hand", drift: "by themselves" }} onChange={(value) => set("motion", value)} />
        {draft.motion === "drift" ? (
          <>
            <Amount id="amplitude" label="Drift" unit="%" value={draft.amplitude} range={ranges.amplitude} onChange={amount("amplitude")} />
            <Amount id="period" label="Cycle" unit="s" value={draft.period} range={ranges.period} onChange={amount("period")} />
          </>
        ) : null}
        <Choice label="Before a run" options={["clear", "keep"] as const} value={draft.clearFirst ? "clear" : "keep"} names={{ clear: "clear earlier windows", keep: "keep them" }} onChange={(value) => set("clearFirst", value === "clear")} />
      </Section>

      <div className="mt-auto grid gap-1 px-3 pt-4">
        <button
          type="button"
          disabled={busy || !status.enabled}
          onClick={() => void send(active ? "stop" : "start", draft)}
          className="h-11 bg-(--scc-fg) text-[13px] font-semibold text-(--scc-bg) hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--scc-fg) disabled:opacity-30"
        >
          {status.running ? `Stop · ${status.progress} / ${status.total}` : status.moving ? "Stop drifting" : `Open ${draft.count} windows`}
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
