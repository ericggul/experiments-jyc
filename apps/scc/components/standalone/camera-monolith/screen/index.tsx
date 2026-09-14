"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { button, folder, LevaPanel, useControls, useCreateStore } from "leva";
import {
  createGrid,
  createTemporalCompositionAnchor,
  getAnchoredCells,
  getCellAtPoint,
  getTemporalCells,
  getTemporalCompositionCells,
  CAMERA_MONOLITH_GRID_SETTINGS,
  type CellAnchor,
  type Grid,
  type TemporalAnchor,
  type TemporalCompositionAnchor,
} from "../model";
import {
  CameraMonolithScene,
  CAMERA_MONOLITH_DEFAULT_VERTICAL_SCALE,
  CAMERA_MONOLITH_RENDERER_REVISION,
  type CameraSurface,
} from "../rendering";
import {
  CAMERA_MONOLITH_CAPTURE_HEIGHT,
  CAMERA_MONOLITH_CAPTURE_INTERVAL_MS,
  CAMERA_MONOLITH_CAPTURE_WIDTH,
  useCameraMonolithSocket,
  useCameraMonolithViewer,
  type CameraMonolithStream,
} from "../transport";
import styles from "./camera-monolith.module.css";

type FieldTheme = "light" | "dark";
type GridMark = "dot" | "cross";
type TracePoint = { x: number; y: number };
type CameraGesture = { pointerId: number; x: number; y: number };
type FieldPalette = {
  paper: string;
  ink: string;
  selectedCell: string;
  grid: string;
  goldfish: string;
};

const FIELD_PALETTES: Record<FieldTheme, FieldPalette> = {
  light: {
    paper: "#f4f4f1",
    ink: "#11110f",
    selectedCell: "#11110f",
    grid: "rgba(17, 17, 15, 0.58)",
    goldfish: "#a97824",
  },
  dark: {
    paper: "#0d0e0d",
    ink: "#eceee8",
    selectedCell: "#eceee8",
    grid: "rgba(236, 238, 232, 0.52)",
    goldfish: "#d8a849",
  },
};

const MAX_TEMPORAL_ANCHOR_COUNT = 2048;

function CameraSource({
  publisherId,
  register,
  stream,
}: CameraMonolithStream & {
  register: (publisherId: string, video: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => undefined);
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    register(publisherId, video);
    return () => register(publisherId, null);
  }, [publisherId, register]);

  return <video ref={videoRef} className={styles.source} autoPlay muted playsInline />;
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (sourceWidth === 0 || sourceHeight === 0) return false;
  const cropSize = Math.min(sourceWidth, sourceHeight);
  context.drawImage(
    video,
    (sourceWidth - cropSize) / 2,
    (sourceHeight - cropSize) / 2,
    cropSize,
    cropSize,
    0,
    0,
    CAMERA_MONOLITH_CAPTURE_WIDTH,
    CAMERA_MONOLITH_CAPTURE_HEIGHT,
  );
  return true;
}

function drawField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: Grid,
  anchors: readonly CellAnchor[],
  palette: FieldPalette,
  gridMark: GridMark,
) {
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = palette.selectedCell;
  for (const cell of getAnchoredCells(anchors, grid, width, height)) {
    context.fillRect(cell.x, cell.y, cell.width, cell.height);
  }

  if (gridMark === "dot") {
    context.fillStyle = palette.grid;
    for (let column = 0; column <= grid.columns; column += 1) {
      const x = Math.round(grid.originX + column * grid.cellSize);
      for (let row = 0; row <= grid.rows; row += 1) {
        const y = Math.round(grid.originY + row * grid.cellSize);
        context.fillRect(x, y, 1, 1);
      }
    }
    return;
  }

  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 0; column <= grid.columns; column += 1) {
    const x = Math.round(grid.originX + column * grid.cellSize) + 0.5;
    for (let row = 0; row <= grid.rows; row += 1) {
      const y = Math.round(grid.originY + row * grid.cellSize) + 0.5;
      context.moveTo(x - 2.25, y);
      context.lineTo(x + 2.25, y);
      context.moveTo(x, y - 2.25);
      context.lineTo(x, y + 2.25);
    }
  }
  context.stroke();
}

function getTracePoints(previous: TracePoint, next: TracePoint, cellSize: number) {
  const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, cellSize / 3)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return {
      x: previous.x + (next.x - previous.x) * progress,
      y: previous.y + (next.y - previous.y) * progress,
    };
  });
}

