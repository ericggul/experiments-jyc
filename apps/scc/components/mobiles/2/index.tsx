"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./mobiles.module.css";

/** Native size of each phone; the clones lay out against this viewport. */
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const GAP_RANGE = [0, 40] as const;
const MARGIN_RANGE = [0, 60] as const;
const ROW_OPTIONS = [1, 2, 3] as const;
type Rows = (typeof ROW_OPTIONS)[number];

const phones = [
  { id: "instagram", src: "/sns/mobile/11", title: "Instagram" },
  { id: "tiktok", src: "/sns/mobile/12", title: "TikTok" },
  { id: "x", src: "/sns/mobile/13", title: "X" },
  { id: "youtube", src: "/sns/mobile/14", title: "YouTube" },
] as const;

/** One row keeps the four phones; more rows fit as many phone-shaped columns as the screen holds. */
function gridFor(rows: Rows, width: number, height: number, gap: number) {
  if (rows === 1) return { rows, columns: phones.length };
  const rowHeight = (height - gap * (rows - 1)) / rows;
  const phoneWidth = rowHeight * (PHONE_WIDTH / PHONE_HEIGHT);
  return { rows, columns: Math.max(1, Math.floor((width + gap) / (phoneWidth + gap))) };
}

export default function MobilesTwo() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(1);
  const [gap, setGap] = useState(4);
  const [margin, setMargin] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Each cell shows a 390 px phone viewport scaled to the cell width and filling the cell height.
  const width = Math.max(0, size.width - margin * 2);
  const height = Math.max(0, size.height - margin * 2);
  const grid = gridFor(rows, width, height, gap);
  const cellWidth = (width - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (height - gap * (grid.rows - 1)) / grid.rows;
  const scale = cellWidth / PHONE_WIDTH;
  // Slots are the grid positions; slot n always shows the same service, so a resized grid keeps its pages.
  const slots = Array.from({ length: grid.rows * grid.columns }, (_, index) => ({ slot: index, ...phones[index % phones.length] }));

  return (
    <main ref={field} className={styles.field}>
      {size.width > 0 && slots.map(({ slot, src, title }) => (
        <iframe
          key={`slot-${slot}`}
          src={src}
          title={title}
          className={styles.phone}
          style={{
            left: margin + (slot % grid.columns) * (cellWidth + gap),
            top: margin + Math.floor(slot / grid.columns) * (cellHeight + gap),
            width: PHONE_WIDTH,
            height: cellHeight / scale,
            transform: `scale(${scale})`,
          }}
        />
      ))}
      <div className={styles.control}>
        {open && (
          <div id="mobiles-two-layout" className={styles.panel} role="group" aria-label="레이아웃 옵션">
            <p className={styles.heading}>레이아웃</p>
            <div className={styles.views}>
              {ROW_OPTIONS.map((option) => (
                <button key={option} type="button" aria-pressed={rows === option} onClick={() => setRows(option)}>
                  {option} × {gridFor(option, width, height, gap).columns}
                </button>
              ))}
            </div>
            <label className={styles.row}>
              <span>간격 <output>{gap}px</output></span>
              <input
                aria-label="폰 사이 간격"
                max={GAP_RANGE[1]}
                min={GAP_RANGE[0]}
                step="1"
                type="range"
                value={gap}
                onChange={(event) => setGap(Number(event.target.value))}
              />
            </label>
            <label className={styles.row}>
              <span>바깥 여백 <output>{margin}px</output></span>
              <input
                aria-label="화면 가장자리 여백"
                max={MARGIN_RANGE[1]}
                min={MARGIN_RANGE[0]}
                step="1"
                type="range"
                value={margin}
                onChange={(event) => setMargin(Number(event.target.value))}
              />
            </label>
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="레이아웃 옵션"
          aria-expanded={open}
          aria-controls="mobiles-two-layout"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="5.5" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11.5" y="3" width="5.5" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
