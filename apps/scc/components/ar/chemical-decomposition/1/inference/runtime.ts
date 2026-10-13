// onnxruntime-web used directly. transformers.js always brought the 28 MB
// WebGPU-capable build and cost ~300 MB in Safari's page process for a 4 MB
// model; the plain WebAssembly build measured ~200 MB (Mac Safari,
// 2026-10-13). Phones load only that build; WebGPU loads only when chosen.

const ORT_VERSION = "1.30.0";
const WASM_PATHS = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const CACHE = "chemical-decomposition-models-1";

export type Device = "webgpu" | "wasm";

export type Output = { data: Float32Array; dims: readonly number[] };

/** One ONNX model with float32 `pixel_values` in and named float32 outputs. */
export type Model = (pixels: Float32Array<ArrayBuffer>, dims: readonly number[]) => Promise<Record<string, Output>>;

type Ort = typeof import("onnxruntime-web/wasm");

let runtime: Promise<Ort> | null = null;

function openRuntime(device: Device) {
  runtime ??= (device === "webgpu" ? import("onnxruntime-web/webgpu") : import("onnxruntime-web/wasm")).then((ort) => {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = WASM_PATHS;
    return ort as Ort;
  });
  return runtime;
}

/** Model bytes from Cache Storage, else downloaded with progress and stored. */
async function fetchModel(url: string, onProgress: (loaded: number, total: number) => void) {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(url);
    if (hit) {
      const bytes = new Uint8Array(await hit.arrayBuffer());
      onProgress(bytes.length, bytes.length);
      return bytes;
    }
  } catch {
    cache = null;
  }
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`model download failed (${response.status})`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, Math.max(total, loaded));
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    await cache?.put(url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Storage full or unavailable: the next visit downloads again.
  }
  return bytes;
}

export async function loadModel(
  device: Device,
  repository: string,
  file: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<Model> {
  const ort = await openRuntime(device);
  const bytes = await fetchModel(`https://huggingface.co/${repository}/resolve/main/onnx/${file}`, onProgress);
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: [device],
    graphOptimizationLevel: "all",
    // The arena keeps every peak allocation for the session's lifetime.
    enableCpuMemArena: device === "webgpu",
  });
  const input = session.inputNames[0];
  return async (pixels, dims) => {
    const tensor = new ort.Tensor("float32", pixels, dims);
    const results = await session.run({ [input]: tensor });
    const outputs: Record<string, Output> = {};
    for (const name of session.outputNames) {
      const result = results[name];
      outputs[name] = { data: (await result.getData()) as Float32Array, dims: result.dims };
      result.dispose();
    }
    tensor.dispose();
    return outputs;
  };
}
