import type { MaterialId } from "../model/materials.ts";

/** RGBA pixels of the visible camera view, at analysis resolution. */
export type FrameMessage = {
  type: "frame";
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

/**
 * How much recognition a device runs. Phones start with the scene parser
 * alone after an iPhone crash with all three models (2026-10-13); objects and
 * materials are opt-in there until a phone run is observed.
 */
export type Budget = {
  objects: boolean;
  materials: boolean;
  /** Scene-parser input pixels on WebGPU; WebAssembly takes ~45% of this. */
  segmentPixels: number;
  detectorSize: number;
  looksPerFrame: number;
  /** Forces a backend instead of WebGPU-when-available. */
  device?: "webgpu" | "wasm";
};

export type ToWorker = { type: "start"; budget: Budget } | FrameMessage;

export type SeenRegion = {
  thing: number;
  material: MaterialId;
  /** How sure MobileCLIP is of the material; 0 while still the prior. */
  confidence: number;
};

export type Analysis = {
  type: "analysis";
  /** Region index per map cell, row-major, aligned with the visible view. */
  map: Uint16Array;
  width: number;
  height: number;
  regions: SeenRegion[];
  /** The frame buffer handed back for reuse. */
  buffer: ArrayBuffer;
  milliseconds: number;
};

export type FromWorker =
  | { type: "progress"; step: number; steps: number; loaded: number; total: number }
  | { type: "ready"; device: "webgpu" | "wasm" }
  | Analysis
  | { type: "error"; message: string };
