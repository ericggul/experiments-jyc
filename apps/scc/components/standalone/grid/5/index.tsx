"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bastilleDayImages } from "@/components/standalone/bastille-day/1/images";
import goodFrenchSources from "@/components/standalone/bastille-day/2/good-sources.json";
import darkFrenchSources from "@/components/standalone/bastille-day/2/dark-sources.json";
import catSources from "@/components/ui/dashboard/stock/4/model/cat-sources.json";
import kissSources from "@/components/ui/dashboard/stock/4/model/kiss-sources.json";
import politicianSources from "../2/politician-sources.json";
import styles from "../screen/grid.module.css";

const BASE_RECTANGLE_COUNT = 240;
const INITIAL_POOL_SIZE = 8;
const ITERATIONS_PER_SECOND = 60;
const MIN_FLASH_RECTANGLES = 6;
const MAX_FLASH_RECTANGLES = 22;
const MAX_PIXEL_RATIO = 2;
const MIN_PARTITION_RATIO = 0.36;
const MAX_PARTITION_RATIO = 0.64;

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

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FlashRectangle = Rectangle & {
  expiresAt: number;
  sourceIndex: number;
};

function randomOtherIndex(current: number, count: number) {
  if (count < 2) return 0;
  const candidate = Math.floor(Math.random() * (count - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

function splitRectangle(
  rectangle: Rectangle,
  viewportAspectRatio: number,
): [Rectangle, Rectangle] {
  const renderedWidth = rectangle.width * viewportAspectRatio;
  const splitVertically =
    renderedWidth > rectangle.height * 1.15
      ? true
      : rectangle.height > renderedWidth * 1.15
        ? false
        : Math.random() < 0.5;
  const ratio =
    MIN_PARTITION_RATIO +
    Math.random() * (MAX_PARTITION_RATIO - MIN_PARTITION_RATIO);

  if (splitVertically) {
    const firstWidth = rectangle.width * ratio;
    return [
      { ...rectangle, width: firstWidth },
      {
        x: rectangle.x + firstWidth,
        y: rectangle.y,
        width: rectangle.width - firstWidth,
        height: rectangle.height,
      },
    ];
  }

  const firstHeight = rectangle.height * ratio;
  return [
    { ...rectangle, height: firstHeight },
    {
      x: rectangle.x,
      y: rectangle.y + firstHeight,
      width: rectangle.width,
      height: rectangle.height - firstHeight,
    },
  ];
}

function createCoveringPartition(count: number, viewportAspectRatio: number) {
  const rectangles: Rectangle[] = [{ x: 0, y: 0, width: 1, height: 1 }];

  while (rectangles.length < count) {
    let selectedIndex = 0;
    let selectedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < rectangles.length; index += 1) {
      const rectangle = rectangles[index];
      const area = rectangle.width * rectangle.height;
      const score = area * (0.82 + Math.random() * 0.36);
      if (score > selectedScore) {
        selectedIndex = index;
        selectedScore = score;
      }
    }

    const [first, second] = splitRectangle(
      rectangles[selectedIndex],
      viewportAspectRatio,
    );
    rectangles.splice(selectedIndex, 1, first, second);
  }

  return rectangles;
}

function overlaps(left: Rectangle, right: Rectangle) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function createFlashSize(viewportAspectRatio: number) {
  const isCompact = Math.random() < 0.82;
  const height = isCompact
    ? 0.025 + Math.random() ** 2 * 0.075
    : 0.08 + Math.random() * 0.1;
  const shapeRatio = isCompact
    ? 0.78 + Math.random() * 0.44
    : 0.72 + Math.random() * 0.68;

  return {
    width: Math.min(0.18, (height * shapeRatio) / viewportAspectRatio),
    height,
  };
}

function createFlashRectangle(
  active: readonly FlashRectangle[],
  viewportAspectRatio: number,
): Rectangle {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const { width, height } = createFlashSize(viewportAspectRatio);
    const rectangle = {
      x: Math.random() * (1 - width),
      y: Math.random() * (1 - height),
      width,
      height,
    };
    if (!active.some((candidate) => overlaps(rectangle, candidate))) {
      return rectangle;
    }
  }

  const { width, height } = createFlashSize(viewportAspectRatio);
  return {
    x: Math.random() * (1 - width),
    y: Math.random() * (1 - height),
    width,
    height,
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

export default function GridFive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const availableImagesRef = useRef<HTMLImageElement[]>([]);
  const flashRectanglesRef = useRef<Array<FlashRectangle | null>>(
    Array.from({ length: MAX_FLASH_RECTANGLES }, () => null),
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
    if (!canvas || !context || !hasInitialImages) return;

    const bounds = canvas.getBoundingClientRect();
    const viewportAspectRatio = bounds.width / Math.max(1, bounds.height);
    const baseRectangles = createCoveringPartition(
      BASE_RECTANGLE_COUNT,
      viewportAspectRatio,
    );
    const initialImageCount = Math.max(1, availableImagesRef.current.length);
    const sourceIndexes = baseRectangles.map(
      (_, index) => index % initialImageCount,
    );
    let animationFrame = 0;
    let nextIterationAt = performance.now();

    const updateFlashes = (frameTime: number, imageCount: number) => {
      const active: FlashRectangle[] = [];
      const targetCount =
        MIN_FLASH_RECTANGLES +
        Math.floor(
          Math.random() *
            (MAX_FLASH_RECTANGLES - MIN_FLASH_RECTANGLES + 1),
        );

      for (let index = 0; index < MAX_FLASH_RECTANGLES; index += 1) {
        const flash = flashRectanglesRef.current[index];
        if (!flash || flash.expiresAt <= frameTime) {
          flashRectanglesRef.current[index] = null;
          continue;
        }
        flash.sourceIndex = randomOtherIndex(flash.sourceIndex, imageCount);
        active.push(flash);
      }

      for (let index = 0; index < MAX_FLASH_RECTANGLES; index += 1) {
        if (active.length >= targetCount) break;
        if (flashRectanglesRef.current[index]) continue;

        const rectangle = createFlashRectangle(active, viewportAspectRatio);
        const flash: FlashRectangle = {
          ...rectangle,
          expiresAt: frameTime + Math.random() * 1000,
          sourceIndex: Math.floor(Math.random() * imageCount),
        };
        flashRectanglesRef.current[index] = flash;
        active.push(flash);
      }
    };

    const drawField = (images: readonly HTMLImageElement[]) => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = canvas.width / Math.max(1, width);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < baseRectangles.length; index += 1) {
        const rectangle = baseRectangles[index];
        drawCover(
          context,
          images[sourceIndexes[index]],
          rectangle.x * width,
          rectangle.y * height,
          rectangle.width * width,
          rectangle.height * height,
        );
      }

      for (const flash of flashRectanglesRef.current) {
        if (!flash) continue;
        drawCover(
          context,
          images[flash.sourceIndex],
          flash.x * width,
          flash.y * height,
          flash.width * width,
          flash.height * height,
        );
      }
    };

    const iterate = (frameTime: number) => {
      const images = availableImagesRef.current;
      if (images.length === 0) return;

      for (let index = 0; index < sourceIndexes.length; index += 1) {
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
    if (!reduceMotion) {
      animationFrame = window.requestAnimationFrame(animate);
    }
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
