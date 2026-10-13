"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { objectThings, sceneThings } from "./model/catalog";
import { materials, normalisedConstituents, type MaterialId } from "./model/materials";
import type { Budget, FromWorker, SeenRegion, ToWorker } from "./inference/protocol";
import { typesetFormula } from "./render/formula";
import { Field, TYPE_SIZES, coverRect, regionKey, type TypeSize, type View } from "./render/field";
import styles from "./chemical-decomposition.module.css";

type Phase = "idle" | "loading" | "running" | "error";

/** Longest side of the frame handed to the models. */
const ANALYSIS_SIDE = 720;
const DRAW_INTERVAL_MS = 1000 / 24;

// An iPhone closed the page right after the first analyses with all three
// models at ~7 Hz, then reloaded it after 10–20 s with the scene parser alone
// on WebGPU (2026-10-13). Touch devices now run the scene parser alone on the
// plain WebAssembly runtime, at a third of the pixels and at most 2 Hz;
// `?recognise=objects,materials` adds the others and `?device=webgpu` the GPU,
// for staged on-device checks.
const DESKTOP_BUDGET: Budget = { objects: true, materials: true, segmentPixels: 200_000, detectorSize: 640, looksPerFrame: 4 };
const PHONE_BUDGET: Budget = { objects: false, materials: false, segmentPixels: 64_000, detectorSize: 416, looksPerFrame: 1 };
const PHONE_INTERVAL_MS = 500;

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
}

// Authoring parameters for measuring without a phone or camera:
// `?budget=phone` takes the touch budget anywhere, `?device=wasm|webgpu`
// forces a backend, and `?source=<image url>` replaces the camera with a
// still image and starts at once; `?measure` writes the analysis count and
// time into the document title.
function parameters() {
  return new URLSearchParams(window.location.search);
}

function usesPhoneBudget() {
  return isTouchDevice() || parameters().get("budget") === "phone";
}

function chooseBudget(): Budget {
  const query = parameters();
  const device = query.get("device");
  const forced = device === "wasm" || device === "webgpu" ? device : undefined;
  if (!usesPhoneBudget()) return { ...DESKTOP_BUDGET, device: forced };
  const requested = query.get("recognise")?.split(",") ?? [];
  return { ...PHONE_BUDGET, objects: requested.includes("objects"), materials: requested.includes("materials"), device: forced ?? "wasm" };
}

/** A still image as a camera-like stream (CORS-enabled URLs only). */
async function imageStream(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const context = canvas.getContext("2d")!;
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const draw = () => context.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale);
  draw();
  // Safari's canvas stream only carries frames while the canvas is redrawn.
  const timer = window.setInterval(draw, 100);
  const stream = canvas.captureStream(15);
  stream.getVideoTracks()[0]?.addEventListener("ended", () => window.clearInterval(timer));
  return stream;
}

const READING_ROWS = 8;
const things = [...sceneThings, ...objectThings];

function formatShare(share: number) {
  const percent = share * 100;
  if (percent >= 10) return `${percent.toFixed(0)}%`;
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  const digits = Math.min(8, 1 - Math.floor(Math.log10(percent)));
  return `${percent.toFixed(digits).replace(/0+$/, "")}%`;
}

function Formula({ formula }: { formula: string }) {
  return (
    <span>
      {typesetFormula(formula).map((run, index) =>
        run.level === "sub" ? <sub key={index}>{run.text}</sub> : run.level === "sup" ? <sup key={index}>{run.text}</sup> : run.text,
      )}
    </span>
  );
}

