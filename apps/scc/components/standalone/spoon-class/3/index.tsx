"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import source from "./source/document.json";
import SourceFrame, { NATIVE_GAME_HEIGHT } from "./source-frame";
import styles from "./spoon-class.module.css";

const RUNNER_KEY_CODES = new Set([32, 38, 40, 13]);

// One game per row, always full width. Seven rows on shorter screens, eight
// on tall ones: a phone held upright shows eight runways, a small phone seven.
const MIN_ROWS = 7;
const MAX_ROWS = 8;
const TARGET_ROW_HEIGHT = 105;

type StackLayout = {
  rows: number;
  frameWidth: number;
  scale: number;
};

type SynchronizedInput = {
  channel: "spoon-class-input";
  type: "keydown" | "keyup";
  keyCode: number;
};

const INITIAL_LAYOUT: StackLayout = { rows: MAX_ROWS, frameWidth: 600, scale: 1 };

function getStackLayout(width: number, height: number): StackLayout {
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.round(height / TARGET_ROW_HEIGHT)));
  const scale = height / rows / NATIVE_GAME_HEIGHT;
  return { rows, frameWidth: Math.ceil(width / scale), scale };
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

export default function SpoonClassThree() {
  const stackRef = useRef<HTMLElement>(null);
  const framesRef = useRef(new Map<string, HTMLIFrameElement>());
  const [layout, setLayout] = useState<StackLayout>(INITIAL_LAYOUT);

  const broadcast = useCallback(
    (type: SynchronizedInput["type"], keyCode: number) => {
      for (const frame of framesRef.current.values()) {
        dispatchToRunner(frame, type, keyCode);
      }
    },
    [],
  );

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;

    const measure = () => {
      const { width, height } = stack.getBoundingClientRect();
      const nextLayout = getStackLayout(width, height);
      setLayout((currentLayout) =>
        currentLayout.rows === nextLayout.rows &&
        currentLayout.frameWidth === nextLayout.frameWidth &&
        currentLayout.scale === nextLayout.scale
          ? currentLayout
          : nextLayout,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stack);
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

  const rows = Array.from({ length: layout.rows }, (_, row) => ({ id: `row-${row}`, row }));

  return (
    <main
      ref={stackRef}
      className={styles.stack}
      style={{ "--spoon-class-rows": layout.rows } as CSSProperties}
    >
      {rows.map(({ id, row }) => (
        <div className={styles.row} key={id}>
          <SourceFrame
            ref={(frame) => {
              if (frame) framesRef.current.set(id, frame);
              else framesRef.current.delete(id);
            }}
            html={source.html}
            width={layout.frameWidth}
            scale={layout.scale}
            title={`spoon-class human life game, row ${row + 1}`}
          />
        </div>
      ))}
    </main>
  );
}
