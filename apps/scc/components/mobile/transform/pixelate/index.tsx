"use client";

import { useState } from "react";
import styles from "./pixelate.module.css";

const SIZES = Array.from({ length: 13 }, (_, index) => index + 4);

export default function Pixelate() {
  const [open, setOpen] = useState(false);
  const [pixelSize, setPixelSize] = useState(8);

  return (
    <>
      <svg className={styles.definitions} aria-hidden="true" focusable="false">
        <defs>
          {SIZES.map((size) => (
            <filter key={size} id={`mobile-pixelate-${size}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feFlood x={size / 2} y={size / 2} width="1" height="1" />
              <feComposite in2="SourceGraphic" operator="in" width={size} height={size} />
              <feTile result="samples" />
              <feComposite in="SourceGraphic" in2="samples" operator="in" />
              <feMorphology operator="dilate" radius={size / 2} />
            </filter>
          ))}
        </defs>
      </svg>
      <div className={styles.layer} style={{ backdropFilter: `url(#mobile-pixelate-${pixelSize})` }} aria-hidden="true" />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel} role="group" aria-label="픽셀 필터 설정">
            <label className={styles.label} htmlFor="pixel-size">픽셀 크기 <strong>{pixelSize}px</strong></label>
            <input id="pixel-size" className={styles.slider} type="range" min="4" max="16" step="1" value={pixelSize} onChange={(event) => setPixelSize(Number(event.target.value))} />
            <div className={styles.range}><span>4px</span><span>16px</span></div>
          </div>
        )}
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          필터 {pixelSize}px
        </button>
      </div>
    </>
  );
}
