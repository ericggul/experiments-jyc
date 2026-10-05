"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./screen.module.css";

type Canvas = {
  height: number;
  width: number;
};

type ColumnMotion = {
  lastInputAt: number;
  target: number;
  velocity: number;
};

type SkatingSurfaceStyle = CSSProperties & Record<"--youtube-five-column-count", string>;

const columnCount = 3;
const columns = Array.from({ length: columnCount }, (_, index) => ({ id: `column-${index}`, index }));
const columnIds = new Set(columns.map((column) => column.id));
const skatingSurfaceStyle: SkatingSurfaceStyle = {
  "--youtube-five-column-count": String(columnCount),
};
const laptopCanvas: Canvas = { width: 1920, height: 1080 };
const phoneCanvas: Canvas = { width: 390, height: 844 };

function frameForViewport(width: number, height: number) {
  const canvas = width < 768 ? phoneCanvas : laptopCanvas;

  return {
    canvas,
    scaleX: width / (canvas.width * columns.length),
    scaleY: height / canvas.height,
  };
}

export function YoutubeFiveScreen() {
  const [frame, setFrame] = useState<ReturnType<typeof frameForViewport>>();
  const activePointerId = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>());
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);
  const lastScrollFrameAt = useRef<number | null>(null);
  const motions = useRef(new Map<string, ColumnMotion>());
  const pointerGestureEndedAt = useRef(0);

  useEffect(() => {
    const resize = () => setFrame(frameForViewport(window.innerWidth, window.innerHeight));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => () => {
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
  }, []);

  if (!frame) {
    return <main className={styles.surface} />;
  }

  const { canvas, scaleX, scaleY } = frame;

  const columnAtPoint = (clientX: number, clientY: number) => {
    const columnId = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-youtube-five-column]")
      ?.dataset.youtubeFiveColumn;
    return columnId && columnIds.has(columnId) ? columnId : null;
  };

  const maxScroll = (columnWindow: Window) => {
    const documentHeight = Math.max(
      columnWindow.document.body.scrollHeight,
      columnWindow.document.documentElement.scrollHeight,
    );
    return Math.max(0, documentHeight - columnWindow.innerHeight);
  };

  const requestScrollFrame = () => {
    if (animationFrame.current !== null) return;
    animationFrame.current = window.requestAnimationFrame((now) => {
      animationFrame.current = null;
      const previousFrame = lastScrollFrameAt.current ?? now;
      const elapsed = Math.min(Math.max(now - previousFrame, 8), 34);
      lastScrollFrameAt.current = now;
      const easing = 1 - Math.exp(-elapsed * 0.035);
      let hasMotion = false;

      for (const [columnId, motion] of motions.current) {
        const columnWindow = frameRefs.current.get(columnId)?.contentWindow;
        if (!columnWindow) continue;

        const limit = maxScroll(columnWindow);
        if (activePointerId.current === null && Math.abs(motion.velocity) > 0.04) {
          motion.target += motion.velocity * (elapsed / 16.667);
          motion.velocity *= Math.pow(0.9, elapsed / 16.667);
        } else if (activePointerId.current === null) {
          motion.velocity = 0;
        }

        motion.target = Math.min(Math.max(motion.target, 0), limit);
        const difference = motion.target - columnWindow.scrollY;
        if (Math.abs(difference) > 0.1) {
          columnWindow.scrollTo(0, columnWindow.scrollY + difference * easing);
        }

        if (Math.abs(difference) > 0.35 || Math.abs(motion.velocity) > 0.04) {
          hasMotion = true;
        }
      }

      if (hasMotion) requestScrollFrame();
      else lastScrollFrameAt.current = null;
    });
  };

  const queueScroll = (columnId: string, pointerDeltaY: number) => {
    const columnWindow = frameRefs.current.get(columnId)?.contentWindow;
    if (!columnWindow || pointerDeltaY === 0) return;

    const now = performance.now();
    const motion = motions.current.get(columnId) ?? {
      lastInputAt: now,
      target: columnWindow.scrollY,
      velocity: 0,
    };
    const sourceDelta = -pointerDeltaY / scaleY;
    const elapsed = Math.min(Math.max(now - motion.lastInputAt, 8), 40);

    motion.target += sourceDelta;
    motion.velocity = motion.velocity * 0.42 + sourceDelta * (16.667 / elapsed) * 0.58;
    motion.lastInputAt = now;
    motions.current.set(columnId, motion);
    requestScrollFrame();
  };

  const reactToPointerSamples = (event: ReactPointerEvent<HTMLDivElement>) => {
    const samples = event.nativeEvent.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event.nativeEvent]) {
      const columnId = columnAtPoint(sample.clientX, sample.clientY);
      const previous = lastPointerPosition.current;
      if (columnId && previous) queueScroll(columnId, sample.clientY - previous.y);
      lastPointerPosition.current = { x: sample.clientX, y: sample.clientY };
    }
  };

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return;
    reactToPointerSamples(event);
    activePointerId.current = null;
    lastPointerPosition.current = null;
    pointerGestureEndedAt.current = Date.now();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    reactToPointerSamples(event);
  };

  const continueGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId === activePointerId.current) reactToPointerSamples(event);
  };

  return (
    <main className={styles.surface}>
      {columns.map(({ id, index }) => (
        <iframe
          className={styles.frame}
          height={canvas.height}
          key={id}
          ref={(node) => {
            if (node) frameRefs.current.set(id, node);
            else frameRefs.current.delete(id);
          }}
          src="/sns/youtube/2"
          style={{
            left: index * canvas.width * scaleX,
            transform: `scale(${scaleX}, ${scaleY})`,
          }}
          title={`YouTube 2 column ${index + 1}`}
          width={canvas.width}
        />
      ))}
      <div
        aria-label="Finger-skate YouTube columns"
        className={styles.skatingSurface}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onLostPointerCapture={(event) => {
          if (event.pointerId === activePointerId.current) {
            activePointerId.current = null;
            lastPointerPosition.current = null;
            pointerGestureEndedAt.current = Date.now();
          }
        }}
        onPointerCancel={(event) => {
          if (event.pointerId === activePointerId.current) {
            activePointerId.current = null;
            lastPointerPosition.current = null;
            pointerGestureEndedAt.current = Date.now();
          }
        }}
        onPointerDown={startGesture}
        onPointerMove={continueGesture}
        onPointerUp={finishGesture}
        style={skatingSurfaceStyle}
      >
        {columns.map(({ id }) => (
          <button
            aria-label={`Scroll YouTube column ${id.replace("column-", "")}`}
            className={styles.skatingColumn}
            data-youtube-five-column={id}
            key={id}
            onClick={(event) => {
              if (event.detail !== 0 && Date.now() - pointerGestureEndedAt.current < 750) return;
              queueScroll(id, -(canvas.height * scaleY) / 2);
            }}
            type="button"
          />
        ))}
      </div>
    </main>
  );
}
