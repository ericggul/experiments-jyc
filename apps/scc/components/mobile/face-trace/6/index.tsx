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
const RINGS = Array.from({ length: 16 }, (_, index) => {
  const step = 16 - index;
  return {
    radius: step / 8,
    scale: Math.max(1, step / 4),
    count: step * 4,
    phase: step % 2 ? 0.5 : 0,
  };
});

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
  const offsetX = (pose.x / frame.canvas.width - 0.5) * width * 0.42;
  const offsetY = (pose.y / frame.canvas.height - 0.5) * height * 0.42;
  context.translate(width / 2 + offsetX, height * 0.34 + offsetY);
  context.rotate(pose.angle - frame.pose.angle);
  const poseScale = width * 2.5 / frame.canvas.width;
  context.scale(poseScale, poseScale);
  context.translate(-frame.pose.x, -frame.pose.y);
  context.drawImage(frame.canvas, 0, 0);
  context.restore();
}

function paint(
  canvas: HTMLCanvasElement,
  group: HTMLCanvasElement,
  boundsCanvas: HTMLCanvasElement,
  sprites: HTMLCanvasElement[],
  current: CameraFrame | null,
  previous: CameraFrame | null,
  pose: FacePose | null,
  now: number,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(650_000 / area));
  const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);
  if (!current || !pose) return;
  const originalGroupSize = Math.max(1, Math.round(Math.min(width * 0.22, height * 0.12)));
  const groupSize = originalGroupSize * 4;
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

  // Sample a small alpha mask so the repeated draws skip transparent margins.
  if (boundsCanvas.width !== 64 || boundsCanvas.height !== 64) {
    boundsCanvas.width = 64;
    boundsCanvas.height = 64;
  }
  const boundsContext = boundsCanvas.getContext("2d", { willReadFrequently: true });
  if (!boundsContext) return;
  boundsContext.clearRect(0, 0, 64, 64);
  boundsContext.drawImage(group, 0, 0, 64, 64);
  const alpha = boundsContext.getImageData(0, 0, 64, 64).data;
  let minX = 64;
  let minY = 64;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (alpha[(y * 64 + x) * 4 + 3] < 4) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) return;
  const left = Math.max(0, minX - 2) / 64;
  const top = Math.max(0, minY - 2) / 64;
  const right = Math.min(64, maxX + 3) / 64;
  const bottom = Math.min(64, maxY + 3) / 64;

  for (let quarterStep = 4; quarterStep <= 15; quarterStep += 1) {
    const sprite = sprites[quarterStep - 1] ?? document.createElement("canvas");
    sprites[quarterStep - 1] = sprite;
    const size = Math.max(1, Math.round(originalGroupSize * quarterStep / 4));
    if (sprite.width !== size || sprite.height !== size) {
      sprite.width = size;
      sprite.height = size;
    }
    const spriteContext = sprite.getContext("2d");
    if (!spriteContext) return;
    spriteContext.clearRect(0, 0, size, size);
    spriteContext.drawImage(group, 0, 0, size, size);
  }

  const radius = Math.max(0, Math.min(height * 0.25, width * 0.5 - originalGroupSize * 0.53));
  for (const ring of RINGS) {
    const size = Math.max(1, Math.round(originalGroupSize * ring.scale));
    const sprite = ring.scale === 4 ? group : sprites[Math.round(ring.scale * 4) - 1];
    const ringRadius = radius * ring.radius;
    const sourceX = Math.floor(left * size);
    const sourceY = Math.floor(top * size);
    const sourceRight = Math.ceil(right * size);
    const sourceBottom = Math.ceil(bottom * size);
    const sourceWidth = sourceRight - sourceX;
    const sourceHeight = sourceBottom - sourceY;
    const drawX = -size / 2 + sourceX;
    const drawY = ringRadius - size / 2 + sourceY;
    for (let copy = 0; copy < ring.count; copy += 1) {
      const angle = (copy + ring.phase) * Math.PI * 2 / ring.count;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const centerX = width / 2 + cosine * (drawX + sourceWidth / 2) - sine * (drawY + sourceHeight / 2);
      const centerY = height / 2 + sine * (drawX + sourceWidth / 2) + cosine * (drawY + sourceHeight / 2);
      const extentX = (Math.abs(cosine) * sourceWidth + Math.abs(sine) * sourceHeight) / 2;
      const extentY = (Math.abs(sine) * sourceWidth + Math.abs(cosine) * sourceHeight) / 2;
      if (centerX + extentX < 0 || centerX - extentX > width || centerY + extentY < 0 || centerY - extentY > height) continue;
      context.setTransform(cosine, sine, -sine, cosine, width / 2, height / 2);
      context.drawImage(sprite, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, sourceWidth, sourceHeight);
    }
  }
  const centerSize = Math.max(1, Math.round(originalGroupSize * 1.5));
  const centerSourceX = Math.floor(left * centerSize);
  const centerSourceY = Math.floor(top * centerSize);
  const centerSourceWidth = Math.ceil(right * centerSize) - centerSourceX;
  const centerSourceHeight = Math.ceil(bottom * centerSize) - centerSourceY;
  context.setTransform(1, 0, 0, 1, width / 2, height / 2);
  context.drawImage(
    sprites[5],
    centerSourceX, centerSourceY, centerSourceWidth, centerSourceHeight,
    -centerSize / 2 + centerSourceX, -centerSize / 2 + centerSourceY,
    centerSourceWidth, centerSourceHeight,
  );
  context.setTransform(1, 0, 0, 1, 0, 0);
}

export default function FaceTraceSix() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<HTMLCanvasElement[]>([]);
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
      let paintInterval = 65;
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
                currentFrame = { canvas: capture, pose, capturedAt: now };
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
          if (currentFrame && now - lastFace > 300) {
            currentFrame = null;
            previousFrame = null;
            displayPose = null;
          }
          if (currentFrame && displayPose) {
            const elapsed = Math.min(50, lastMotion ? now - lastMotion : 16);
            displayPose = smoothPose(displayPose, currentFrame.pose, elapsed);
          }
          lastMotion = now;
          if (canvasRef.current && now - lastPaint >= paintInterval) {
            groupRef.current ??= document.createElement("canvas");
            boundsRef.current ??= document.createElement("canvas");
            const paintStart = performance.now();
            paint(canvasRef.current, groupRef.current, boundsRef.current, spritesRef.current, currentFrame, previousFrame, displayPose, now);
            const paintDuration = performance.now() - paintStart;
            paintInterval = Math.max(65, Math.min(150, paintDuration * 3));
            lastPaint = performance.now();
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
      <canvas ref={canvasRef} className={styles.image} aria-label="검은 화면의 촘촘한 원주들에 카메라로 찍은 눈과 입이 반복되어 보입니다" role="img" />
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
