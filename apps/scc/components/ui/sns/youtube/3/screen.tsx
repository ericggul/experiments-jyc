"use client";

import { useEffect, useState } from "react";
import styles from "./screen.module.css";

type Canvas = {
  height: number;
  width: number;
};

const laptopCanvas: Canvas = { width: 1920, height: 1080 };
const phoneCanvas: Canvas = { width: 390, height: 844 };

function frameForViewport(width: number, height: number) {
  const canvas = width < 768 ? laptopCanvas : phoneCanvas;
  const scaleX = width / canvas.width;
  const scaleY = height / canvas.height;

  return { canvas, scaleX, scaleY };
}

export function YoutubeThreeScreen() {
  const [frame, setFrame] = useState<ReturnType<typeof frameForViewport>>();

  useEffect(() => {
    const resize = () => setFrame(frameForViewport(window.innerWidth, window.innerHeight));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (!frame) {
    return <main className={styles.surface} />;
  }

  const { canvas, scaleX, scaleY } = frame;

  return (
    <main className={styles.surface}>
      <iframe
        className={styles.frame}
        height={canvas.height}
        src="/sns/youtube/2"
        style={{
          transform: `scale(${scaleX}, ${scaleY})`,
        }}
        title="YouTube 2 at the opposite viewport scale"
        width={canvas.width}
      />
    </main>
  );
}
