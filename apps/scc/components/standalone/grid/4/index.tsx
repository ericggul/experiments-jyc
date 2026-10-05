"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bastilleDayImages } from "@/components/standalone/bastille-day/1/images";
import goodFrenchSources from "@/components/standalone/bastille-day/2/good-sources.json";
import darkFrenchSources from "@/components/standalone/bastille-day/2/dark-sources.json";
import catSources from "@/components/ui/dashboard/stock/4/model/cat-sources.json";
import kissSources from "@/components/ui/dashboard/stock/4/model/kiss-sources.json";
import politicianSources from "../2/politician-sources.json";
import styles from "../screen/grid.module.css";

const COLUMN_COUNT = 28;
const ROW_COUNT = 16;
const CELL_COUNT = COLUMN_COUNT * ROW_COUNT;
const INITIAL_POOL_SIZE = 8;
const ITERATIONS_PER_SECOND = 60;
const MIN_FLASH_CELLS = 15;
const MAX_FLASH_CELLS = 60;
const MAX_PIXEL_RATIO = 2;

const frenchSources = [
  ...bastilleDayImages,
  ...goodFrenchSources,
  ...darkFrenchSources,
];

const imageSources = [
  ...catSources,
  ...kissSources,
  ...frenchSources,
  ...politicianSources,
];

type FlashSpan = {
  columns: number;
  rows: number;
};

type FlashCell = FlashSpan & {
  column: number;
  row: number;
};

type FlashState = FlashCell & {
  expiresAt: number;
  sourceIndex: number;
};

const FLASH_SPANS: readonly FlashSpan[] = [
  { columns: 5, rows: 5 },
  { columns: 5, rows: 4 },
  { columns: 4, rows: 5 },
  { columns: 4, rows: 4 },
  { columns: 4, rows: 3 },
  { columns: 3, rows: 4 },
  { columns: 3, rows: 3 },
  { columns: 3, rows: 2 },
  { columns: 2, rows: 3 },
  { columns: 2, rows: 2 },
  { columns: 2, rows: 1 },
  { columns: 1, rows: 2 },
] as const;

