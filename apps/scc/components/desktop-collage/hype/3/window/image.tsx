"use client";

import { images } from "../model/catalogue";
import { useHypeApi, useTitle } from "./api";
import type { WindowParams } from "./index";

// One image file opened in the browser: Chrome's own viewer, a dark ground
// and the file centred, titled by name and size like a saved screenshot.

export default function ImageFile({ image }: WindowParams) {
  const file = images[image ?? 0];
  useTitle(`${file.name} (${file.width}×${file.height})`);
  useHypeApi({ focus: () => {}, type: () => {}, submit: () => {}, act: () => {} });
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0e0e0e", display: "grid", placeItems: "center", overflow: "hidden" }}>
      <img src={file.src} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }} />
    </div>
  );
}
