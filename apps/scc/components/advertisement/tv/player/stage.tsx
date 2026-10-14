"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./player.module.css";

export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;

export type FrameSize = { width: number; height: number };

const FrameSizeContext = createContext<FrameSize>({ width: FRAME_WIDTH, height: FRAME_HEIGHT });

/** The frame's size in source pixels: 1920×1080 unless the frame is fitted by width, when its height follows the container. */
export function useFrameSize() {
  return useContext(FrameSizeContext);
}

/**
 * The broadcast frame: a 1920×1080 coordinate space, letterboxed and scaled to
 * fit its container. Every layer inside is positioned in source pixels.
 * Fitted by width, the frame is 1920 wide and as tall as the container in
 * source pixels, so a spot that lays out against `useFrameSize` fills any cell.
 */
export function BroadcastFrame({
  children,
  label,
  className,
  transparent = false,
  fixed = false,
  fit = "contain",
  onClick,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  /** Clear backgrounds so layers can be captured alone and composited. */
  transparent?: boolean;
  /** Render at 1:1 from the top-left corner, for frame capture. */
  fixed?: boolean;
  /** `contain` letterboxes 16:9; `width` fills the container and lets the frame height follow it. */
  fit?: "contain" | "width";
  onClick?: () => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [size, setSize] = useState<FrameSize>({ width: FRAME_WIDTH, height: FRAME_HEIGHT });

  useEffect(() => {
    const element = outer.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (fit === "width") {
        const next = width / FRAME_WIDTH;
        setScale(next);
        setSize({ width: FRAME_WIDTH, height: next > 0 ? height / next : FRAME_HEIGHT });
      } else {
        setScale(Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);

  const frameStyle = fixed
    ? { top: 0, left: 0, transform: "none" }
    : { transform: `translate(-50%, -50%) scale(${scale})`, visibility: scale ? ("visible" as const) : ("hidden" as const) };

  return (
    <div ref={outer} className={styles.viewport} data-transparent={transparent} onClick={onClick}>
      <div
        role="img"
        aria-label={label}
        className={`${styles.frame} ${className ?? ""}`}
        style={fit === "width" ? { ...frameStyle, height: size.height } : frameStyle}
      >
        {transparent ? <style>{"html,body{background:transparent!important}"}</style> : null}
        <FrameSizeContext.Provider value={size}>{children}</FrameSizeContext.Provider>
      </div>
    </div>
  );
}
