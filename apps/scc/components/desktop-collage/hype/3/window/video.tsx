"use client";

import { videoById, videos } from "../model/catalogue";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";

// One video opened on its own: the player fills the window, nothing else.

export default function VideoFile({ video, sound }: WindowParams) {
  const current = videoById(video ?? "") ?? videos[0];
  useTitle(current.title);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <iframe src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&mute=${sound ? 0 : 1}&playsinline=1&rel=0&controls=1`} title={current.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
    </div>
  );
}