function Reading({ region }: { region: SeenRegion }) {
  const material = materials[region.material as MaterialId];
  const rows = normalisedConstituents(material).slice(0, READING_ROWS);
  return (
    <section className={styles.reading} aria-live="polite">
      <h2>
        {things[region.thing]?.name} <span>{material.name}</span>
      </h2>
      <ol>
        {rows.map(([formula, share]) => (
          <li key={formula}>
            <Formula formula={formula} />
            <span>{formatShare(share)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ChemicalDecompositionOne() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<Field | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<CanvasRenderingContext2D | null>(null);
  const spareRef = useRef<ArrayBuffer | null>(null);
  const busyRef = useRef(false);
  const readyRef = useRef(false);
  const viewRef = useRef<View>("over");
  const retryRef = useRef<() => void>(() => {});
  const intervalRef = useRef(0);
  const sentAtRef = useRef(0);
  const analysesRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{ step: number; steps: number; share: number } | null>(null);
  const [analysed, setAnalysed] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("over");
  const [typeSize, setTypeSize] = useState<TypeSize>("medium");
  const [panelOpen, setPanelOpen] = useState(false);
  const [reading, setReading] = useState<SeenRegion | null>(null);

  /** Copies the visible part of the camera view and hands it to the worker. */
  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const worker = workerRef.current;
    if (!video || !worker || !readyRef.current || busyRef.current || document.hidden) return;
    if (video.readyState < 2 || !video.videoWidth) {
      requestAnimationFrame(() => retryRef.current());
      return;
    }
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scale = ANALYSIS_SIDE / Math.max(screenWidth, screenHeight);
    const width = Math.round(screenWidth * scale);
    const height = Math.round(screenHeight * scale);
    let capture = captureRef.current;
    if (!capture) {
      capture = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      captureRef.current = capture;
    }
    if (capture.canvas.width !== width || capture.canvas.height !== height) {
      capture.canvas.width = width;
      capture.canvas.height = height;
    }
    const { sx, sy, sw, sh } = coverRect(video.videoWidth, video.videoHeight, screenWidth, screenHeight);
    capture.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    const pixels = capture.getImageData(0, 0, width, height).data;
    let buffer = spareRef.current;
    spareRef.current = null;
    if (!buffer || buffer.byteLength !== pixels.byteLength) buffer = new ArrayBuffer(pixels.byteLength);
    new Uint8ClampedArray(buffer).set(pixels);
    busyRef.current = true;
    sentAtRef.current = performance.now();
    const message: ToWorker = { type: "frame", buffer, width, height };
    worker.postMessage(message, [buffer]);
  }, []);

  useEffect(() => {
    retryRef.current = sendFrame;
  }, [sendFrame]);

  const stop = useCallback(() => {
    readyRef.current = false;
    busyRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setError("");
    setPhase("loading");
    setProgress(null);
    try {
      const source = parameters().get("source");
      if (!source && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
        throw new Error("카메라는 HTTPS 주소에서만 열립니다.");
      }
      const stream = source
        ? await imageStream(source)
        : await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      // Safari can reject play() with AbortError while the stream settles;
      // the muted autoplay element still starts, so only real errors stop us.
      await video.play().catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) throw reason;
      });

      const worker = new Worker(new URL("./inference/worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<FromWorker>) => {
        const message = event.data;
        if (message.type === "progress") {
          setProgress({ step: message.step, steps: message.steps, share: message.loaded / message.total });
        } else if (message.type === "ready") {
          readyRef.current = true;
          setPhase("running");
          sendFrame();
        } else if (message.type === "analysis") {
          spareRef.current = message.buffer;
          busyRef.current = false;
          fieldRef.current?.setAnalysis(message);
          setAnalysed(true);
          if (parameters().has("measure")) {
            analysesRef.current += 1;
            document.title = `${analysesRef.current} analyses · ${Math.round(message.milliseconds)} ms`;
          }
          const wait = intervalRef.current - (performance.now() - sentAtRef.current);
          if (wait > 0) window.setTimeout(sendFrame, wait);
          else sendFrame();
        } else {
          busyRef.current = false;
          console.error("[chemical-decomposition]", message.message);
          setError(message.message);
          setPhase("error");
          stop();
        }
      };
      worker.onerror = (event) => {
        setError(event.message || "분석기를 시작하지 못했습니다.");
        setPhase("error");
        stop();
      };
      intervalRef.current = usesPhoneBudget() ? PHONE_INTERVAL_MS : 0;
      worker.postMessage({ type: "start", budget: chooseBudget() } satisfies ToWorker);
    } catch (reason) {
      const name = reason instanceof DOMException ? reason.name : "";
      setError(
        name === "NotAllowedError"
          ? "카메라 사용이 허용되지 않았습니다."
          : reason instanceof Error ? reason.message : String(reason),
      );
      setPhase("error");
      stop();
    }
  }, [sendFrame, stop]);

  // Field, resize and the display-rate loop.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const field = new Field(canvas);
    fieldRef.current = field;
    const resize = () => field.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener("resize", resize);
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < DRAW_INTERVAL_MS) return;
      last = now;
      field.draw(videoRef.current, viewRef.current, now);
    };
    frame = requestAnimationFrame(loop);
    const resume = () => {
      if (!document.hidden) sendFrame();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", resume);
      fieldRef.current = null;
      stop();
    };
  }, [sendFrame, stop]);

  useEffect(() => {
    if (!parameters().get("source")) return;
    const timer = window.setTimeout(() => void start(), 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  useEffect(() => {
    viewRef.current = view;
    fieldRef.current?.invalidate();
  }, [view]);

  useEffect(() => {
    fieldRef.current?.setTypeSize(TYPE_SIZES[typeSize]);
  }, [typeSize]);

  const tap = (event: PointerEvent<HTMLCanvasElement>) => {
    const field = fieldRef.current;
    if (!field || phase !== "running") return;
    const index = field.regionAt(event.clientX, event.clientY);
    const region = field.region(index);
    if (!region || (reading && regionKey(reading) === regionKey(region))) {
      field.select(null);
      setReading(null);
      return;
    }
    field.select(regionKey(region));
    setReading(region);
    setPanelOpen(false);
  };

  const status =
    phase === "loading"
      ? progress === null
        ? "모델 준비 중"
        : `모델 받는 중${progress.steps > 1 ? ` ${progress.step + 1}/${progress.steps}` : ""} · ${Math.floor(progress.share * 100)}%`
      : phase === "running" && !analysed ? "분석 중" : null;

  return (
    <main className={styles.stage}>
      <video ref={videoRef} className={styles.video} data-view={view} autoPlay muted playsInline aria-hidden="true" />
      {view === "over" && <div className={styles.dim} aria-hidden="true" />}
      <canvas
        ref={canvasRef}
        className={styles.field}
        role="img"
        aria-label="카메라에 보이는 것을 그 물질의 화학식으로 덮은 화면"
        onPointerUp={tap}
      />

      {phase === "idle" && (
        <div className={styles.prompt}>
          <p>카메라에 보이는 것을 그것을 이루는 화학식으로 분해합니다.</p>
          <button type="button" onClick={start}>카메라 켜기</button>
        </div>
      )}
      {phase === "error" && (
        <div className={styles.prompt} role="alert">
          <p>{error}</p>
          <button type="button" onClick={start}>다시 시도</button>
        </div>
      )}
      {status && <p className={styles.status} role="status">{status}</p>}

      {reading && phase === "running" && <Reading region={reading} />}

      {phase === "running" && (
        <div className={styles.control}>
          {panelOpen && (
            <div id="chemical-decomposition-options" className={styles.panel} role="group" aria-label="보기">
              <p className={styles.heading}>보기</p>
              <div className={styles.chips} role="group" aria-label="카메라">
                <button type="button" aria-pressed={view === "over"} onClick={() => setView("over")}>카메라 위에</button>
                <button type="button" aria-pressed={view === "decomposed"} onClick={() => setView("decomposed")}>화학식만</button>
              </div>
              <p className={styles.heading}>글자</p>
              <div className={styles.chips} role="group" aria-label="글자 크기">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button key={size} type="button" aria-pressed={typeSize === size} onClick={() => setTypeSize(size)}>
                    {size === "small" ? "작게" : size === "medium" ? "보통" : "크게"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            className={styles.trigger}
            aria-label="보기 옵션"
            aria-expanded={panelOpen}
            aria-controls="chemical-decomposition-options"
            onClick={() => {
              setPanelOpen((open) => !open);
              fieldRef.current?.select(null);
              setReading(null);
            }}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="7" cy="6" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="13" cy="14" r="2.2" fill="#171717" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
