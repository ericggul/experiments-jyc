"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ShareActions from "../shared/share-actions";
import baseStyles from "../shared/final-screen.module.css";
import styles from "./scattered.module.css";

const positions = [
  { id: "word-1", x: 71, y: 4 },
  { id: "word-2", x: 18, y: 12 },
  { id: "word-3", x: 58, y: 20 },
  { id: "word-4", x: 32, y: 29 },
  { id: "word-5", x: 84, y: 37 },
  { id: "word-6", x: 46, y: 45 },
  { id: "word-7", x: 13, y: 54 },
  { id: "word-8", x: 76, y: 62 },
  { id: "word-9", x: 39, y: 70 },
  { id: "word-10", x: 87, y: 79 },
  { id: "word-11", x: 24, y: 87 },
  { id: "word-12", x: 61, y: 96 },
] as const;

export default function ScatteredPresentation({ message }: { message: string }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const text = measureRef.current;
    if (!area || !text) return;
    const fit = () => {
      let smallest = 1;
      let largest = 220;
      for (let index = 0; index < 10; index++) {
        const size = (smallest + largest) / 2;
        text.style.fontSize = `${size}px`;
        if (text.scrollHeight <= area.clientHeight && text.scrollWidth <= area.clientWidth) {
          smallest = size;
        } else {
          largest = size;
        }
      }
      text.style.fontSize = `${smallest}px`;
      setFontSize(smallest * 1.1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [message]);

  const words = message.split(" ");

  return (
    <div className={baseStyles.finalScreen}>
      <div ref={areaRef} className={`${baseStyles.messageArea} ${styles.measureArea}`} aria-hidden="true">
        <h1 ref={measureRef} className={`${baseStyles.finalMessage} ${baseStyles.singleLine}`}>{message}</h1>
      </div>
      <h1 className={styles.wordField} aria-label={message} style={fontSize === null ? undefined : { fontSize }}>
        {words.map((word, index) => {
          const position = positions[index];
          return <span key={position.id} className={styles.word} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-hidden="true">{word}</span>;
        })}
      </h1>
      <ShareActions version={3} />
    </div>
  );
}