function getCellKey(column: number, row: number) {
  return `${column}:${row}`;
}

export default function CameraMonolithScreen() {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CameraMonolithScene | null>(null);
  const frameRef = useRef<number | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const selectionRef = useRef<TemporalAnchor[]>([]);
  const compositionAnchorsRef = useRef<TemporalCompositionAnchor[]>([]);
  const compositionEnabledRef = useRef(false);
  const elapsedSecondsRef = useRef(0);
  const tracePointRef = useRef<TracePoint | null>(null);
  const cameraGestureRef = useRef<CameraGesture | null>(null);
  const cameraInputRef = useRef(true);
  const themeRef = useRef<FieldTheme>("dark");
  const gridMarkRef = useRef<GridMark>("dot");
  const surfaceRef = useRef<CameraSurface>("company");
  const mediaSpeedRef = useRef(12);
  const growthRateRef = useRef(1000);
  const verticalScaleRef = useRef(CAMERA_MONOLITH_DEFAULT_VERTICAL_SCALE);
  const frameIntervalRef = useRef(CAMERA_MONOLITH_CAPTURE_INTERVAL_MS);
  const connectedRef = useRef(false);
  const mobileCountRef = useRef(0);
  const sourceVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const streamsRef = useRef<CameraMonolithStream[]>([]);
  const localSequenceRef = useRef(1);
  const controlStore = useCreateStore();
  const [theme, setTheme] = useState<FieldTheme>("dark");
  const [gridMark, setGridMark] = useState<GridMark>("dot");

  const { socket, connected, presence } = useCameraMonolithSocket("screen");
  const streams = useCameraMonolithViewer(socket);

  useEffect(() => {
    streamsRef.current = streams;
  }, [streams]);

  const registerSource = useCallback(
    (publisherId: string, video: HTMLVideoElement | null) => {
      if (video) sourceVideosRef.current.set(publisherId, video);
      else sourceVideosRef.current.delete(publisherId);
    },
    [],
  );

  useEffect(() => {
    connectedRef.current = connected;
    mobileCountRef.current = presence?.mobiles ?? 0;
  }, [connected, presence?.mobiles]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CAMERA_MONOLITH_CAPTURE_WIDTH;
    canvas.height = CAMERA_MONOLITH_CAPTURE_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let sampling = false;
    let cancelled = false;

    const sample = async () => {
      if (sampling) return;
      sampling = true;
      try {
        for (const { publisherId } of streamsRef.current) {
          if (cancelled) break;
          const video = sourceVideosRef.current.get(publisherId);
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) continue;
          if (!drawVideoCover(context, video)) continue;
          let image: ImageBitmap;
          try {
            image = await createImageBitmap(canvas);
          } catch {
            continue;
          }
          if (cancelled) {
            image.close();
            continue;
          }
          const capturedAt = Date.now();
          const enqueued = sceneRef.current?.enqueueFrame({
            id: `${publisherId}:${localSequenceRef.current}`,
            sequence: localSequenceRef.current,
            from: publisherId,
            capturedAt,
            receivedAt: capturedAt,
            width: CAMERA_MONOLITH_CAPTURE_WIDTH,
            height: CAMERA_MONOLITH_CAPTURE_HEIGHT,
            image,
          });
          if (!enqueued) image.close();
          localSequenceRef.current += 1;
        }
      } finally {
        sampling = false;
      }
    };

    let timeout: number | null = null;
    const scheduleSample = async () => {
      await sample();
      if (!cancelled) {
        timeout = window.setTimeout(
          () => void scheduleSample(),
          frameIntervalRef.current,
        );
      }
    };
    void scheduleSample();
    return () => {
      cancelled = true;
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, []);

  const redrawField = useCallback(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    const grid = gridRef.current;
    const context = backgroundCanvas?.getContext("2d");
    if (!backgroundCanvas || !interactionCanvas || !grid || !context) return;
    const palette = FIELD_PALETTES[themeRef.current];
    const fieldPalette =
      surfaceRef.current === "white"
        ? palette
        : { ...palette, selectedCell: palette.paper };
    drawField(
      context,
      interactionCanvas.clientWidth,
      interactionCanvas.clientHeight,
      grid,
      selectionRef.current,
      fieldPalette,
      gridMarkRef.current,
    );
    const temporalCells = getTemporalCells(
      selectionRef.current,
      grid,
      interactionCanvas.clientWidth,
      interactionCanvas.clientHeight,
    );
    if (compositionEnabledRef.current) {
      temporalCells.push(
        ...getTemporalCompositionCells(
          compositionAnchorsRef.current,
          grid,
          interactionCanvas.clientWidth,
          interactionCanvas.clientHeight,
        ),
      );
    }
    sceneRef.current?.setTemporalCells(temporalCells);
    sceneRef.current?.updateField();
  }, []);

  useControls(
    () => ({
      Agents: folder({
        count: { value: 100, min: 0, max: 250, step: 50 },
        "avoid overlap": { value: false },
        scale: { value: 2, min: 1, max: 4, step: 0.05 },
      }),
      Motion: folder({
        depth: { value: 64, min: 0, max: 140, step: 2 },
        "tail motion": { value: 0.38, min: 0, max: 0.7, step: 0.01 },
      }),
      Camera: folder({
        input: {
          value: true,
          onChange: (enabled: boolean) => {
            cameraInputRef.current = enabled;
          },
        },
        "reset view": button(() => sceneRef.current?.resetCamera()),
      }),
      Composition: folder({
        "2×2+ blocks": {
          value: false,
          onChange: (enabled: boolean) => {
            compositionEnabledRef.current = enabled;
            if (!enabled) compositionAnchorsRef.current = [];
            redrawField();
          },
        },
      }),
      Duration: folder({
        "pillar growth": {
          value: 1000,
          min: 0,
          max: 1000,
          step: 1,
          onChange: (rate: number) => {
            growthRateRef.current = rate;
            sceneRef.current?.setTemporalGrowthRate(rate);
          },
        },
        "vertical scale": {
          value: CAMERA_MONOLITH_DEFAULT_VERTICAL_SCALE,
          min: 0.25,
          max: 4,
          step: 0.05,
          onChange: (scale: number) => {
            verticalScaleRef.current = scale;
            sceneRef.current?.setVerticalScale(scale);
          },
        },
        "frame interval (ms)": {
          value: CAMERA_MONOLITH_CAPTURE_INTERVAL_MS,
          min: 50,
          max: 2000,
          step: 10,
          onChange: (interval: number) => {
            frameIntervalRef.current = interval;
          },
        },
      }),
      Field: folder({
        blocks: {
          value: "company" as CameraSurface,
          options: {
            COMPANY: "company",
            WHITE: "white",
            CAT: "cat",
            KISS: "kiss",
            POLITICIAN: "politician",
          },
          onChange: (surface: CameraSurface) => {
            surfaceRef.current = surface;
            sceneRef.current?.setAttentionSurface(surface);
            redrawField();
          },
        },
        "image speed": {
          value: 12,
          min: 0,
          max: 24,
          step: 1,
          onChange: (speed: number) => {
            mediaSpeedRef.current = speed;
            sceneRef.current?.setMediaSpeed(speed);
          },
        },
        "media strata": {
          value: true,
          onChange: (enabled: boolean) => {
            sceneRef.current?.setMediaStrataEnabled(enabled);
          },
        },
        "corner +": {
          value: false,
          onChange: (enabled: boolean) => {
            const nextMark: GridMark = enabled ? "cross" : "dot";
            gridMarkRef.current = nextMark;
            setGridMark(nextMark);
          },
        },
      }),
      Appearance: folder({
        "fish colour": { value: "#cf741c" },
        "fin opacity": { value: 0.76, min: 0.2, max: 1, step: 0.02 },
        "natural model": { value: true },
        "dark mode": {
          value: true,
          onChange: (darkMode: boolean) => {
            const nextTheme: FieldTheme = darkMode ? "dark" : "light";
            themeRef.current = nextTheme;
            setTheme(nextTheme);
            sceneRef.current?.setPaperColor(FIELD_PALETTES[nextTheme].paper);
            sceneRef.current?.setBlockColor(
              FIELD_PALETTES[nextTheme].selectedCell,
            );
          },
        },
      }),
    }),
    { store: controlStore },
    [controlStore, redrawField],
  );

  const selectTrace = useCallback(
    (points: readonly TracePoint[]) => {
      const canvas = interactionCanvasRef.current;
      const grid = gridRef.current;
      if (!canvas || !grid || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
        return;
      }
      const current = selectionRef.current;
      const keys = new Set(
        getAnchoredCells(current, grid, canvas.clientWidth, canvas.clientHeight).map(
          (cell) => getCellKey(cell.column, cell.row),
        ),
      );
      const next = [...current];
      const nextComposition = [...compositionAnchorsRef.current];
      for (const point of points) {
        if (next.length >= MAX_TEMPORAL_ANCHOR_COUNT) break;
        const cell = getCellAtPoint(point.x, point.y, grid);
        const key = getCellKey(cell.column, cell.row);
        if (keys.has(key)) continue;
        keys.add(key);
        const anchor: TemporalAnchor = {
          xRatio: cell.centerX / canvas.clientWidth,
          yRatio: cell.centerY / canvas.clientHeight,
          createdAt: elapsedSecondsRef.current,
          id: `${cell.column}:${cell.row}:${elapsedSecondsRef.current.toFixed(6)}`,
        };
        next.push(anchor);
        if (compositionEnabledRef.current) {
          nextComposition.push(createTemporalCompositionAnchor(anchor, cell));
        }
      }
      if (next.length === current.length) return;
      selectionRef.current = next;
      compositionAnchorsRef.current = nextComposition;
      redrawField();
    },
    [redrawField],
  );

  useEffect(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const threeCanvas = threeCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    if (!backgroundCanvas || !threeCanvas || !interactionCanvas) return;
    const backgroundContext = backgroundCanvas.getContext("2d");
    if (!backgroundContext) return;

    const scene = new CameraMonolithScene({
      canvas: threeCanvas,
      fieldCanvas: backgroundCanvas,
      paperColor: FIELD_PALETTES.dark.paper,
      blockColor: FIELD_PALETTES.dark.selectedCell,
      cameraProjection: "orthographic",
    });
    sceneRef.current = scene;
    scene.setMediaSpeed(mediaSpeedRef.current);
    scene.setTemporalGrowthRate(growthRateRef.current);
    scene.setVerticalScale(verticalScaleRef.current);
    scene.setAttentionSurface(surfaceRef.current);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let elapsedSeconds = elapsedSecondsRef.current;

    const sizeCanvases = () => {
      const bounds = interactionCanvas.getBoundingClientRect();
      const pixelRatio = 1;
      backgroundCanvas.width = Math.round(bounds.width * pixelRatio);
      backgroundCanvas.height = Math.round(bounds.height * pixelRatio);
      interactionCanvas.width = Math.round(bounds.width * pixelRatio);
      interactionCanvas.height = Math.round(bounds.height * pixelRatio);
      backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      gridRef.current = createGrid(bounds.width, bounds.height);
      scene.setSize(bounds.width, bounds.height);
      redrawField();
    };

    const minimumFrameDuration = 1000 / 24;
    let lastRenderedAt = 0;
    let lastDiagnosticsAt = 0;
    const render = (time: number) => {
      frameRef.current = requestAnimationFrame(render);
      if (time - lastRenderedAt < minimumFrameDuration) return;
      lastRenderedAt = time;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;
      if (!reduceMotion.matches) {
        elapsedSeconds += deltaSeconds;
        elapsedSecondsRef.current = elapsedSeconds;
      }
      scene.render(elapsedSeconds);
      if (time - lastDiagnosticsAt >= 250) {
        lastDiagnosticsAt = time;
        interactionCanvas.dataset.connected = String(connectedRef.current);
        interactionCanvas.dataset.connectedMobiles = String(mobileCountRef.current);
        interactionCanvas.dataset.rendererRevision = String(
          CAMERA_MONOLITH_RENDERER_REVISION,
        );
        interactionCanvas.dataset.performanceSelectedCells = String(
          selectionRef.current.length,
        );
        interactionCanvas.dataset.performanceTemporalColumns = String(
          scene.getTemporalColumnCount(),
        );
        interactionCanvas.dataset.performanceMediaStrata = String(
          scene.getMediaStrataCount(),
        );
      }
    };

    sizeCanvases();
    const resizeObserver = new ResizeObserver(sizeCanvases);
    resizeObserver.observe(interactionCanvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [redrawField]);

  useEffect(() => {
    redrawField();
  }, [theme, gridMark, redrawField]);

  const finishTrace = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    tracePointRef.current = null;
    cameraGestureRef.current = null;
  };

  return (
    <main
      className={styles.page}
      data-theme={theme}
      onContextMenuCapture={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <canvas ref={backgroundCanvasRef} className={styles.backgroundCanvas} aria-hidden="true" />
      <canvas ref={threeCanvasRef} className={styles.threeCanvas} aria-hidden="true" />
      {streams.map((stream) => (
        <CameraSource {...stream} key={stream.publisherId} register={registerSource} />
      ))}
      <canvas
        ref={interactionCanvasRef}
        className={styles.interactionCanvas}
        aria-label="A temporal camera-image field. Click or drag across cells to reveal incoming mobile camera frames, Alt-drag or right-drag to rotate, and use the wheel to zoom."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          if (cameraInputRef.current && (event.altKey || event.button === 2)) {
            event.preventDefault();
            tracePointRef.current = null;
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const point = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!point) return;
          tracePointRef.current = point;
          selectTrace([point]);
        }}
        onPointerMove={(event) => {
          const gesture = cameraGestureRef.current;
          if (
            gesture &&
            gesture.pointerId === event.pointerId &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          ) {
            sceneRef.current?.orbit(
              event.clientX - gesture.x,
              event.clientY - gesture.y,
            );
            cameraGestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const previous = tracePointRef.current;
          if (!previous || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const next = sceneRef.current?.screenToField(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
          );
          if (!next) return;
          selectTrace(
            getTracePoints(
              previous,
              next,
              gridRef.current?.cellSize ?? CAMERA_MONOLITH_GRID_SETTINGS.cellMin,
            ),
          );
          tracePointRef.current = next;
        }}
        onPointerUp={finishTrace}
        onPointerCancel={finishTrace}
        onLostPointerCapture={() => {
          tracePointRef.current = null;
          cameraGestureRef.current = null;
        }}
        onContextMenu={(event) => {
          if (cameraInputRef.current) event.preventDefault();
        }}
        onWheel={(event) => {
          if (!cameraInputRef.current) return;
          event.preventDefault();
          sceneRef.current?.zoom(event.deltaY);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            selectionRef.current = [];
            compositionAnchorsRef.current = [];
            redrawField();
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectTrace([
            sceneRef.current?.screenToField(
              event.currentTarget.clientWidth / 2,
              event.currentTarget.clientHeight / 2,
            ) ?? {
              x: event.currentTarget.clientWidth / 2,
              y: event.currentTarget.clientHeight / 2,
            },
          ]);
        }}
      />
      <aside className={styles.parameterPanel} aria-label="Field parameters">
        <LevaPanel
          collapsed={false}
          flat
          hideCopyButton
          store={controlStore}
          theme={{
            colors: {
              elevation1: FIELD_PALETTES[theme].paper,
              elevation2: FIELD_PALETTES[theme].paper,
              elevation3: theme === "dark" ? "#272925" : "#dfdfda",
              accent1: FIELD_PALETTES[theme].ink,
              accent2: FIELD_PALETTES[theme].ink,
              accent3: FIELD_PALETTES[theme].ink,
              highlight1: FIELD_PALETTES[theme].ink,
              highlight2: FIELD_PALETTES[theme].ink,
              highlight3: FIELD_PALETTES[theme].ink,
              folderWidgetColor: FIELD_PALETTES[theme].ink,
              folderTextColor: FIELD_PALETTES[theme].ink,
            },
            radii: { xs: "0px", sm: "0px", lg: "0px" },
            fonts: {
              mono: "Arial, Helvetica, sans-serif",
              sans: "Arial, Helvetica, sans-serif",
            },
            fontSizes: { root: "12px" },
            sizes: {
              rootWidth: "min(280px, calc(100vw - 24px))",
              controlWidth: "142px",
              rowHeight: "28px",
              folderTitleHeight: "26px",
              checkboxSize: "18px",
              titleBarHeight: "42px",
            },
            shadows: { level1: "none", level2: "none" },
            borderWidths: {
              root: "1px",
              input: "1px",
              focus: "2px",
              hover: "1px",
              active: "2px",
              folder: "1px",
            },
            fontWeights: { label: "500", folder: "600", button: "500" },
          }}
          titleBar={{ title: "Parameters", drag: false, filter: false }}
        />
      </aside>
    </main>
  );
}
