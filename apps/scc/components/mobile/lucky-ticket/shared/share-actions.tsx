"use client";

import { useState } from "react";
import styles from "./final-screen.module.css";

export default function ShareActions({ version }: { version: 1 | 2 | 3 }) {
  const [notice, setNotice] = useState("");

  const shareUrl = () => new URL(`/lucky-ticket/${version}`, window.location.origin).toString();

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl());
  };

  const shareToKakao = async () => {
    try {
      if (navigator.share) {
        setNotice("공유 메뉴에서 카카오톡을 선택하세요.");
        await navigator.share({ title: "행운의 복권", url: shareUrl() });
      } else {
        await copyLink();
        setNotice("링크를 복사했어요. 카카오톡에 붙여넣어 주세요.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice("");
      } else {
        setNotice("공유할 수 없어요. 링크 버튼을 이용해 주세요.");
      }
    }
  };

  const shareLink = async () => {
    try {
      await copyLink();
      setNotice("링크를 복사했어요.");
    } catch {
      setNotice("링크를 복사하지 못했어요.");
    }
  };

  return (
    <div className={styles.shareArea} data-scratch-share>
      <p className={styles.sharePrompt}>공유하기</p>
      <div className={styles.shareButtons}>
        <button aria-label="카카오톡으로 공유" className={`${styles.shareButton} ${styles.kakaoButton}`} type="button" onClick={shareToKakao}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3.45c-5.25 0-9.5 3.32-9.5 7.42 0 2.68 1.8 5.03 4.51 6.35l-.92 3.5 4.07-2.67c.6.09 1.21.13 1.84.13 5.25 0 9.5-3.32 9.5-7.31S17.25 3.45 12 3.45Z" />
            <circle cx="8" cy="10.8" fill="#fee500" r=".83" />
            <circle cx="12" cy="10.8" fill="#fee500" r=".83" />
            <circle cx="16" cy="10.8" fill="#fee500" r=".83" />
          </svg>
        </button>
        <button aria-label="링크 복사" className={styles.shareButton} type="button" onClick={shareLink}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13.5a4 4 0 0 0 6.1.5l2.4-2.4a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
            <path d="M14 10.5a4 4 0 0 0-6.1-.5l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.4-1.4" />
          </svg>
        </button>
      </div>
      <output className={styles.shareNotice} aria-live="polite">{notice}</output>
    </div>
  );
}
