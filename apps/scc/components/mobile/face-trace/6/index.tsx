"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { createLiquidField } from "./liquid-field";
import { FEATURE_SIZE, updateFeatureAtlas } from "./feature-atlas";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "seeking" | "tracking" | "error";

// The outer contours leave the camera's actual eye and mouth pixels visible.
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const CONTOURS = [LEFT_EYE, RIGHT_EYE, MOUTH];

type FacePose = { x: number; y: number; span: number; angle: number };
type CameraFrame = {
  canvas: HTMLCanvasElement;
  pose: FacePose;
  capturedAt: number;
};

function readPose(points: NormalizedLandmark[], width: number, height: number): FacePose | null {
  const nose = points[1];
  const leftOuter = points[33];
  const leftInner = points[133];
  const rightOuter = points[263];
  const rightInner = points[362];
  if (!nose || !leftOuter || !leftInner || !rightOuter || !rightInner) return null;
  const leftX = (leftOuter.x + leftInner.x) * width / 2;
  const leftY = (leftOuter.y + leftInner.y) * height / 2;
  const rightX = (rightOuter.x + rightInner.x) * width / 2;
  const rightY = (rightOuter.y + rightInner.y) * height / 2;
  const span = Math.hypot(rightX - leftX, rightY - leftY);
  if (span < 10) return null;
  return {
    x: nose.x * width,
    y: nose.y * height,
    span,
    angle: Math.atan2(rightY - leftY, rightX - leftX),
  };
}

function smoothPose(current: FacePose, target: FacePose, elapsed: number): FacePose {
  const positionError = Math.hypot(target.x - current.x, target.y - current.y);
  const positionTime = Math.max(55, 150 / (1 + positionError / 24));
  const positionBlend = 1 - Math.exp(-elapsed / positionTime);
  const shapeBlend = 1 - Math.exp(-elapsed / 170);
  const angleDifference = Math.atan2(Math.sin(target.angle - current.angle), Math.cos(target.angle - current.angle));
  return {
    x: current.x + (target.x - current.x) * positionBlend,
    y: current.y + (target.y - current.y) * positionBlend,
    span: current.span + (target.span - current.span) * shapeBlend,
    angle: current.angle + angleDifference * shapeBlend,
  };
}

function centerScale(x: number, y: number, width: number, height: number) {
  const distance = Math.hypot((x - width / 2) / (width / 2), (y - height / 2) / (height / 2));
  const amount = Math.max(0, Math.min(1, (0.85 - distance) / 0.7));
  const eased = amount * amount * (3 - 2 * amount);
  return 1 + eased;
}

function traceContour(
  context: CanvasRenderingContext2D,
  points: NormalizedLandmark[],
  indices: number[],
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
) {
  const first = points[indices[0]];
  const last = points[indices[indices.length - 1]];
  if (!first || !last) return;
  context.moveTo(offsetX + (first.x + last.x) * width / 2, offsetY + (first.y + last.y) * height / 2);
  for (let index = 0; index < indices.length; index += 1) {
    const point = points[indices[index]];
    const next = points[indices[(index + 1) % indices.length]];
    if (!point || !next) return;
    context.quadraticCurveTo(
      offsetX + point.x * width,
      offsetY + point.y * height,
      offsetX + (point.x + next.x) * width / 2,
      offsetY + (point.y + next.y) * height / 2,
    );
  }
  context.closePath();
}

function drawFrame(
  context: CanvasRenderingContext2D,
  frame: CameraFrame,
  pose: FacePose,
  opacity: number,
) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  context.save();
  context.globalAlpha = opacity;
  context.translate(width, 0);
  context.scale(-1, 1);
  context.translate(width / 2, height * 0.34);
  context.rotate(pose.angle - frame.pose.angle);
  const poseScale = width * 0.45 / frame.pose.span;
  context.scale(poseScale, poseScale);
  context.translate(-frame.pose.x, -frame.pose.y);
  context.drawImage(frame.canvas, 0, 0);
  context.restore();
}

