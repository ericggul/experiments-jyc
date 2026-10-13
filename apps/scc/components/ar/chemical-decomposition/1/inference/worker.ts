/// <reference lib="webworker" />
import { objectThings, sceneThings } from "../model/catalog.ts";
import {
  argmaxLabels,
  connectedRegions,
  cropWindow,
  frameToPlanar,
  majorityFilter,
  phraseProbabilities,
  readDetections,
  recountAreas,
  stampDetections,
  type Frame,
} from "./analysis.ts";
import type { Analysis, Budget, FromWorker, ToWorker } from "./protocol.ts";
import { loadModel, type Device, type Model } from "./runtime.ts";
import { believedCandidate, matchTracks, regionsToLook, updateBelief, type Track } from "./tracks.ts";

// Up to three on-device models per frame, all in this worker so the camera and
// the lettering stay at display rate: SegFormer-B0 parses the scene into
// ADE20K's 150 stuff/thing classes, D-FINE-N finds COCO's 80 objects on top,
// and MobileCLIP-S0 picks each region's material among the catalogue's
// phrases. The page's budget decides which run (see `Budget`).

const SEGMENTER = "Xenova/segformer-b0-finetuned-ade-512-512";
const DETECTOR = "onnx-community/dfine_n_coco-ONNX";
const MATERIAL = "Xenova/mobileclip_s0";
const PHRASES = "/ar/chemical-decomposition/1/phrases";

const DETECTION_THRESHOLD = 0.45;
const CLIP_SIZE = 256;

const scope = self as unknown as DedicatedWorkerGlobalScope;
const things = [...sceneThings, ...objectThings];
const candidateCounts = things.map((entry) => entry.candidates.length);
const phraseOffsets: number[] = [];
things.reduce((offset, entry) => (phraseOffsets.push(offset), offset + entry.candidates.length), 0);

type Phrases = { phrases: Int8Array; dim: number };

type Models = {
  device: Device;
  budget: Budget;
  segmenter: Model;
  /** Null when the budget leaves it out or it failed to load. */
  detector: Model | null;
  material: Model | null;
  phrases: Phrases | null;
  segmentPixels: number;
};

let models: Promise<Models> | null = null;
const tracks: Track[] = [];
let frameCount = 0;

// Input tensors keep one buffer each: fixed shapes let the runtime reuse its
// GPU buffers, and nothing large is allocated per frame.
const buffers = new Map<string, Float32Array<ArrayBuffer>>();
function buffer(name: string, length: number) {
  let array = buffers.get(name);
  if (!array || array.length !== length) {
    array = new Float32Array(length);
    buffers.set(name, array);
  }
  return array;
}

