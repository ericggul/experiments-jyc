"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import source from "./source/document.json";
import SourceFrame, {
  NATIVE_GAME_HEIGHT,
  NATIVE_GAME_WIDTH,
} from "./source-frame";
import styles from "./spoon-class.module.css";
import { useGameAudio } from "../game-audio";

const RUNNER_KEY_CODES = new Set([32, 38, 40, 13]);

// less dense: tiles fill the width at native height (the original /2 field).
const TILE_HEIGHT = 150;
const MIN_TILE_WIDTH = 500;

// dense: native-size games scaled into a fixed grid (the original /3 wall).
const STANDARD_DENSITY = { columns: 4, rows: 10 };
const MAX_DENSITY = { columns: 6, rows: 15 };
const MIN_READABLE_SCALE = 0.32;
const MAX_DENSITY_MIN_SCALE = 0.5;

type Density = "less" | "dense";
const densities: { id: Density; label: string }[] = [
  { id: "less", label: "less dense" },
  { id: "dense", label: "dense" },
];

type WallLayout = {
  columns: number;
  rows: number;
  // Undefined scale lets each game document fill its tile.
  scale?: number;
};

type SynchronizedInput = {
  channel: "spoon-class-input";
  type: "keydown" | "keyup";
  keyCode: number;
};

const INITIAL_LAYOUT: WallLayout = { columns: 1, rows: 1 };

function getScale(
  width: number,
  height: number,
  columns: number,
  rows: number,
) {
  return Math.min(
    width / columns / NATIVE_GAME_WIDTH,
    height / rows / NATIVE_GAME_HEIGHT,
  );
}

function getLessDenseLayout(width: number, height: number): WallLayout {
  return {
    columns: Math.max(1, Math.floor(width / MIN_TILE_WIDTH)),
    rows: Math.max(1, Math.ceil(height / TILE_HEIGHT)),
  };
}

function getDenseLayout(width: number, height: number): WallLayout {
  const maximumScale = getScale(
    width,
    height,
    MAX_DENSITY.columns,
    MAX_DENSITY.rows,
  );
  if (maximumScale >= MAX_DENSITY_MIN_SCALE) {
    return { ...MAX_DENSITY, scale: maximumScale };
  }

  const standardScale = getScale(
    width,
    height,
    STANDARD_DENSITY.columns,
    STANDARD_DENSITY.rows,
  );
  if (standardScale >= MIN_READABLE_SCALE) {
    return { ...STANDARD_DENSITY, scale: standardScale };
  }

  // Small viewports retain the same native game rendering, but reduce the
  // count before the pixels would become unreadable.
  const columns = Math.max(
    1,
    Math.min(
      STANDARD_DENSITY.columns,
      Math.floor(width / (NATIVE_GAME_WIDTH * MIN_READABLE_SCALE)),
    ),
  );
  const rows = Math.max(
    1,
    Math.min(
      STANDARD_DENSITY.rows,
      Math.floor(height / (NATIVE_GAME_HEIGHT * MIN_READABLE_SCALE)),
    ),
  );
  return { columns, rows, scale: getScale(width, height, columns, rows) };
}

function getWallLayout(density: Density, width: number, height: number) {
  return density === "dense"
    ? getDenseLayout(width, height)
    : getLessDenseLayout(width, height);
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

export default function SpoonClassTwo() {
  const wallRef = useRef<HTMLElement>(null);
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  useGameAudio(framesRef, source.html);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [density, setDensity] = useState<Density>("less");
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
      const nextLayout = getWallLayout(density, width, height);
      setLayout((currentLayout) =>
        currentLayout.columns === nextLayout.columns &&
        currentLayout.rows === nextLayout.rows &&
        currentLayout.scale === nextLayout.scale
          ? currentLayout
          : nextLayout,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    return () => observer.disconnect();
  }, [density]);

  useEffect(() => {
    const onHostKey = (event: KeyboardEvent) => {
      if (!event.isTrusted || !RUNNER_KEY_CODES.has(event.keyCode)) return;
      // Also keeps Space/Enter from re-pressing a focused option button.
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

  // Each density starts a fresh set of games at its own tile geometry.
  const modules = Array.from({ length: layout.rows }, (_, row) =>
    Array.from({ length: layout.columns }, (_, column) => ({
      id: `${density}-row-${row}-column-${column}`,
      row,
      column,
    })),
  ).flat();

  return (
    <>
      <main
        ref={wallRef}
        className={styles.wall}
        data-density={density}
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
              scale={layout.scale}
              title={`spoon-class human life game, row ${module.row + 1}, column ${module.column + 1}`}
            />
          </div>
        ))}
      </main>
      <div className={styles.controls}>
        {optionsOpen &&
          densities.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={styles.control}
              aria-pressed={density === id}
              onClick={(event) => {
                // Keyboard play goes back to the wall instead of this button.
                event.currentTarget.blur();
                setDensity(id);
              }}
            >
              {label}
            </button>
          ))}
        <button
          type="button"
          className={styles.control}
          aria-expanded={optionsOpen}
          onClick={(event) => {
            event.currentTarget.blur();
            setOptionsOpen((value) => !value);
          }}
        >
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
    </>
  );
}