function paint(
  canvas: HTMLCanvasElement,
  group: HTMLCanvasElement,
  current: CameraFrame | null,
  previous: CameraFrame | null,
  pose: FacePose | null,
  now: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(900_000 / area));
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);
  if (!current || !pose) return;
  const groupSize = Math.max(1, Math.round(Math.min(width * 0.26, height * 0.14)));
  if (group.width !== groupSize || group.height !== groupSize) {
    group.width = groupSize;
    group.height = groupSize;
  }
  const groupContext = group.getContext("2d");
  if (!groupContext) return;
  groupContext.clearRect(0, 0, groupSize, groupSize);
  const blend = previous ? Math.min(1, (now - current.capturedAt) / 65) : 1;
  if (previous && blend < 1) drawFrame(groupContext, previous, pose, 1);
  drawFrame(groupContext, current, pose, blend);

  // One live set of features is placed below center, then copied around the same circle.
  const radius = Math.max(0, Math.min(height * 0.25, width * 0.5 - groupSize * 0.53));
  for (let copy = 0; copy < 12; copy += 1) {
    const angle = copy * Math.PI / 6;
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(angle);
    context.drawImage(group, -groupSize / 2, radius - groupSize / 2);
    context.restore();
  }
}

function clearLiquid(canvas: HTMLCanvasElement | null) {
  const gl = canvas?.getContext("webgl2");
  if (!gl) return;
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export default function FaceTraceSix() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const fieldRendererRef = useRef<ReturnType<typeof createLiquidField> | null>(null);
  const atlasRef = useRef<HTMLCanvasElement | null>(null);
  const tileRef = useRef<HTMLCanvasElement | null>(null);
  const atlasReadyRef = useRef(false);
  const targetSitesRef = useRef(new Float32Array([0.22, 0.35, 0.78, 0.35, 0.5, 0.75]));
  const displaySitesRef = useRef(new Float32Array([0.22, 0.35, 0.78, 0.35, 0.5, 0.75]));
  const targetRadiiRef = useRef(new Float32Array([0.08, 0.025, 0.08, 0.025, 0.11, 0.05]));
  const displayRadiiRef = useRef(new Float32Array([0.08, 0.025, 0.08, 0.025, 0.11, 0.05]));
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const startRef = useRef<() => void>(() => {});
  const grantedRef = useRef(false);
  const startingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  const stop = useCallback((update = true) => {
    requestRef.current += 1;
    startingRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    atlasReadyRef.current = false;
    clearLiquid(fieldRef.current);
    if (update) setPhase("idle");
  }, []);

  useEffect(() => {
    const canvas = fieldRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    let field: ReturnType<typeof createLiquidField> | null = null;
    let frame: number | null = null;
    let lastDraw = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      field?.resize(canvas.clientWidth, canvas.clientHeight);
      lastDraw = 0;
    };
    const draw = (now: number) => {
      if (field && atlasReadyRef.current && !document.hidden && now - lastDraw >= 42) {
        const elapsed = Math.min(50, lastDraw ? now - lastDraw : 42);
        const blend = 1 - Math.exp(-elapsed / 150);
        const display = displaySitesRef.current;
        const target = targetSitesRef.current;
        const displayRadii = displayRadiiRef.current;
        const targetRadii = targetRadiiRef.current;
        for (let index = 0; index < display.length; index += 1) {
          display[index] += (target[index] - display[index]) * blend;
          displayRadii[index] += (targetRadii[index] - displayRadii[index]) * blend;
        }
        field.draw(reducedMotion.matches ? 0 : now / 1000, display, displayRadii);
        lastDraw = now;
      }
      frame = requestAnimationFrame(draw);
    };
    const initialize = () => {
      try {
        field = createLiquidField(gl);
        fieldRendererRef.current = field;
        if (atlasReadyRef.current && atlasRef.current) field.updateTexture(atlasRef.current);
        resize();
      } catch (error) {
        console.error("Face trace liquid field could not start", error);
        field = null;
        fieldRendererRef.current = null;
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      field = null;
      fieldRendererRef.current = null;
    };
    const onContextRestored = () => initialize();
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    initialize();
    frame = requestAnimationFrame(draw);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      field?.destroy();
      fieldRendererRef.current = null;
    };
  }, []);

  const start = async () => {
    if (startingRef.current || streamRef.current) return;
    stop(false);
    startingRef.current = true;
    const request = requestRef.current;
    setPhase("loading");
    setMessage("");

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("카메라를 사용하려면 HTTPS가 필요합니다.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } },
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("카메라 화면을 준비할 수 없습니다.");
      video.srcObject = stream;
      await video.play();
      if (request !== requestRef.current) return;
      grantedRef.current = true;

      const files = await FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm");
      if (request !== requestRef.current) return;
      const landmarker = await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/models/gaze-tracking/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      if (request !== requestRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      startingRef.current = false;
      setPhase("seeking");

      let lastVideoTime = -1;
      let lastPaint = 0;
      let lastMotion = 0;
      let lastInference = 0;
      let lastFace = 0;
      let currentFrame: CameraFrame | null = null;
      let previousFrame: CameraFrame | null = null;
      let displayPose: FacePose | null = null;
      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          if (video.currentTime !== lastVideoTime && now - lastInference >= 65) {
            lastVideoTime = video.currentTime;
            lastInference = now;
            try {
              const points = landmarker.detectForVideo(video, now).faceLandmarks[0] ?? null;
              const pose = points && readPose(points, video.videoWidth, video.videoHeight);
              if (points && pose) {
                const capture = previousFrame?.canvas ?? document.createElement("canvas");
                if (capture.width !== video.videoWidth || capture.height !== video.videoHeight) {
                  capture.width = video.videoWidth;
                  capture.height = video.videoHeight;
                }
                const captureContext = capture.getContext("2d");
                if (!captureContext) throw new Error("카메라 프레임을 처리할 수 없습니다.");
                captureContext.clearRect(0, 0, capture.width, capture.height);
                captureContext.save();
                captureContext.beginPath();
                for (const contour of CONTOURS) {
                  traceContour(captureContext, points, contour, 0, 0, capture.width, capture.height);
                }
                captureContext.clip();
                captureContext.drawImage(video, 0, 0);
                captureContext.restore();

                const atlas = atlasRef.current ?? document.createElement("canvas");
                const tile = tileRef.current ?? document.createElement("canvas");
                if (!atlasRef.current) {
                  atlas.width = FEATURE_SIZE * 3;
                  atlas.height = FEATURE_SIZE;
                  atlasRef.current = atlas;
                }
                if (!tileRef.current) {
                  tile.width = FEATURE_SIZE;
                  tile.height = FEATURE_SIZE;
                  tileRef.current = tile;
                }
                if (updateFeatureAtlas(atlas, tile, video, points, CONTOURS)) {
                  atlasReadyRef.current = true;
                  fieldRendererRef.current?.updateTexture(atlas);
                  const displayCanvas = canvasRef.current;
                  if (displayCanvas) {
                    const viewWidth = displayCanvas.clientWidth;
                    const viewHeight = displayCanvas.clientHeight;
                    const cover = Math.max(viewWidth / video.videoWidth, viewHeight / video.videoHeight);
                    const offsetX = (viewWidth - video.videoWidth * cover) / 2;
                    const offsetY = (viewHeight - video.videoHeight * cover) / 2;
                    const centerX = offsetX + pose.x * cover;
                    const centerY = offsetY + pose.y * cover;
                    const enlargement = centerScale(centerX, centerY, viewWidth, viewHeight);
                    for (let feature = 0; feature < CONTOURS.length; feature += 1) {
                      const contour = CONTOURS[feature];
                      const featureX = contour.reduce((sum, index) => sum + points[index].x, 0) / contour.length;
                      const featureY = contour.reduce((sum, index) => sum + points[index].y, 0) / contour.length;
                      const imageX = offsetX + featureX * video.videoWidth * cover;
                      const imageY = offsetY + featureY * video.videoHeight * cover;
                      const x = centerX + (imageX - centerX) * enlargement;
                      const y = centerY + (imageY - centerY) * enlargement;
                      const xs = contour.map((index) => points[index].x);
                      const ys = contour.map((index) => points[index].y);
                      const radiusX = (Math.max(...xs) - Math.min(...xs)) * video.videoWidth * cover * enlargement / (2 * viewWidth);
                      const radiusY = (Math.max(...ys) - Math.min(...ys)) * video.videoHeight * cover * enlargement / (2 * viewHeight);
                      targetSitesRef.current[feature * 2] = Math.max(0.06, Math.min(0.94, 1 - x / viewWidth));
                      targetSitesRef.current[feature * 2 + 1] = Math.max(0.06, Math.min(0.94, y / viewHeight));
                      targetRadiiRef.current[feature * 2] = Math.max(0.012, Math.min(0.35, radiusX));
                      targetRadiiRef.current[feature * 2 + 1] = Math.max(0.012, Math.min(0.25, radiusY));
                    }
                  }
                } else if (atlasReadyRef.current) {
                  atlasReadyRef.current = false;
                  clearLiquid(fieldRef.current);
                }
                previousFrame = currentFrame;
                currentFrame = { canvas: capture, pose, capturedAt: now };
                displayPose ??= { ...pose };
                lastFace = now;
              } else {
                currentFrame = null;
                previousFrame = null;
                displayPose = null;
                if (atlasReadyRef.current) {
                  atlasReadyRef.current = false;
                  clearLiquid(fieldRef.current);
                }
              }
              const nextPhase = currentFrame ? "tracking" : "seeking";
              setPhase((current) => current === nextPhase ? current : nextPhase);
            } catch {
              stop(false);
              setMessage("얼굴 추적을 계속할 수 없습니다.");
              setPhase("error");
              return;
            }
          }
          if (currentFrame && now - lastFace > 300) {
            currentFrame = null;
            previousFrame = null;
            displayPose = null;
            atlasReadyRef.current = false;
            clearLiquid(fieldRef.current);
          }
          if (currentFrame && displayPose) {
            const elapsed = Math.min(50, lastMotion ? now - lastMotion : 16);
            displayPose = smoothPose(displayPose, currentFrame.pose, elapsed);
          }
          lastMotion = now;
          if (canvasRef.current && now - lastPaint >= 41) {
            groupRef.current ??= document.createElement("canvas");
            paint(canvasRef.current, groupRef.current, currentFrame, previousFrame, displayPose, now);
            lastPaint = now;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (request !== requestRef.current) return;
      stop(false);
      setMessage(error instanceof Error ? error.message : "카메라를 시작할 수 없습니다.");
      setPhase("error");
    }
  };

  useEffect(() => {
    startRef.current = () => { void start(); };
  });

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (grantedRef.current) startRef.current();
    };
    const onPageHide = () => stop(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      stop(false);
    };
  }, [stop]);

  return (
    <main className={styles.stage}>
      <canvas ref={fieldRef} className={styles.background} aria-hidden="true" />
      <video ref={videoRef} className={styles.source} playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.image} aria-label="액체처럼 흐르는 얼굴 이미지 위에 카메라로 찍은 눈 24개와 입 12개가 원주를 따라 보입니다" role="img" />
      {(phase === "idle" || phase === "error") && (
        <div className={styles.prompt}>
          {message && <p role="alert">{message}</p>}
          <button type="button" onClick={() => { void start(); }}>카메라 켜기</button>
        </div>
      )}
      {(phase === "loading" || phase === "seeking") && (
        <p className={styles.status} role="status">{phase === "loading" ? "카메라 준비 중" : "얼굴을 찾는 중"}</p>
      )}
    </main>
  );
}
