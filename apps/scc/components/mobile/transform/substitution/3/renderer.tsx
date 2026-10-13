"use client";

import { useLayoutEffect, useRef } from "react";
import type { Look } from "./cell-image";
import { CELL, RAW, UI, cellProperties, collect, refreshFacts, type Facts } from "./collect";
import type { CommandGroup } from "./semantic";

const ROOT = "data-substitution-pixel";
const SCROLL_INTERVAL = 100;

/**
 * Writes every cell into the page's own CSS backgrounds (see `collect.ts`), so nothing has to follow scrolling.
 * The page is re-read in the frame after its DOM, layout or loaded media change, and every 100 ms while it scrolls, for parts
 * coming within a screen of view.
 */
export default function PixelRenderer({ clone, group, look }: { clone: string; group: CommandGroup; look: Look }) {
  // Typeface, frame and theme only change how cells are written; they reuse everything already read from the page.
  const lookRef = useRef(look);
  const rewrite = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    lookRef.current = look;
    if (rewrite.current) {
      document.documentElement.setAttribute(ROOT, look.dark ? "dark" : "replace");
      rewrite.current();
    }
  }, [look]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const facts = new WeakMap<Element, Facts>();
    // Subtrees whose classes or styles changed: their original paint is read again.
    const changed = new Set<Element>();
    const written = new Map<Element, Record<string, string>>();
    let frame = 0;

    const read = () => {
      frame = 0;
      lastRead = performance.now();
      refreshFacts(document.body, facts, changed);
      const paints = collect(document.body, clone, group, facts, lookRef.current);

      const next = new Map<Element, Record<string, string>>();
      for (const [element, paint] of paints) {
        if (!paint.fill && !paint.frame && !paint.borders.length && !paint.layers.length) continue;
        const properties = cellProperties(paint, lookRef.current);
        const before = written.get(element);
        const style = (element as HTMLElement).style;
        for (const name in properties) if (before?.[name] !== properties[name]) style.setProperty(name, properties[name]);
        if (!before) element.setAttribute(CELL, "");
        next.set(element, properties);
      }
      for (const [element, properties] of written) {
        if (next.has(element)) continue;
        for (const name in properties) (element as HTMLElement).style.removeProperty(name);
        element.removeAttribute(CELL);
      }
      written.clear();
      for (const [element, properties] of next) written.set(element, properties);
      // Our own attribute and property writes are not changes of the clone.
      observer.takeRecords();
    };

    const schedule = () => {
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
        scrollTimer = 0;
      }
      if (!frame) frame = window.requestAnimationFrame(read);
    };
    // Scrolling alone changes no cell already written; it only brings parts within a screen of view, so it is read less often.
    let lastRead = -Infinity;
    let scrollTimer = 0;
    const onScroll = () => {
      if (frame || scrollTimer) return;
      const wait = lastRead + SCROLL_INTERVAL - performance.now();
      if (wait <= 0) schedule();
      else scrollTimer = window.setTimeout(() => { scrollTimer = 0; schedule(); }, wait);
    };

    const ours = (node: Node) => Boolean((node instanceof Element ? node : node.parentElement)?.closest(`[${UI}]`));
    const observer = new MutationObserver((mutations) => {
      let relevant = false;
      for (const mutation of mutations) {
        if (ours(mutation.target)) continue;
        if (mutation.type === "attributes") {
          const target = mutation.target as Element;
          if (mutation.attributeName === CELL || mutation.attributeName === RAW) continue;
          changed.add(target);
          // A bar or meter whose inline size changes every frame (a playing video's progress) moves no text, and its cell is
          // its own box; it is re-read with the next change that does need a reading.
          if (mutation.attributeName === "style" && !target.textContent?.trim()) continue;
        }
        relevant = true;
      }
      if (relevant) schedule();
    });

    root.setAttribute(ROOT, lookRef.current.dark ? "dark" : "replace");
    read();
    rewrite.current = read;
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    const onResize = () => {
      // Media queries may restyle anything.
      changed.add(document.body);
      schedule();
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("load", schedule, true);
    document.addEventListener("transitionend", schedule, true);
    document.addEventListener("animationend", schedule, true);
    document.fonts?.ready.then(schedule);

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("load", schedule, true);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("animationend", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      for (const [element, properties] of written) {
        for (const name in properties) (element as HTMLElement).style.removeProperty(name);
        element.removeAttribute(CELL);
      }
      root.removeAttribute(ROOT);
      rewrite.current = null;
    };
  }, [clone, group]);

  return null;
}
