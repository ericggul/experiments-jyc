"use client";

import { useEffect, useRef, useState } from "react";
import { createMotion } from "./motion";
import { CONTROL_ATTRIBUTE, createStretcher } from "./stretch";
import styles from "./stretch.module.css";

const MIN = 0.3;
const MAX = 12;
const toFactor = (position: number) => MIN * (MAX / MIN) ** (position / 1000);
const toPosition = (factor: number) => Math.round((Math.log(factor / MIN) / Math.log(MAX / MIN)) * 1000);
const DEFAULT = 3;
const label = (factor: number) => `×${factor.toFixed(1)}`;

export default function Stretch() {
  const [open, setOpen] = useState(false);
  const [factor, setFactor] = useState(DEFAULT);
  // Live: the factor follows a wandering sum of sines every frame (see `motion.ts`) instead of the slider.
  const [live, setLive] = useState(false);
  const stretcher = useRef<ReturnType<typeof createStretcher> | null>(null);
  const valueRef = useRef<HTMLOutputElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const liveFactor = useRef(factor);

  useEffect(() => {
    const instance = createStretcher();
    stretcher.current = instance;
    instance.start();
    return () => {
      instance.stop();
      stretcher.current = null;
    };
  }, []);

  useEffect(() => {
    if (!live) stretcher.current?.setFactor(factor);
  }, [factor, live]);

  useEffect(() => {
    if (!live) return;
    const motion = createMotion({ min: MIN, max: MAX });
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = motion.step((now - last) / 1000);
      last = now;
      liveFactor.current = next;
      stretcher.current?.setFactor(next);
      // The readout and slider follow without re-rendering React every frame.
      if (valueRef.current) valueRef.current.textContent = label(next);
      if (sliderRef.current) sliderRef.current.value = String(toPosition(next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live]);

  const stopLive = () => {
    if (!live) return;
    setFactor(liveFactor.current);
    setLive(false);
  };

  return (
    <div className={styles.control} {...{ [CONTROL_ATTRIBUTE]: "" }}>
      {open && (
        <div id="stretch-options" className={styles.panel} role="group" aria-label="사진 늘이기">
          <p className={styles.heading}>사진 늘이기</p>
          <p className={styles.note}>게시물·영상 사진의 세로만 늘이거나 줄입니다. 프로필 사진과 아이콘은 그대로입니다.</p>

          <p className={styles.note}>움직임</p>
          <div className={styles.chips} role="group" aria-label="움직임">
            <button type="button" aria-pressed={!live} onClick={stopLive}>고정</button>
            <button type="button" aria-pressed={live} onClick={() => setLive(true)}>실시간으로 출렁임</button>
          </div>

          <label className={styles.row}>
            <span>
              세로 배율 <output ref={valueRef}>{label(factor)}</output>
            </span>
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="1000"
              step="1"
              defaultValue={toPosition(factor)}
              aria-label="세로 배율, ×0.3부터 ×12까지"
              onPointerDown={stopLive}
              onChange={(event) => {
                stopLive();
                setFactor(toFactor(Number(event.target.value)));
              }}
            />
          </label>

          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              stopLive();
              setFactor(DEFAULT);
              if (sliderRef.current) sliderRef.current.value = String(toPosition(DEFAULT));
            }}
          >
            기본값으로
          </button>
        </div>
      )}
      <button type="button" className={styles.trigger} aria-label="사진 늘이기 옵션" aria-expanded={open} aria-controls="stretch-options" onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6.5" y="6.5" width="7" height="7" rx="1" />
          <path d="M10 1.8v3M8.2 3.4 10 1.6l1.8 1.8M10 18.2v-3M8.2 16.6 10 18.4l1.8-1.8" />
        </svg>
      </button>
    </div>
  );
}
