"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./mobile.module.css";

const ROW = 44;
export default function WordWheel({ label, words, onChange }: { label: string; words: readonly string[]; onChange: (word: string) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  const select = (index: number) => {
    const next = Math.max(0, Math.min(words.length - 1, index));
    list.current?.scrollTo({ top: next * ROW, behavior: "smooth" });
  };
  return (
    <div className={styles.wheelFrame}>
      <div className={styles.wheelSelection} />
      <div
        ref={list}
        className={styles.wheel}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${label}-${selected}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          select(event.key === "Home" ? 0 : event.key === "End" ? words.length - 1 : selected + (event.key === "ArrowDown" ? 1 : -1));
        }}
        onScroll={(event) => {
          const index = Math.max(0, Math.min(words.length - 1, Math.round(event.currentTarget.scrollTop / ROW)));
          if (index === selectedRef.current) return;
          selectedRef.current = index;
          setSelected(index);
          callback.current(words[index]);
        }}
      >
        {words.map((word, index) => {
          const distance = Math.max(-2, Math.min(2, index - selected));
          return <div key={word} id={`${label}-${index}`} role="option" aria-selected={index === selected} className={styles.word} onClick={() => select(index)}><span style={{ opacity: index === selected ? 1 : Math.abs(distance) === 1 ? 0.48 : 0.2, transform: `perspective(240px) rotateX(${-distance * 22}deg) scale(${1 - Math.abs(distance) * 0.07})` }}>{word}</span></div>;
        })}
      </div>
    </div>
  );
}
