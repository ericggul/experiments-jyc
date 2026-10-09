"use client";

import type { CaptureOptions } from "../../player";

// Placeholder until the clone lands; owned by its own build.
export default function Pending({ capture }: { capture: CaptureOptions }) {
  void capture;
  return null;
}
