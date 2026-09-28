"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { messageForSeconds } from "./content";
import FinalPresentation from "../shared/final-presentation";
import ScratchSurface from "../shared/scratch-surface";
import styles from "../shared/screen.module.css";

export default function LuckyTicketOne() {
  const [started, setStarted] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const scratchStartedAt = useRef<number | null>(null);
  const markScratched = useCallback(() => {
    if (scratchStartedAt.current === null) scratchStartedAt.current = performance.now();
    setScratched(true);
  }, []);

  useEffect(() => {
    if (!scratched) return;
    const interval = window.setInterval(() => {
      if (scratchStartedAt.current !== null) {
        setSeconds(Math.floor((performance.now() - scratchStartedAt.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [scratched]);

  return (
    <main className={styles.page} data-lucky-ticket>
      <style>{"html:has([data-lucky-ticket]), body:has([data-lucky-ticket]) { background: #000; }"}</style>
      {!started ? (
        <div className={styles.experience}>
          <h1 className={styles.title}>행운의 복권</h1>
          <button aria-label="지금 바로 긁으러 가기" className={styles.primaryButton} type="button" onClick={() => setStarted(true)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={styles.ticket}>
          <FinalPresentation message={messageForSeconds(seconds)} version={1} />
          <ScratchSurface onFirstScratch={markScratched} />
          {!scratched && <p className={styles.instruction}>손가락을 이용해서 긁어보세요</p>}
        </div>
      )}
    </main>
  );
}
