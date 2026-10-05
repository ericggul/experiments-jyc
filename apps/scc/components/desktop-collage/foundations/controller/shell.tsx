"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import styles from "@/foundations/navigation/navigation.module.css";
import { ThemeToggle, useSccTheme } from "@/foundations/navigation/theme";
import type { Display } from "../surfaces";

// The control page frame shared by desktop-collage experiments, in the SCC
// navigation grammar: breadcrumb and colour mode, the measured desktop on the
// left, parameters and actions on the right.

const linkTone = "text-(--scc-fg)/55 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none";

const sized = (width: number, height: number): Display => ({ width, height, visible: { x: 0, y: 0, width, height }, scale: 1, measuredAt: 0 });
const serverDisplay = sized(1440, 900);
let screenDisplay: Display | undefined;
const noSubscription = () => () => {};
const readScreen = () => (screenDisplay ??= sized(window.screen.width, window.screen.height));

/** The Mac's measured desktop, or this browser's screen until it has been measured. */
export function useDisplay(measured: Display | undefined) {
  const fallback = useSyncExternalStore(noSubscription, readScreen, () => serverDisplay);
  return measured ?? fallback;
}

function clock(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

export function ControlShell({ crumbs, display, measured, preview, children }: {
  /** Path segments after SCC; the last one is the current page. */
  crumbs: readonly { label: string; href?: string }[];
  display: Display;
  measured: boolean;
  preview: ReactNode;
  children: ReactNode;
}) {
  const theme = useSccTheme();
  return (
    <main data-scc-navigation data-theme={theme === "system" ? undefined : theme} className={`${styles.root} flex min-h-svh flex-col bg-(--scc-bg) text-(--scc-fg) lg:h-svh`}>
      <header className="flex min-h-14 items-center justify-between gap-4 px-4">
        <h1 className="flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold tracking-[-0.02em]">
          <Link href="/" className={linkTone}>SCC</Link>
          {crumbs.map((crumb) => (
            <span key={crumb.label} className="flex items-center gap-2">
              <span aria-hidden="true" className="text-(--scc-fg)/25">/</span>
              {crumb.href ? <Link href={crumb.href} className={linkTone}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            </span>
          ))}
        </h1>
        <div className="font-mono text-[10px] text-(--scc-fg)/45"><ThemeToggle /></div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Desktop preview" className="flex min-h-[50svh] min-w-0 flex-col px-4 pb-4">
          <div className="min-h-0 flex-1">{preview}</div>
          <p className="flex flex-wrap gap-x-4 pt-3 font-mono text-[10px] text-(--scc-fg)/45">
            <span>{display.width} × {display.height}</span>
            <span>visible {display.visible.width} × {display.visible.height}</span>
            <span>{measured ? `measured ${clock(display.measuredAt)}` : "not measured · showing this screen"}</span>
          </p>
        </section>

        <aside aria-label="Parameters" className="flex min-h-0 flex-col overflow-y-auto px-1 pb-4 lg:pr-3">
          {children}
        </aside>
      </div>
    </main>
  );
}
