"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { projectGaze, readEyeRatios, type EyeRatios, type Point } from "./model/gaze";
import { easePoint } from "./motion";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "seeking" | "tracking" | "calibrating" | "error";
type Calibration = { started: number; samples: EyeRatios[] };

const INITIAL_DOTS: EyeRatios = {
  left: { x: 0.48, y: 0.5 },
  right: { x: 0.52, y: 0.5 },
};

const PHASE_TEXT: Record<Phase, string> = {
  idle: "카메라 대기",
  loading: "카메라와 추적 모델 준비 중",
  seeking: "눈을 찾는 중",
  tracking: "눈동자 추적 중",
  calibrating: "화면 가운데를 바라보세요",
  error: "추적을 시작하지 못했습니다",
};

function average(samples: EyeRatios[], eye: keyof EyeRatios): Point {
  const sum = samples.reduce(
    (point, sample) => ({ x: point.x + sample[eye].x, y: point.y + sample[eye].y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / samples.length, y: sum.y / samples.length };
}

export default function GazeTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fieldRef = useRef<HTMLElement>(null);
  const leftDotRef = useRef<HTMLSpanElement>(null);
  const rightDotRef = useRef<HTMLSpanElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const lastFrameRef = useRef(-1);
  const lastInferenceRef = useRef(0);
  const lastAnimationRef = useRef(0);
  const targetRef = useRef<EyeRatios>({ ...INITIAL_DOTS });
  const positionRef = useRef<EyeRatios>({ ...INITIAL_DOTS });
  const calibrationRef = useRef<Calibration | null>(null);
  const centerRef = useRef<EyeRatios | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  const stop = useCallback((update = true) => {
    requestRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    calibrationRef.current = null;
    centerRef.current = null;
    lastFrameRef.current = -1;
    lastAnimationRef.current = 0;
    targetRef.current = { ...INITIAL_DOTS };
    positionRef.current = { ...INITIAL_DOTS };
    if (update) {
      setPhase("idle");
      setError("");
    }
  }, []);

  useEffect(() => {
    const leave = () => {
      if (document.hidden) stop();
    };
    const hidePage = () => stop();
    document.addEventListener("visibilitychange", leave);
    window.addEventListener("pagehide", hidePage);
    return () => {
      document.removeEventListener("visibilitychange", leave);
      window.removeEventListener("pagehide", hidePage);
      stop(false);
    };
  }, [stop]);

  const start = async () => {
    if (phase === "loading" || phase === "seeking" || phase === "tracking" || phase === "calibrating") return;
    stop(false);
    const request = requestRef.current;
    setError("");
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
      const video = videoRef.current;
      if (!video) throw new Error("카메라 화면을 준비할 수 없습니다.");
      video.srcObject = stream;
      await video.play();

      const files = await FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm");
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
      setPhase("seeking");

      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        const calibration = calibrationRef.current;
        if (calibration && now - calibration.started > 3500 && calibration.samples.length < 3) {
          calibrationRef.current = null;
          setPhase("seeking");
        }
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.currentTime !== lastFrameRef.current &&
            now - lastInferenceRef.current >= 95) {
          lastFrameRef.current = video.currentTime;
          lastInferenceRef.current = now;
          try {
            const landmarks = landmarker.detectForVideo(video, now).faceLandmarks[0];
            const ratios = landmarks && readEyeRatios(landmarks);
            if (ratios) {
              const calibration = calibrationRef.current;
              if (calibration) {
                const elapsed = now - calibration.started;
                if (elapsed >= 800) calibration.samples.push(ratios);
                if (elapsed >= 2000 && calibration.samples.length >= 3) {
                  centerRef.current = {
                    left: average(calibration.samples, "left"),
                    right: average(calibration.samples, "right"),
                  };
                  calibrationRef.current = null;
                  setPhase("tracking");
                }
              } else {
                setPhase((current) => current === "tracking" ? current : "tracking");
              }
              const centers = centerRef.current;
              targetRef.current = {
                left: projectGaze(ratios.left, centers?.left),
                right: projectGaze(ratios.right, centers?.right),
              };
            } else if (!calibrationRef.current) {
              setPhase((current) => current === "seeking" ? current : "seeking");
            }
          } catch {
            stop(false);
            setError("눈 추적 중 오류가 발생했습니다. 다시 시작해 주세요.");
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
              dot.style.transform = `translate3d(${(point.x - 0.5) * width}px, ${(point.y - 0.5) * height}px, 0) translate(-50%, -50%)`;
            }
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (caught) {
      if (request !== requestRef.current) return;
      stop(false);
      const name = caught instanceof DOMException ? caught.name : "";
      setError(name === "NotAllowedError"
        ? "카메라 권한이 거부됐습니다. 브라우저 설정에서 허용한 뒤 다시 시작해 주세요."
        : caught instanceof Error ? caught.message : "카메라를 시작할 수 없습니다.");
      setPhase("error");
    }
  };

  const calibrate = () => {
    if (!landmarkerRef.current || phase !== "tracking") return;
    calibrationRef.current = { started: performance.now(), samples: [] };
    setPhase("calibrating");
  };

  const active = phase === "seeking" || phase === "tracking" || phase === "calibrating";
  const hasEyes = phase === "tracking" || phase === "calibrating";

  return (
    <main className={styles.page}>
      <video ref={videoRef} className={styles.cameraInput} autoPlay muted playsInline aria-hidden="true" />
      <header className={styles.header}>
        <h1>Gaze tracking</h1>
        <span className={styles.status} aria-live="polite">{PHASE_TEXT[phase]}</span>
      </header>

      <section ref={fieldRef} className={styles.field} aria-label="시선 방향 표시 영역">
        <span className={styles.centerMark} aria-hidden="true" />
        {hasEyes && (
          <>
            <span ref={leftDotRef} className={`${styles.dot} ${styles.leftDot}`} aria-hidden="true" />
            <span ref={rightDotRef} className={`${styles.dot} ${styles.rightDot}`} aria-hidden="true" />
          </>
        )}
        {phase === "calibrating" && <span className={styles.centerTarget}>여기를 보세요</span>}
        {phase === "seeking" && <p className={styles.fieldPrompt}>화면을 향해 주세요.<br />눈을 찾고 있습니다.</p>}
        {!active && <p className={styles.fieldPrompt}>카메라를 켜면 두 눈의 방향이<br />화면 위 점으로 나타납니다.</p>}
      </section>

      <footer className={styles.footer}>
        <div className={styles.legend} aria-hidden="true"><span className={styles.leftKey} />왼쪽 눈 <span className={styles.rightKey} />오른쪽 눈</div>
        <div className={styles.controls}>
          {!active && <button type="button" onClick={start} disabled={phase === "loading"}>{phase === "loading" ? "준비 중…" : "카메라 켜기"}</button>}
          {active && <button type="button" onClick={calibrate} disabled={phase !== "tracking"}>중앙 보정</button>}
          {active && <button type="button" className={styles.secondaryButton} onClick={() => stop()}>종료</button>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.note}>두 점은 눈 안에서 움직이는 눈동자의 방향을 화면에 확대한 추정치입니다. 화면의 정확한 응시 지점은 아닙니다. 영상은 표시하거나 저장하지 않습니다.</p>
      </footer>
    </main>
  );
}
