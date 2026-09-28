"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { readEyeRatios, type EyeRatios } from "./model/gaze";
import { projectGaze } from "./model/project";
import { easePoint } from "./motion";
import { placeInViewport } from "./model/viewport";

type Phase = "idle" | "loading" | "seeking" | "tracking" | "error";

const INITIAL_DOTS: EyeRatios = {
  left: { x: 0.48, y: 0.5 },
  right: { x: 0.52, y: 0.5 },
};

export type GazeTrackingProps = {
  variant?: 1 | 2;
  mode?: "circle" | "liquid" | "spacetime";
  diameter?: number;
  gazeRef?: RefObject<EyeRatios>;
};

export function useGazeEngine(gazeRef?: RefObject<EyeRatios>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fieldRef = useRef<HTMLElement>(null);
  const leftDotRef = useRef<HTMLSpanElement>(null);
  const rightDotRef = useRef<HTMLSpanElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const requestRef = useRef(0);
  const lastFrameRef = useRef(-1);
  const lastInferenceRef = useRef(0);
  const lastValidRef = useRef(0);
  const lastAnimationRef = useRef(0);
  const targetRef = useRef<EyeRatios>({ ...INITIAL_DOTS });
  const positionRef = useRef<EyeRatios>({ ...INITIAL_DOTS });
  const accessGrantedRef = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("idle");
  const [accessGranted, setAccessGranted] = useState(false);

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
    lastFrameRef.current = -1;
    lastInferenceRef.current = 0;
    lastValidRef.current = 0;
    lastAnimationRef.current = 0;
    targetRef.current = { ...INITIAL_DOTS };
    positionRef.current = { ...INITIAL_DOTS };
    if (gazeRef) gazeRef.current = { ...INITIAL_DOTS };
    if (update) {
      setPhase("idle");
    }
  }, [gazeRef]);

  useEffect(() => {
    const leave = () => {
      if (document.hidden) stop();
      else if (accessGrantedRef.current) startRef.current();
    };
    const hidePage = () => stop(false);
    document.addEventListener("visibilitychange", leave);
    window.addEventListener("pagehide", hidePage);
    return () => {
      document.removeEventListener("visibilitychange", leave);
      window.removeEventListener("pagehide", hidePage);
      stop(false);
    };
  }, [stop]);

  const start = async () => {
    if (startingRef.current || streamRef.current || landmarkerRef.current) return;
    stop(false);
    startingRef.current = true;
    const request = requestRef.current;
    setPhase("loading");

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        throw new Error("HTTPS에서 카메라를 사용할 수 있는 브라우저가 필요합니다.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 20 },
        },
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      accessGrantedRef.current = true;
      setAccessGranted(true);
      const video = videoRef.current;
      if (!video) throw new Error("카메라 화면을 준비할 수 없습니다.");
      video.srcObject = stream;
      await video.play();
      if (request !== requestRef.current) return;

      const files = await FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm");
      const landmarker = await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/models/gaze-tracking/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
      });
      if (request !== requestRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      startingRef.current = false;
      setPhase("seeking");

      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.currentTime !== lastFrameRef.current &&
            now - lastInferenceRef.current >= 95) {
          lastFrameRef.current = video.currentTime;
          lastInferenceRef.current = now;
          try {
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result.faceLandmarks[0];
            const ratios = landmarks && readEyeRatios(landmarks, video.videoWidth / video.videoHeight, result.faceBlendshapes[0]?.categories);
            if (ratios) {
              lastValidRef.current = now;
              setPhase((current) => current === "tracking" ? current : "tracking");
              targetRef.current = projectGaze(ratios);
            } else {
              if (now - lastValidRef.current > 400) {
                setPhase((current) => current === "seeking" ? current : "seeking");
              }
            }
          } catch {
            stop(false);
            setPhase("error");
            return;
          }
        }
        const elapsed = lastAnimationRef.current ? now - lastAnimationRef.current : 16;
        lastAnimationRef.current = now;
        const field = fieldRef.current;
        if (field) {
          const width = field.clientWidth;
          const height = field.clientHeight;
          for (const eye of ["left", "right"] as const) {
            const point = easePoint(positionRef.current[eye], targetRef.current[eye], elapsed);
            positionRef.current[eye] = point;
            const dot = eye === "left" ? leftDotRef.current : rightDotRef.current;
            if (dot) {
              const { x, y } = placeInViewport(point, width, height);
              dot.style.transform = `translate3d(${x - width / 2}px, ${y - height / 2}px, 0) translate(-50%, -50%)`;
            }
          }
          if (gazeRef) gazeRef.current = positionRef.current;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (caught) {
      if (request !== requestRef.current) return;
      stop(false);
      console.error("Gaze tracking could not start", caught);
      setPhase("error");
    }
  };

  useEffect(() => {
    startRef.current = () => { void start(); };
  });

  return { videoRef, fieldRef, leftDotRef, rightDotRef, phase, accessGranted, start };
}
