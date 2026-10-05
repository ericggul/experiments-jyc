"use client";

import type { ReactNode } from "react";

// Rows follow the SCC navigation grammar: 12px labels, 10px mono values,
// inverted fill for the chosen option.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3">
      <h2 className="flex h-7 items-center px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-(--scc-fg)/40">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-11 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 px-3 text-[12px]">
      {htmlFor ? <label htmlFor={htmlFor} className="font-medium">{label}</label> : <span className="font-medium">{label}</span>}
      {children}
    </div>
  );
}

export function Choice<T extends string>({ label, options, value, names, onChange }: { label: string; options: readonly T[]; value: T; names?: Partial<Record<T, string>>; onChange: (value: T) => void }) {
  return (
    <Row label={label}>
      <div role="group" aria-label={label} className="flex flex-wrap items-center font-mono text-[10px] text-(--scc-fg)/55">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className="h-7 px-2.5 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none aria-pressed:bg-(--scc-fg) aria-pressed:text-(--scc-bg)"
          >
            {names?.[option] ?? option}
          </button>
        ))}
      </div>
    </Row>
  );
}

export function Amount({ id, label, unit, value, range, onChange }: { id: string; label: string; unit: string; value: number; range: readonly [number, number, number]; onChange: (raw: string) => void }) {
  const [min, max, step] = range;
  return (
    <Row label={label} htmlFor={id}>
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3">
        <input aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="h-5 w-full cursor-pointer accent-(--scc-fg)" />
        <span className="flex items-center gap-1 font-mono text-[10px] text-(--scc-fg)/45">
          <input id={id} type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-full min-w-0 bg-(--scc-fg)/[0.09] px-2 text-right text-[11px] text-(--scc-fg) outline-none focus:bg-(--scc-fg)/[0.13] focus:ring-1 focus:ring-(--scc-fg)/55" />
          {unit}
        </span>
      </div>
    </Row>
  );
}
