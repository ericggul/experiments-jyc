"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "seeking" | "tracking" | "error";

// The outer contours leave the camera's actual eye and mouth pixels visible.
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const MOUTH = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const CONTOURS = [LEFT_EYE, RIGHT_EYE, MOUTH];

type FacePose = { x: number; y: number; span: number; angle: number };
type FeatureBounds = { x: number; y: number; width: number; height: number; centerX: number; centerY: number };
type FeatureFrame = FeatureBounds & { canvas: HTMLCanvasElement };
type CameraFrame = {
  width: number;
  height: number;
  pose: FacePose;
  features: FeatureFrame[];
};

// Ten nested impressions per feature, from the original size to ten times it.
const LAYER_SCALES = [1, 1.5, 2.1, 2.9, 3.9, 5.1, 6.35, 7.6, 8.8, 10] as const;

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

function featureBounds(points: NormalizedLandmark[], contour: number[], width: number, height: number): FeatureBounds {
  const xs = contour.map((index) => points[index].x * width);
  const ys = contour.map((index) => points[index].y * height);
  const x = Math.max(0, Math.floor(Math.min(...xs) - 1));
  const y = Math.max(0, Math.floor(Math.min(...ys) - 1));
  const right = Math.min(width, Math.ceil(Math.max(...xs) + 1));
  const bottom = Math.min(height, Math.ceil(Math.max(...ys) + 1));
  return { x, y, width: right - x, height: bottom - y, centerX: (x + right) / 2, centerY: (y + bottom) / 2 };
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
) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const scale = Math.max(width / frame.width, height / frame.height);
  const imageWidth = frame.width * scale;
  const imageHeight = frame.height * scale;
  const offsetX = (width - imageWidth) / 2;
  const offsetY = (height - imageHeight) / 2;
  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.translate(offsetX + pose.x * scale, offsetY + pose.y * scale);
  context.rotate(pose.angle - frame.pose.angle);
  const poseScale = pose.span / frame.pose.span;
  context.scale(poseScale, poseScale);
  context.translate(-offsetX - frame.pose.x * scale, -offsetY - frame.pose.y * scale);
  for (let layer = LAYER_SCALES.length - 1; layer >= 0; layer -= 1) {
    const layerScale = LAYER_SCALES[layer];
    for (const feature of frame.features) {
      if (feature.width < 1 || feature.height < 1) continue;
      const centerX = offsetX + feature.centerX * scale;
      const centerY = offsetY + feature.centerY * scale;
      context.drawImage(
        feature.canvas,
        centerX - feature.width * scale * layerScale / 2,
        centerY - feature.height * scale * layerScale / 2,
        feature.width * scale * layerScale,
        feature.height * scale * layerScale,
      );
    }
  }
  context.restore();
}

function paint(
  canvas: HTMLCanvasElement,
  current: CameraFrame | null,
  pose: FacePose | null,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3, Math.sqrt(3_000_000 / area));
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);
  if (!current || !pose) return;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawFrame(context, current, pose);
}

export default function FaceTraceThree() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    if (update) setPhase("idle");
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
                previousFrame = currentFrame;
                currentFrame = {
                  canvas: capture,
                  pose,
                  features: CONTOURS.map((contour) => featureBounds(points, contour, capture.width, capture.height)),
                  capturedAt: now,
                };
                displayPose ??= { ...pose };
                lastFace = now;
              } else {
                currentFrame = null;
                previousFrame = null;
                displayPose = null;
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
          if (now - lastFace > 300) {
            currentFrame = null;
            previousFrame = null;
            displayPose = null;
          }
          if (currentFrame && displayPose) {
            const elapsed = Math.min(50, lastMotion ? now - lastMotion : 16);
            displayPose = smoothPose(displayPose, currentFrame.pose, elapsed);
          }
          lastMotion = now;
          if (canvasRef.current && now - lastPaint >= 42) {
            paint(canvasRef.current, currentFrame, previousFrame, displayPose, now);
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
      <video ref={videoRef} className={styles.source} playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.image} aria-label="카메라로 찍은 두 눈과 입이 각각 열 겹으로 확장됩니다" role="img" />
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
