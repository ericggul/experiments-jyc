"use client";

import { createPortal } from "react-dom";
import { useGazeEngine, type GazeTrackingProps } from "./use-gaze-engine";
import styles from "./screen.module.css";

export default function GazeTracking({ variant = 1, mode = "circle", diameter = 100, gazeRef }: GazeTrackingProps) {
  const { videoRef, fieldRef, leftDotRef, rightDotRef, phase, accessGranted, start } = useGazeEngine(gazeRef);
  const portalHost = variant === 2 && typeof document !== "undefined" ? document.body : null;

  return (
    <main ref={fieldRef} className={`${styles.page} ${variant === 2 ? styles.overlayPage : ""}`} data-gaze-overlay={variant === 2 || undefined} aria-label="시선 방향 표시 영역">
      <video ref={videoRef} className={styles.cameraInput} autoPlay muted playsInline aria-hidden="true" />
      {phase === "tracking" && (variant === 2 && portalHost ? createPortal(
        <>
          <span ref={leftDotRef} className={`${styles.dot} ${styles.leftDot} ${mode === "circle" ? styles.differenceDot : styles.targetDot}`} style={mode === "circle" ? { width: diameter, height: diameter } : undefined} data-gaze-overlay aria-hidden="true" />
          <span ref={rightDotRef} className={`${styles.dot} ${styles.rightDot} ${mode === "circle" ? styles.differenceDot : styles.targetDot}`} style={mode === "circle" ? { width: diameter, height: diameter } : undefined} data-gaze-overlay aria-hidden="true" />
        </>,
        portalHost,
      ) : (
        <>
          <span ref={leftDotRef} className={`${styles.dot} ${styles.leftDot}`} aria-hidden="true" />
          <span ref={rightDotRef} className={`${styles.dot} ${styles.rightDot}`} aria-hidden="true" />
        </>
      ))}
      {(phase === "error" || (!accessGranted && phase !== "loading")) && (
        <button type="button" className={styles.startButton} onClick={start}>{phase === "error" ? "다시 시도" : "카메라 켜기"}</button>
      )}
    </main>
  );
}
