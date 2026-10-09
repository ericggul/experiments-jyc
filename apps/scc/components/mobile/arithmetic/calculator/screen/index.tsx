"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { clearLabel, display, initialCalculatorState, press, type Key, type Operator } from "../model/calculator";
import { KeyGlyph, SnsGlyph, type GlyphName } from "./glyphs";
import styles from "./calculator.module.css";

type Tone = "function" | "digit" | "operator";
type KeySpec = { id: string; tone: Tone; key: Key; label: string; glyph?: GlyphName; holdClears?: boolean };

const digit = (value: string): KeySpec => ({ id: `digit-${value}`, tone: "digit", key: { type: "digit", digit: value }, label: value });
const operator = (value: Operator, label: string): KeySpec => ({ id: `operator-${label}`, tone: "operator", key: { type: "operator", operator: value }, label });

// Layout of the iOS 27 basic keypad, top to bottom.
const keypad: KeySpec[] = [
  { id: "delete", tone: "function", key: { type: "delete" }, label: "Delete", glyph: "delete", holdClears: true },
  { id: "clear", tone: "function", key: { type: "clear" }, label: "Clear", holdClears: true },
  { id: "percent", tone: "function", key: { type: "percent" }, label: "Percent", glyph: "percent" },
  operator("÷", "divide"),
  digit("7"), digit("8"), digit("9"), operator("×", "multiply"),
  digit("4"), digit("5"), digit("6"), operator("−", "subtract"),
  digit("1"), digit("2"), digit("3"), operator("+", "add"),
  { id: "negate", tone: "digit", key: { type: "negate" }, label: "Negate", glyph: "negate" },
  digit("0"),
  { id: "decimal", tone: "digit", key: { type: "decimal" }, label: "Decimal", },
  { id: "equals", tone: "operator", key: { type: "equals" }, label: "Equals", glyph: "=" },
];

const keyboard: Record<string, Key> = {
  "+": { type: "operator", operator: "+" },
  "-": { type: "operator", operator: "−" },
  "*": { type: "operator", operator: "×" },
  x: { type: "operator", operator: "×" },
  "/": { type: "operator", operator: "÷" },
  "=": { type: "equals" },
  Enter: { type: "equals" },
  "%": { type: "percent" },
  ".": { type: "decimal" },
  ",": { type: "decimal" },
  Backspace: { type: "delete" },
  Escape: { type: "allClear" },
};

const HOLD_MS = 500;

const isOperator = (value: string): value is Operator => value === "÷" || value === "×" || value === "−" || value === "+";

// ÷ × − + are drawn as Instagram's like, comment, repost and share; negatives and exponents use "-".
function DisplayText({ text }: { text: string }) {
  return text.split(/([÷×−+])/).map((part, index) =>
    isOperator(part) ? (
      <span key={index} className={styles.inlineGlyph}><SnsGlyph operator={part} /></span>
    ) : (
      part
    ),
  );
}

// Shrinks a right-aligned line until it fits its column, as the iOS display does for long input.
function useFittedText(text: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const line = ref.current;
    if (!line) return;
    const fit = () => {
      line.style.removeProperty("font-size");
      const available = line.clientWidth;
      const needed = line.scrollWidth;
      if (needed > available) {
        const base = parseFloat(getComputedStyle(line).fontSize);
        line.style.fontSize = `${(base * available) / needed}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(line);
    return () => observer.disconnect();
  }, [text]);
  return ref;
}

export default function Calculator() {
  const [state, dispatch] = useReducer(press, initialCalculatorState);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const heldThrough = useRef(false);
  const { expression, main } = display(state);
  const mainRef = useFittedText(main);
  const expressionRef = useFittedText(expression);

  const endPress = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPressedId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = /^\d$/.test(event.key) ? ({ type: "digit", digit: event.key } as const) : keyboard[event.key];
      if (!key) return;
      event.preventDefault();
      dispatch(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => endPress, [endPress]);

  return (
    <main className={styles.page}>
      <div className={styles.phone}>
        <div className={styles.display} aria-live="polite">
          <div ref={expressionRef} className={styles.expression}><DisplayText text={expression} /></div>
          <div ref={mainRef} className={styles.main}><DisplayText text={main} /></div>
        </div>

        <div className={styles.keypad}>
          {keypad.map((spec) => {
            const label = spec.id === "clear" ? clearLabel(state) : null;
            return (
              <button
                key={spec.id}
                type="button"
                className={styles.key}
                data-tone={spec.tone}
                data-pressed={pressedId === spec.id || undefined}
                aria-label={label === "AC" ? "All Clear" : spec.label}
                onPointerDown={() => {
                  heldThrough.current = false;
                  setPressedId(spec.id);
                  if (spec.holdClears) {
                    holdTimer.current = window.setTimeout(() => {
                      heldThrough.current = true;
                      dispatch({ type: "allClear" });
                    }, HOLD_MS);
                  }
                }}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onPointerCancel={endPress}
                onContextMenu={(event) => event.preventDefault()}
                onClick={() => {
                  if (heldThrough.current) {
                    heldThrough.current = false;
                    return;
                  }
                  dispatch(spec.key);
                }}
              >
                {spec.key.type === "operator" ? (
                  <span className={styles.snsGlyph}><SnsGlyph operator={spec.key.operator} /></span>
                ) : spec.glyph ? (
                  <span className={styles.glyph} data-glyph={spec.glyph}><KeyGlyph name={spec.glyph} /></span>
                ) : (
                  <span className={styles.label} data-wide={label !== null || undefined}>{label ?? (spec.id === "decimal" ? "." : spec.label)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
