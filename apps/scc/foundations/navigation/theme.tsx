"use client";

import { useSyncExternalStore } from "react";
import styles from "./navigation.module.css";

// Colour mode shared by the SCC navigation and control pages that use its
// grammar. The choice persists per browser; "system" follows the OS.

type Theme = "system" | "light" | "dark";

const themeStorageKey = "scc-navigation-theme";
const themeChangeEvent = "scc-navigation-theme-change";

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

export function setTheme(next: "light" | "dark") {
  try {
    window.localStorage.setItem(themeStorageKey, next);
  } catch {
    // Storage may be unavailable; the choice then lasts until reload.
    document
      .querySelectorAll<HTMLElement>("[data-scc-navigation]")
      .forEach((root) => (root.dataset.theme = next));
    return;
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="currentColor">
      <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" />
    </svg>
  );
}

export function useSccTheme() {
  return useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => "system");
}

export function ThemeToggle() {
  return (
    <div
      role="group"
      aria-label="Colour mode"
      className="flex items-center ring-1 ring-(--scc-fg)/25"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        className={`${styles.lightOption} flex h-6 items-center gap-1.5 px-2 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none`}
      >
        <SunIcon />
        light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        className={`${styles.darkOption} flex h-6 items-center gap-1.5 px-2 hover:text-(--scc-fg) focus-visible:text-(--scc-fg) focus-visible:outline-none`}
      >
        <MoonIcon />
        dark
      </button>
    </div>
  );
}
