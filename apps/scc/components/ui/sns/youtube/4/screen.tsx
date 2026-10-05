"use client";

import { useEffect, useState } from "react";
import styles from "./screen.module.css";

type Canvas = {
  height: number;
  width: number;
};

const repetitions = [0, 1, 2] as const;
const laptopCanvas: Canvas = { width: 1920, height: 1080 };
const phoneCanvas: Canvas = { width: 390, height: 844 };

function frameForViewport(width: number, height: number) {
  const isMobile = width < 768;
  const canvas = isMobile ? laptopCanvas : phoneCanvas;

  return {
    canvas,
    horizontal: isMobile,
    scaleX: width / (canvas.width * (isMobile ? repetitions.length : 1)),
    scaleY: height / (canvas.height * (isMobile ? 1 : repetitions.length)),
  };
}

export function YoutubeFourScreen() {
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

  const { canvas, horizontal, scaleX, scaleY } = frame;

  return (
    <main className={styles.surface}>
      {repetitions.map((index) => (
        <iframe
          className={styles.frame}
          height={canvas.height}
          key={index}
          src="/sns/youtube/2"
          style={{
            left: horizontal ? index * canvas.width * scaleX : 0,
            top: horizontal ? 0 : index * canvas.height * scaleY,
            transform: `scale(${scaleX}, ${scaleY})`,
          }}
          title={`YouTube 2 squeezed repetition ${index + 1}`}
          width={canvas.width}
        />
      ))}
    </main>
  );
}