function randomOtherIndex(current: number, count: number) {
  if (count < 2) return 0;
  const candidate = Math.floor(Math.random() * (count - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

function canPlace(
  occupied: boolean[][],
  column: number,
  row: number,
  span: FlashSpan,
) {
  if (column + span.columns > COLUMN_COUNT || row + span.rows > ROW_COUNT) {
    return false;
  }

  for (let y = row; y < row + span.rows; y += 1) {
    for (let x = column; x < column + span.columns; x += 1) {
      if (occupied[y][x]) return false;
    }
  }
  return true;
}

function occupy(occupied: boolean[][], flash: FlashCell) {
  for (let y = flash.row; y < flash.row + flash.rows; y += 1) {
    for (let x = flash.column; x < flash.column + flash.columns; x += 1) {
      occupied[y][x] = true;
    }
  }
}

function createFlashCell(occupied: boolean[][]) {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const span = FLASH_SPANS[Math.floor(Math.random() * FLASH_SPANS.length)];
    const column = Math.floor(Math.random() * (COLUMN_COUNT - span.columns + 1));
    const row = Math.floor(Math.random() * (ROW_COUNT - span.rows + 1));
    if (!canPlace(occupied, column, row, span)) continue;

    const flash = { column, row, ...span };
    occupy(occupied, flash);
    return flash;
  }

  const span = FLASH_SPANS[Math.floor(Math.random() * FLASH_SPANS.length)];
  return {
    column: Math.floor(Math.random() * (COLUMN_COUNT - span.columns + 1)),
    row: Math.floor(Math.random() * (ROW_COUNT - span.rows + 1)),
    ...span,
  };
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth === 0 || sourceHeight === 0) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  context.drawImage(
    image,
    (sourceWidth - cropWidth) / 2,
    (sourceHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height,
  );
}

export default function GridFour() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const availableImagesRef = useRef<HTMLImageElement[]>([]);
  const flashStatesRef = useRef<Array<FlashState | null>>(
    Array.from({ length: MAX_FLASH_CELLS }, () => null),
  );
  const [hasInitialImages, setHasInitialImages] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const decodedImages: HTMLImageElement[] = [];
    availableImagesRef.current = [];

    const preloadSequentially = async () => {
      for (const source of imageSources) {
        if (cancelled) return;
        const image = new Image();
        image.decoding = "async";
        const didLoad = await new Promise<boolean>((resolve) => {
          image.onload = async () => {
            try {
              await image.decode();
              resolve(true);
            } catch {
              resolve(false);
            }
          };
          image.onerror = () => resolve(false);
          image.src = source.imageUrl;
        });

        if (!cancelled && didLoad) {
          decodedImages.push(image);
          availableImagesRef.current = decodedImages;
          if (decodedImages.length === INITIAL_POOL_SIZE) {
            setHasInitialImages(true);
          }
        }
      }

      if (!cancelled && decodedImages.length < INITIAL_POOL_SIZE) {
        setHasInitialImages(decodedImages.length > 0);
      }
    };

    void preloadSequentially();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const updatePreference = () => setReduceMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () =>
      motionPreference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context || reduceMotion || !hasInitialImages) return;

    const initialImageCount = Math.max(1, availableImagesRef.current.length);
    const sourceIndexes = Array.from(
      { length: CELL_COUNT },
      (_, index) => index % initialImageCount,
    );
    let animationFrame = 0;
    let nextIterationAt = performance.now();

    const updateFlashes = (frameTime: number, imageCount: number) => {
      const occupied = Array.from({ length: ROW_COUNT }, () =>
        Array.from({ length: COLUMN_COUNT }, () => false),
      );
      const targetCount =
        MIN_FLASH_CELLS +
        Math.floor(
          Math.random() * (MAX_FLASH_CELLS - MIN_FLASH_CELLS + 1),
        );
      let activeCount = 0;

      for (let index = 0; index < MAX_FLASH_CELLS; index += 1) {
        const flash = flashStatesRef.current[index];
        if (!flash || flash.expiresAt <= frameTime) {
          flashStatesRef.current[index] = null;
          continue;
        }
        occupy(occupied, flash);
        flash.sourceIndex = randomOtherIndex(flash.sourceIndex, imageCount);
        activeCount += 1;
      }

      for (let index = 0; index < MAX_FLASH_CELLS; index += 1) {
        if (activeCount >= targetCount) break;
        if (flashStatesRef.current[index]) continue;

        const flash = createFlashCell(occupied);
        flashStatesRef.current[index] = {
          ...flash,
          expiresAt: frameTime + Math.random() * 1000,
          sourceIndex: Math.floor(Math.random() * imageCount),
        };
        activeCount += 1;
      }
    };

    const drawField = (images: readonly HTMLImageElement[]) => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = canvas.width / Math.max(1, width);
      const cellWidth = width / COLUMN_COUNT;
      const cellHeight = height / ROW_COUNT;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < CELL_COUNT; index += 1) {
        const column = index % COLUMN_COUNT;
        const row = Math.floor(index / COLUMN_COUNT);
        drawCover(
          context,
          images[sourceIndexes[index]],
          column * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
        );
      }

      for (const flash of flashStatesRef.current) {
        if (!flash) continue;
        drawCover(
          context,
          images[flash.sourceIndex],
          flash.column * cellWidth,
          flash.row * cellHeight,
          flash.columns * cellWidth,
          flash.rows * cellHeight,
        );
      }
    };

    const iterate = (frameTime: number) => {
      const images = availableImagesRef.current;
      if (images.length === 0) return;

      for (let index = 0; index < CELL_COUNT; index += 1) {
        sourceIndexes[index] = randomOtherIndex(sourceIndexes[index], images.length);
      }
      updateFlashes(frameTime, images.length);
      drawField(images);
    };

    const animate = (frameTime: number) => {
      if (frameTime >= nextIterationAt) {
        iterate(frameTime);
        nextIterationAt = frameTime + 1000 / ITERATIONS_PER_SECOND;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    iterate(performance.now());
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [hasInitialImages, reduceMotion]);

  return (
    <main
      className={styles.page}
      style={{ "--field-background": "#000000" } as CSSProperties}
    >
      <canvas
        ref={canvasRef}
        className={styles.flashCanvas}
        aria-hidden="true"
      />
    </main>
  );
}
