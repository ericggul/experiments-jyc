"use client";

import { useEffect, useRef, useState } from "react";
import { Graph } from "./graph";
import styles from "./grid.module.css";
import { DEFAULT_GRAPH_OPTIONS, GraphOptionsPanel, languageFor, paletteFor, type GraphOptions } from "./options";
import { GRAPH } from "./radar";
import { HELD_AT, SCENES } from "./scenes";

const GAP_RANGE = [0, 40] as const;
const MARGIN_RANGE = [0, 60] as const;
const ROW_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10] as const;
type Rows = (typeof ROW_OPTIONS)[number];

// Only the six-axis scene for now; the five- and three-axis scenes wait in scenes.ts.
const SCENE = SCENES[0];

/** Rows are chosen; columns are as many graph boxes as fit the row height, so the wall packs sideways. */
function gridFor(rows: Rows, width: number, height: number, gap: number) {
  const rowHeight = (height - gap * (rows - 1)) / rows;
  const boxWidth = rowHeight * (GRAPH.width / GRAPH.height);
  return { rows, columns: Math.max(1, Math.floor((width + gap) / (boxWidth + gap))) };
}

export default function TvGridTwo() {
  const field = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rows, setRows] = useState<Rows>(4);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(0);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<GraphOptions>(DEFAULT_GRAPH_OPTIONS);

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = Math.max(0, size.width - margin * 2);
  const height = Math.max(0, size.height - margin * 2);
  const grid = gridFor(rows, width, height, gap);
  const cellWidth = (width - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (height - gap * (grid.rows - 1)) / grid.rows;
  // Each graph box scales to fit its cell and sits centred in it.
  const scale = Math.min(cellWidth / GRAPH.width, cellHeight / GRAPH.height);
  const inset = { x: (cellWidth - GRAPH.width * scale) / 2, y: (cellHeight - GRAPH.height * scale) / 2 };
  const slots = Array.from({ length: grid.rows * grid.columns }, (_, slot) => slot);

  return (
    <main ref={field} className={styles.field}>
      {size.width > 0 && slots.map((slot) => (
        <Graph
          key={`slot-${slot}`}
          scene={SCENE}
          language={languageFor(slot, options.language)}
          latin={options.latin}
          palette={paletteFor(slot, options.colour)}
          start={HELD_AT}
          paused={options.paused}
          rate={options.speed}
          scale={scale}
          left={margin + (slot % grid.columns) * (cellWidth + gap) + inset.x}
          top={margin + Math.floor(slot / grid.columns) * (cellHeight + gap) + inset.y}
        />
      ))}
      <div className={styles.control}>
        {open && (
          <div id="tv-grid-two-layout" className={styles.panel} role="group" aria-label="그래프 벽 옵션">
            <GraphOptionsPanel options={options} onChange={setOptions} />
            <p className={styles.heading}>레이아웃</p>
            <div className={styles.layouts}>
              {ROW_OPTIONS.map((option) => (
                <button key={option} type="button" aria-pressed={rows === option} onClick={() => setRows(option)}>
                  {option} × {gridFor(option, width, height, gap).columns}
                </button>
              ))}
            </div>
            <label className={styles.row}>
              <span>간격 <output>{gap}px</output></span>
              <input
                aria-label="그래프 사이 간격"
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
          aria-label="그래프 벽 옵션"
          aria-expanded={open}
          aria-controls="tv-grid-two-layout"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="3" y="11" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="11" y="11" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
