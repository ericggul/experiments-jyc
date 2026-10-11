"use client";

import { useEffect, useRef } from "react";

// What the reader can do inside a cloned page. The page registers its own
// handlers; the reader calls them through the window's DevTools session.

export type HypeApi = {
  /** Puts the caret in the page's composer. */
  focus: () => void;
  /** Appends one typed character to the composer. */
  type: (character: string) => void;
  /** Sends what was typed. */
  submit: () => void;
  /** A named action of the page: `like` on every page. */
  act: (name: string) => void;
};

export function useHypeApi(api: HypeApi) {
  const latest = useRef(api);
  useEffect(() => { latest.current = api; });
  useEffect(() => {
    const target = window as Window & { __hype?: HypeApi };
    target.__hype = {
      focus: () => latest.current.focus(),
      type: (character) => latest.current.type(character),
      submit: () => latest.current.submit(),
      act: (name) => latest.current.act(name),
    };
    return () => { delete target.__hype; };
  }, []);
}

/** The window's title, set after the route's own and kept when the page re-renders. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
    const again = window.setTimeout(() => { document.title = title; }, 800);
    return () => window.clearTimeout(again);
  }, [title]);
}

/** Short counts the way feeds print them. */
export function short(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
