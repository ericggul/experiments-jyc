"use client";

import { sites } from "../model/catalogue";

// Which sites the windows may show: none chosen means every site. Real
// sites first, then the cloned services; each with how many pages it has.

export function Sites({ chosen, onChange }: { chosen: string[]; onChange: (sites: string[]) => void }) {
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((site) => site !== id) : [...chosen, id]);
  return (
    <div className="grid gap-1 px-3 text-[12px]">
      <div className="flex min-h-11 items-center justify-between">
        <span className="font-medium">Sites</span>
        <button type="button" aria-pressed={chosen.length === 0} onClick={() => onChange([])} className="h-7 px-2.5 font-mono text-[10px] text-(--scc-fg)/55 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none aria-pressed:bg-(--scc-fg) aria-pressed:text-(--scc-bg)">
          every site
        </button>
      </div>
      <div role="group" aria-label="Sites" className="flex flex-wrap gap-y-0.5 font-mono text-[10px] text-(--scc-fg)/55">
        {sites.map((site) => (
          <button
            key={site.id}
            type="button"
            aria-pressed={chosen.includes(site.id)}
            onClick={() => toggle(site.id)}
            className="h-7 px-2 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none aria-pressed:bg-(--scc-fg) aria-pressed:text-(--scc-bg)"
          >
            {site.name} <span className="opacity-60">{site.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
