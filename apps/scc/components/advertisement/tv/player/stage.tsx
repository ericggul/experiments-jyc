"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./player.module.css";

export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;

/**
 * The broadcast frame: a 1920×1080 coordinate space, letterboxed and scaled to
 * fit its container. Every layer inside is positioned in source pixels.
 */
export function BroadcastFrame({
  children,
  label,
  className,
  transparent = false,
  fixed = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  /** Clear backgrounds so layers can be captured alone and composited. */
  transparent?: boolean;
  /** Render at 1:1 from the top-left corner, for frame capture. */
  fixed?: boolean;
  onClick?: () => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const fit = () => {
      const { width, height } = element.getBoundingClientRect();
      setScale(Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={styles.viewport} data-transparent={transparent} onClick={onClick}>
      <div
        role="img"
        aria-label={label}
        className={`${styles.frame} ${className ?? ""}`}
        style={
          fixed
            ? { top: 0, left: 0, transform: "none" }
            : { transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? "visible" : "hidden" }
        }
      >
        {transparent ? <style>{"html,body{background:transparent!important}"}</style> : null}
        {children}
      </div>
    </div>
  );
}
