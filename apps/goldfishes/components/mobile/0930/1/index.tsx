"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import styles from "./mobile.module.css";

type Grid = {
  cellSize: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
};

type Bubble = {
  id: number;
  xRatio: number;
  yRatio: number;
  name: string;
  size: number;
  weight: number;
};

// Cross grid reproduced locally from screen/2d/1 (primary scale 2), confined to a centred 16:9 map.
const CELL_MIN = 20;
const CELL_MAX = 30;
const CELL_DIVISOR = 30;
const GRID_SCALE = 2;
const PAPER = "#000";
const GRID_INK = "rgba(255, 255, 255, 0.5)";
const CROSS_ARM = 2.25;
const EDGE_INSET = 8;

const SIZE_RANGE = { min: 0.5, max: 3, step: 0.1 };

function createGrid(width: number, height: number): Grid {
  const baseCellSize = Math.max(
    CELL_MIN,
    Math.min(CELL_MAX, Math.round(Math.min(width, height) / CELL_DIVISOR)),
  );
  const cellSize = baseCellSize * GRID_SCALE;
  const columns = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;

  return {
    cellSize,
    originX: (width - columns * cellSize) / 2,
    originY: (height - rows * cellSize) / 2,
    columns,
    rows,
    width,
    height,
  };
}

function snapAxis(value: number, origin: number, cell: number, count: number, extent: number) {
  let index = Math.round((value - origin) / cell);
  index = Math.min(count, Math.max(0, index));
  if (origin + index * cell < EDGE_INSET) index += 1;
  if (origin + index * cell > extent - EDGE_INSET) index -= 1;
  return index;
}

function getIntersection(x: number, y: number, grid: Grid) {
  const column = snapAxis(x, grid.originX, grid.cellSize, grid.columns, grid.width);
  const row = snapAxis(y, grid.originY, grid.cellSize, grid.rows, grid.height);

  return {
    column,
    row,
    x: Math.round(grid.originX + column * grid.cellSize) + 0.5,
    y: Math.round(grid.originY + row * grid.cellSize) + 0.5,
  };
}

function drawGrid(context: CanvasRenderingContext2D, grid: Grid) {
  context.fillStyle = PAPER;
  context.fillRect(0, 0, grid.width, grid.height);
  context.strokeStyle = GRID_INK;
  context.lineWidth = 1;
  context.beginPath();

  for (let column = 0; column <= grid.columns; column += 1) {
    const x = Math.round(grid.originX + column * grid.cellSize) + 0.5;
    if (x < EDGE_INSET || x > grid.width - EDGE_INSET) continue;

    for (let row = 0; row <= grid.rows; row += 1) {
      const y = Math.round(grid.originY + row * grid.cellSize) + 0.5;
      if (y < EDGE_INSET || y > grid.height - EDGE_INSET) continue;
      context.moveTo(x - CROSS_ARM, y);
      context.lineTo(x + CROSS_ARM, y);
      context.moveTo(x, y - CROSS_ARM);
      context.lineTo(x, y + CROSS_ARM);
    }
  }

  context.stroke();
}

function formatSize(size: number) {
  return size.toFixed(1);
}

function formatWeight(weight: number) {
  return `${Math.round(weight * 100)}%`;
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <label className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--progress": `${progress}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.rowValue}>{display}</span>
    </label>
  );
}

export default function GoldfishesMobileKeywordGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextIdRef = useRef(1);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = bubbles.find((bubble) => bubble.id === selectedId) ?? null;
  const [panelBubble, setPanelBubble] = useState<Bubble | null>(null);
  if (selected && selected !== panelBubble) setPanelBubble(selected);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextGrid = createGrid(bounds.width, bounds.height);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawGrid(context, nextGrid);
      setGrid(nextGrid);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<Omit<Bubble, "id">>) => {
      setBubbles((current) =>
        current.map((bubble) =>
          bubble.id === selectedId ? { ...bubble, ...patch } : bubble,
        ),
      );
    },
    [selectedId],
  );

  const deselect = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setSelectedId(null);
  };

  const placedBubbles = grid
    ? bubbles.map((bubble) => ({
        bubble,
        point: getIntersection(
          bubble.xRatio * grid.width,
          bubble.yRatio * grid.height,
          grid,
        ),
      }))
    : [];

  const handleMapTap = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!grid) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = getIntersection(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      grid,
    );
    const occupant = placedBubbles.find(
      ({ point: placed }) =>
        placed.column === point.column && placed.row === point.row,
    );

    if (occupant) {
      setSelectedId(occupant.bubble.id);
      return;
    }

    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setBubbles((current) => [
      ...current,
      {
        id,
        xRatio: point.x / grid.width,
        yRatio: point.y / grid.height,
        name: "",
        size: 1,
        weight: 0.5,
      },
    ]);
    setSelectedId(id);
  };

  const cellSize = grid?.cellSize ?? CELL_MIN * GRID_SCALE;

  return (
    <main
      className={styles.page}
      onPointerUp={(event) => {
        if (event.target === event.currentTarget) deselect();
      }}
    >
      <div className={styles.stage}>
        <div className={styles.map}>
          <canvas
            ref={canvasRef}
            className={styles.field}
            aria-label="Grid intersections. Tap a cross to place a keyword bubble."
            onPointerUp={handleMapTap}
          />

          {placedBubbles.map(({ bubble, point }) => {
            const diameter = bubble.size * cellSize;
            return (
              <button
                key={bubble.id}
                type="button"
                className={styles.bubble}
                data-selected={bubble.id === selectedId || undefined}
                aria-label={bubble.name ? `Edit ${bubble.name}` : "Edit keyword"}
                style={
                  {
                    left: point.x,
                    top: point.y,
                    width: diameter,
                    height: diameter,
                    "--bubble-fill": bubble.weight * 0.6,
                  } as CSSProperties
                }
                onClick={() => setSelectedId(bubble.id)}
              >
                {bubble.id === selectedId ? (
                  <span className={styles.brackets} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
                <span className={styles.bubbleLabel}>{bubble.name}</span>
              </button>
            );
          })}
        </div>

        <section
          className={styles.panel}
          data-open={selected !== null || undefined}
          aria-hidden={selected === null}
          inert={selected === null}
          aria-label="Keyword settings"
        >
          {panelBubble ? (
            <>
              <label className={styles.row}>
                <span className={styles.rowLabel}>name</span>
                <input
                  className={styles.textInput}
                  type="text"
                  value={panelBubble.name}
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => updateSelected({ name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
              <SliderRow
                label="size"
                value={panelBubble.size}
                display={formatSize(panelBubble.size)}
                min={SIZE_RANGE.min}
                max={SIZE_RANGE.max}
                step={SIZE_RANGE.step}
                onChange={(size) => updateSelected({ size })}
              />
              <SliderRow
                label="weight"
                value={panelBubble.weight}
                display={formatWeight(panelBubble.weight)}
                min={0}
                max={1}
                step={0.01}
                onChange={(weight) => updateSelected({ weight })}
              />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