function post(message: FromWorker, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

type GpuNavigator = { gpu?: { requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null> } };

async function chooseDevice(forced?: Device) {
  if (forced === "wasm") return { device: "wasm" as const, half: false };
  try {
    const adapter = await (navigator as unknown as GpuNavigator).gpu?.requestAdapter();
    if (adapter) return { device: "webgpu" as const, half: adapter.features.has("shader-f16") };
  } catch {
    // No usable adapter: fall through to WebAssembly.
  }
  return { device: "wasm" as const, half: false };
}

async function loadPhrases(): Promise<Phrases | null> {
  try {
    const [manifest, bytes] = await Promise.all([
      fetch(`${PHRASES}.json`).then((response) => response.json() as Promise<{ dim: number; phrases: string[] }>),
      fetch(`${PHRASES}.bin`).then((response) => response.arrayBuffer()),
    ]);
    const expected = things.flatMap((entry) => entry.candidates.map(([, phrase]) => phrase));
    const current = manifest.phrases.length === expected.length && manifest.phrases.every((phrase, index) => phrase === expected[index]);
    if (!current) {
      console.warn("[chemical-decomposition] phrase embeddings are out of date; rerun scripts/embed-phrases.mjs");
      return null;
    }
    return { phrases: new Int8Array(bytes), dim: manifest.dim };
  } catch (error) {
    console.warn("[chemical-decomposition] material phrases unavailable", error);
    return null;
  }
}

async function load(budget: Budget): Promise<Models> {
  const { device, half } = await chooseDevice(budget.device);

  // One model at a time, all before the first frame: loading a model while
  // another runs stalled the WebGPU path on desktop Chromium (2026-10-13).
  const steps = 1 + Number(budget.objects) + Number(budget.materials);
  let step = 0;
  const progress = (loaded: number, total: number) => post({ type: "progress", step, steps, loaded, total });

  // int8 D-FINE fails to run and int8 MobileCLIP misnames materials, so the
  // WebAssembly path keeps those two at full precision.
  const suffix = device === "webgpu" && half ? "_fp16" : "";
  const segmenter = await loadModel(device, SEGMENTER, device === "webgpu" ? `model${suffix}.onnx` : "model_quantized.onnx", progress);
  let detector: Model | null = null;
  let material: Model | null = null;
  let phrases: Phrases | null = null;
  try {
    if (budget.objects) {
      step += 1;
      detector = await loadModel(device, DETECTOR, `model${suffix}.onnx`, progress);
    }
    if (budget.materials) {
      step += 1;
      phrases = await loadPhrases();
      if (phrases) material = await loadModel(device, MATERIAL, `vision_model${suffix}.onnx`, progress);
    }
  } catch (error) {
    console.warn("[chemical-decomposition] optional model unavailable", error);
  }
  return {
    device,
    budget,
    segmenter,
    detector,
    material,
    phrases: material ? phrases : null,
    segmentPixels: device === "webgpu" ? budget.segmentPixels : Math.round(budget.segmentPixels * 0.45),
  };
}

function segmentSize(width: number, height: number, pixels: number) {
  const scale = Math.sqrt(pixels / (width * height));
  return {
    width: Math.max(64, Math.round((width * scale) / 32) * 32),
    height: Math.max(64, Math.round((height * scale) / 32) * 32),
  };
}

async function analyse(loaded: Models, frame: Frame, frameBuffer: ArrayBuffer): Promise<Analysis> {
  const started = performance.now();
  frameCount += 1;
  const { budget } = loaded;

  const input = segmentSize(frame.width, frame.height, loaded.segmentPixels);
  const segmentData = frameToPlanar(frame, input.width, input.height, true, undefined, buffer("segment", 3 * input.width * input.height));
  const { logits: segmentLogits } = await loaded.segmenter(segmentData, [1, 3, input.height, input.width]);
  const [, classes, height, width] = segmentLogits.dims;
  const labels = majorityFilter(argmaxLabels(segmentLogits.data, classes, width, height), width, height);
  const { map, regions } = connectedRegions(labels, width, height, width * height * 0.003);

  if (loaded.detector) {
    const size = budget.detectorSize;
    const detectData = frameToPlanar(frame, size, size, false, undefined, buffer("detect", 3 * size * size));
    const { logits, pred_boxes } = await loaded.detector(detectData, [1, 3, size, size]);
    const [, queries, objectClasses] = logits.dims;
    const detections = readDetections(logits.data, pred_boxes.data, queries, objectClasses, DETECTION_THRESHOLD);
    regions.push(...stampDetections(map, width, height, detections, sceneThings.length));
    recountAreas(map, regions);
  }

  const matched = matchTracks(tracks, regions, frameCount);

  if (loaded.material && loaded.phrases) {
    const { phrases, dim } = loaded.phrases;
    const looks = regionsToLook(regions, matched, candidateCounts, width * height, sceneThings.length, budget.looksPerFrame, frameCount);
    const crop = buffer("crop", 3 * CLIP_SIZE * CLIP_SIZE);
    for (const { region, index, track } of looks) {
      const window = cropWindow(region.box, frame.width / width, frame.height / height, frame.width, frame.height);
      frameToPlanar(frame, CLIP_SIZE, CLIP_SIZE, false, window, crop, 0, { map, width, height, id: index });
      const { image_embeds } = await loaded.material(crop, [1, 3, CLIP_SIZE, CLIP_SIZE]);
      const probabilities = phraseProbabilities(image_embeds.data, 0, phrases, phraseOffsets[region.thing], candidateCounts[region.thing], dim);
      updateBelief(track, probabilities, frameCount);
    }
  }

  return {
    type: "analysis",
    map,
    width,
    height,
    regions: regions.map((region, index) => {
      const { candidate, confidence } = believedCandidate(matched[index]);
      return { thing: region.thing, material: things[region.thing].candidates[candidate][0], confidence };
    }),
    buffer: frameBuffer,
    milliseconds: performance.now() - started,
  };
}

scope.onmessage = async (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  try {
    if (message.type === "start") {
      models ??= load(message.budget);
      const loaded = await models;
      post({ type: "ready", device: loaded.device });
      return;
    }
    if (!models) return;
    const loaded = await models;
    const frame = { data: new Uint8ClampedArray(message.buffer), width: message.width, height: message.height };
    const result = await analyse(loaded, frame, message.buffer);
    post(result, [result.map.buffer as ArrayBuffer, result.buffer]);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
