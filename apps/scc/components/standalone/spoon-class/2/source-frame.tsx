"use client";

import { forwardRef, type CSSProperties } from "react";

export const NATIVE_GAME_WIDTH = 600;
export const NATIVE_GAME_HEIGHT = 150;

// A separate document preserves the original document, CSS cascade, canvas,
// global Runner singleton, input listeners and audio lifecycle. Unmounting the
// frame disposes that whole browsing context, including requestAnimationFrame.
//
// Without a scale the document fills its tile. With a scale it stays at the
// upstream game's native canvas size and the wall scales the whole browsing
// context, rather than asking Runner to reinterpret its world in a tiny frame.
const SourceFrame = forwardRef<
  HTMLIFrameElement,
  { html: string; title: string; scale?: number }
>(function SourceFrame({ html, title, scale }, ref) {
  const placement: CSSProperties =
    scale === undefined
      ? { width: "100%", height: "100%" }
      : {
          position: "absolute",
          top: "50%",
          left: "50%",
          width: NATIVE_GAME_WIDTH,
          height: NATIVE_GAME_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
        };

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay"
      tabIndex={0}
      style={{
        display: "block",
        border: 0,
        background: "#f7f7f7",
        ...placement,
      }}
    />
  );
});

export default SourceFrame;
