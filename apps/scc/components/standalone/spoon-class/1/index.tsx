"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import source from "./source/document.json";
import SourceFrame from "./source-frame";
import styles from "./spoon-class.module.css";
import { useGameAudio } from "../game-audio";

const TILE_HEIGHT = 150;
const MIN_TILE_WIDTH = 500;
const RUNNER_KEY_CODES = new Set([32, 38, 40, 13]);

type WallLayout = {
  columns: number;
  rows: number;
};

type SynchronizedInput = {
  channel: "spoon-class-input";
  type: "keydown" | "keyup";
  keyCode: number;
};

const INITIAL_LAYOUT: WallLayout = { columns: 1, rows: 1 };

function getWallLayout(width: number, height: number): WallLayout {
  return {
    columns: Math.max(1, Math.floor(width / MIN_TILE_WIDTH)),
    rows: Math.max(1, Math.ceil(height / TILE_HEIGHT)),
  };
}

function isSynchronizedInput(value: unknown): value is SynchronizedInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SynchronizedInput>;
  return (
    input.channel === "spoon-class-input" &&
    (input.type === "keydown" || input.type === "keyup") &&
    typeof input.keyCode === "number" &&
    RUNNER_KEY_CODES.has(input.keyCode)
  );
}

function dispatchToRunner(
  frame: HTMLIFrameElement,
  type: SynchronizedInput["type"],
  keyCode: number,
) {
  const frameDocument = frame.contentDocument;
  if (!frameDocument) return;

  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    keyCode: { value: keyCode },
    which: { value: keyCode },
  });
  frameDocument.dispatchEvent(event);
}

export default function SpoonClassOne() {
  const wallRef = useRef<HTMLElement>(null);
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  useGameAudio(framesRef, source.html);
  const [layout, setLayout] = useState<WallLayout>(INITIAL_LAYOUT);

  const broadcast = useCallback(
    (type: SynchronizedInput["type"], keyCode: number) => {
      for (const frame of framesRef.current.values()) {
        dispatchToRunner(frame, type, keyCode);
      }
    },
    [],
  );

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    const measure = () => {
      const { width, height } = wall.getBoundingClientRect();
      const nextLayout = getWallLayout(width, height);
      setLayout((currentLayout) =>
        currentLayout.columns === nextLayout.columns &&
        currentLayout.rows === nextLayout.rows
          ? currentLayout
          : nextLayout,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onHostKey = (event: KeyboardEvent) => {
      if (!event.isTrusted || !RUNNER_KEY_CODES.has(event.keyCode)) return;
      event.preventDefault();
      broadcast(event.type as SynchronizedInput["type"], event.keyCode);
    };

    const onModuleInput = (event: MessageEvent<unknown>) => {
      if (!isSynchronizedInput(event.data)) return;
      const isKnownFrame = [...framesRef.current.values()].some(
        (frame) => frame.contentWindow === event.source,
      );
      if (isKnownFrame) broadcast(event.data.type, event.data.keyCode);
    };

    document.addEventListener("keydown", onHostKey);
    document.addEventListener("keyup", onHostKey);
    window.addEventListener("message", onModuleInput);
    return () => {
      document.removeEventListener("keydown", onHostKey);
      document.removeEventListener("keyup", onHostKey);
      window.removeEventListener("message", onModuleInput);
    };
  }, [broadcast]);

  const modules = Array.from({ length: layout.rows }, (_, row) =>
    Array.from({ length: layout.columns }, (_, column) => ({
      id: `row-${row}-column-${column}`,
      row,
      column,
    })),
  ).flat();

  return (
    <main
      ref={wallRef}
      className={styles.wall}
      style={
        {
          "--spoon-class-columns": layout.columns,
          "--spoon-class-rows": layout.rows,
        } as CSSProperties
      }
    >
      {modules.map((module) => (
        <div className={styles.module} key={module.id}>
          <SourceFrame
            ref={(frame) => {
              if (frame) framesRef.current.set(module.id, frame);
              else framesRef.current.delete(module.id);
            }}
            html={source.html}
            title={`spoon-class Chrome Dino game, row ${module.row + 1}, column ${module.column + 1}`}
          />
        </div>
      ))}
    </main>
  );
}
