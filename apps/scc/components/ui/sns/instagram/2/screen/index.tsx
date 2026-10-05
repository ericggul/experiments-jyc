"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getInstagramGridStories, getNextStoryStateChangeAt, getStoryState } from "../model/data";
import styles from "./story-tray.module.css";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 50;
const MIN_ICON_SIZE = 28;
const MAX_ICON_SIZE = REFERENCE_STORY_SIZE;
const DEFAULT_STORY_GAP = 32;
const MAX_STORY_GAP = 80;
const STORY_LABEL_HEIGHT = 20;

type GridSize = {
  columns: number;
  rows: number;
};

type StorySurface = "empty" | "white";

const surfaceOptions: readonly { label: string; value: StorySurface }[] = [
  { label: "empty", value: "empty" },
  { label: "white", value: "white" },
];

function getGridSize(
  width: number,
  height: number,
  storySize: number,
  storyRowHeight: number,
  storyGap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + storyGap) / (storySize + storyGap))),
    rows: Math.max(1, Math.floor((height + storyGap) / (storyRowHeight + storyGap))),
  };
}

function getSurfaceStyle(surface: StorySurface): CSSProperties {
  if (surface === "empty") return { backgroundColor: "#242a2f" };
  return { backgroundColor: "#fff" };
}

export function InstagramStoryTray() {
  const gridRef = useRef<HTMLUListElement>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [testSurface, setTestSurface] = useState<StorySurface>("empty");
  const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
  const [storyGap, setStoryGap] = useState(DEFAULT_STORY_GAP);
  const [showLabels, setShowLabels] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const storyRowHeight = iconSize + (showLabels ? STORY_LABEL_HEIGHT : 0);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const next = getGridSize(grid.clientWidth, grid.clientHeight, iconSize, storyRowHeight, storyGap);
      setGridSize((current) => (
        current.columns === next.columns && current.rows === next.rows ? current : next
      ));
    };

    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [iconSize, storyGap, storyRowHeight]);

  const stories = useMemo(
    () => getInstagramGridStories(gridSize.columns * gridSize.rows),
    [gridSize],
  );

  useEffect(() => {
    let timeout: number;

    const updateStoryStates = () => {
      const now = Date.now();
      setCurrentTime(now);
      const nextChange = stories.reduce(
        (earliest, story) => Math.min(earliest, getNextStoryStateChangeAt(story, now)),
        Number.POSITIVE_INFINITY,
      );

      timeout = window.setTimeout(updateStoryStates, Math.max(100, nextChange - now + 20));
    };

    updateStoryStates();
    return () => window.clearTimeout(timeout);
  }, [stories]);

  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
    "--story-size": `${iconSize}px`,
    "--story-row-height": `${storyRowHeight}px`,
    "--story-gap": `${storyGap}px`,
    "--story-ring-padding": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-separator": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
  } as CSSProperties;

  return (
    <main aria-label="Instagram stories" className={styles.screen}>
      <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
        {stories.map((story) => {
          const storyState = getStoryState(story, currentTime);
          const isEmpty = storyState === "empty";

          return (
            <li className={styles.gridItem} key={story.id}>
              <span className={`${styles.story} ${isEmpty ? styles.storyEmpty : ""}`}>
                <span className={`${styles.storyRing} ${storyState === "new" ? styles.storyRingNew : styles.storyRingPlain}`}>
                  <span aria-hidden="true" className={styles.logoSurface} style={getSurfaceStyle(testSurface)} />
                </span>
                {showLabels ? <span className={styles.storyLabel}>{story.handle}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>

      <section aria-label="Story surface test" className={styles.controls}>
        <div className={styles.controlActions}>
          <div className={styles.actions}>
            {surfaceOptions.map((option) => (
              <button aria-pressed={testSurface === option.value} key={option.value} onClick={() => setTestSurface(option.value)} type="button">
                {option.label}
              </button>
            ))}
            <button aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)} type="button">
              text {showLabels ? "active" : "inactive"}
            </button>
          </div>
          <label className={styles.sizeControl}>
            <span>size</span>
            <input aria-label="Story icon size" max={MAX_ICON_SIZE} min={MIN_ICON_SIZE} onChange={(event) => setIconSize(Number(event.currentTarget.value))} step="1" type="range" value={iconSize} />
            <output>{iconSize}px</output>
          </label>
          <label className={styles.sizeControl}>
            <span>margin</span>
            <input aria-label="Space between story icons" max={MAX_STORY_GAP} min="0" onChange={(event) => setStoryGap(Number(event.currentTarget.value))} step="1" type="range" value={storyGap} />
            <output>{storyGap}px</output>
          </label>
        </div>
      </section>
    </main>
  );
}
