"use client";

import {
  useCameraMonolithPublisher,
  useCameraMonolithSocket,
} from "../transport";
import styles from "./camera-monolith-mobile.module.css";

export default function CameraMonolithMobile() {
  const { socket, connected, connectionError } = useCameraMonolithSocket("mobile");
  const {
    active,
    error,
    facingMode,
    previewRef,
    selectFacingMode,
    start,
    stop,
  } = useCameraMonolithPublisher(socket);

  const status = error
    ? error
    : connectionError
      ? connectionError
      : !connected
        ? "연결 중"
        : active
          ? "카메라 스트림 전송 중"
          : "카메라를 시작하세요";

  return (
    <main className={styles.page}>
      <video
        ref={previewRef}
        className={styles.preview}
        data-facing={facingMode}
        autoPlay
        muted
        playsInline
        aria-label="내 카메라 미리보기"
      />
      <div className={styles.controls}>
        <p className={styles.status} role={error || connectionError ? "alert" : "status"}>
          {status}
        </p>
        <div className={styles.actions}>
          {active ? (
            <>
              <button
                className={styles.button}
                type="button"
                onClick={() => {
                  void selectFacingMode(
                    facingMode === "user" ? "environment" : "user",
                  );
                }}
              >
                전환
              </button>
              <button className={styles.button} type="button" onClick={stop}>
                종료
              </button>
            </>
          ) : (
            <button className={styles.button} type="button" onClick={() => void start()}>
              카메라 시작
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
