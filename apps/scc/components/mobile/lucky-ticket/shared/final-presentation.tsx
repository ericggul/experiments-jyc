"use client";

import { useLayoutEffect, useRef } from "react";
import ShareActions from "./share-actions";
import styles from "./final-screen.module.css";

export default function FinalPresentation({ message, version }: { message: string; version: 1 | 2 }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const text = messageRef.current;
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
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [message]);

  return (
    <div className={styles.finalScreen}>
      <div ref={areaRef} className={styles.messageArea}>
        <h1 ref={messageRef} className={`${styles.finalMessage} ${version === 1 ? styles.singleLine : ""}`}>{message}</h1>
      </div>
      <ShareActions version={version} />
    </div>
  );
}
