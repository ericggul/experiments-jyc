"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { fitLines } from "./fit";
import styles from "./paper.module.css";
import { SHEET_HEIGHT, SHEET_WIDTH } from "./types";

const FACES = ["400", "700", "800"].map((weight) => ({ weight, variable: "--suneung-myeongjo" }))
  .concat(["400", "500", "700", "900"].map((weight) => ({ weight, variable: "--suneung-gothic" })))
  .concat([
    { weight: "400", variable: "--suneung-old-hangul" },
    { weight: "400", variable: "--suneung-equation" },
    { weight: "italic 400", variable: "--suneung-equation" },
    { weight: "400", variable: "--suneung-equation-symbols" },
  ]);

/** Scales each sheet to fit inside one screen and fits their lines once the fonts are in. */
export function PaperFitter({ className, children }: { className: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [fitted, setFitted] = useState(false);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const scale = () =>
      element.style.setProperty("--k", String(Math.min(element.clientWidth / SHEET_WIDTH, element.clientHeight / SHEET_HEIGHT)));
    scale();
    const resize = new ResizeObserver(scale);
    resize.observe(element);

    // A wheel or trackpad gesture turns exactly one page; touch swipes use scroll snap.
    let turning = false;
    let quietTimer = 0;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => (turning = false), 180);
      if (turning || Math.abs(event.deltaY) < 2) return;
      turning = true;
      const page = Math.round(element.scrollTop / element.clientHeight) + Math.sign(event.deltaY);
      element.scrollTo({ top: page * element.clientHeight, behavior: "smooth" });
    };
    element.addEventListener("wheel", wheel, { passive: false });

    let cancelled = false;
    const computed = getComputedStyle(element);
    const loads = FACES.map(({ weight, variable }) =>
      document.fonts.load(`${weight} 16px ${computed.getPropertyValue(variable)}`, "가A1①\u1100\u119e∫").catch(() => []),
    );
    Promise.all(loads).then(() => {
      if (cancelled) return;
      fitLines(element);
      setFitted(true);
    });
    return () => {
      cancelled = true;
      resize.disconnect();
      element.removeEventListener("wheel", wheel);
      window.clearTimeout(quietTimer);
    };
  }, []);

  return (
    <div ref={root} lang="ko" className={`${styles.paper} ${className}`} data-fitted={fitted}>
      {children}
    </div>
  );
}
