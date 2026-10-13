// Pure frame analysis shared by the worker and offline checks: tensors in,
// regions out. No model runtime is imported here.

export type Frame = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };

export type Box = { x0: number; y0: number; x1: number; y1: number };

/** Favours one region's pixels: the rest fade most of the way to mid grey. */
export type RegionMask = { map: Uint16Array; width: number; height: number; id: number };

export type Detection = { label: number; score: number; box: Box };

export type Region = {
  /** Index into the combined catalogue: scene things, then object things. */
  thing: number;
  area: number;
  box: Box;
};

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const MASK_KEEP = 0.35;

/**
 * Bilinear resample of an RGBA frame window into a planar RGB tensor. With
 * `normalise`, applies the ImageNet mean/std; otherwise values are 0–1.
 */
export function frameToPlanar(
  frame: Frame,
  width: number,
  height: number,
  normalise: boolean,
  window: Box = { x0: 0, y0: 0, x1: frame.width, y1: frame.height },
  out = new Float32Array(3 * width * height),
  offset = 0,
  mask?: RegionMask,
) {
  const plane = width * height;
  const sx = (window.x1 - window.x0) / width;
  const sy = (window.y1 - window.y0) / height;
  const maxX = frame.width - 1;
  const maxY = frame.height - 1;
  const { data } = frame;
  for (let y = 0; y < height; y += 1) {
    const fy = Math.min(maxY, Math.max(0, window.y0 + (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(maxY, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < width; x += 1) {
      const fx = Math.min(maxX, Math.max(0, window.x0 + (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(maxX, x0 + 1);
      const wx = fx - x0;
      const a = (y0 * frame.width + x0) * 4;
      const b = (y0 * frame.width + x1) * 4;
      const c = (y1 * frame.width + x0) * 4;
      const d = (y1 * frame.width + x1) * 4;
      const index = offset + y * width + x;
      let keep = 1;
      if (mask) {
        const mx = Math.min(mask.width - 1, Math.floor((fx / frame.width) * mask.width));
        const my = Math.min(mask.height - 1, Math.floor((fy / frame.height) * mask.height));
        if (mask.map[my * mask.width + mx] !== mask.id) keep = MASK_KEEP;
      }
      for (let channel = 0; channel < 3; channel += 1) {
        const top = data[a + channel] + (data[b + channel] - data[a + channel]) * wx;
        const bottom = data[c + channel] + (data[d + channel] - data[c + channel]) * wx;
        const value = 0.5 + ((top + (bottom - top) * wy) / 255 - 0.5) * keep;
        out[index + channel * plane] = normalise
          ? (value - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel]
          : value;
      }
    }
  }
  return out;
}

/** Per-pixel class from `[1, classes, height, width]` logits. */
export function argmaxLabels(logits: ArrayLike<number>, classes: number, width: number, height: number) {
  const plane = width * height;
  const labels = new Uint8Array(plane);
  for (let index = 0; index < plane; index += 1) {
    let best = 0;
    let bestValue = logits[index];
    for (let label = 1; label < classes; label += 1) {
      const value = logits[label * plane + index];
      if (value > bestValue) {
        bestValue = value;
        best = label;
      }
    }
    labels[index] = best;
  }
  return labels;
}

/** 3×3 majority filter: removes single-pixel speckle without moving edges. */
export function majorityFilter(labels: Uint8Array, width: number, height: number) {
  const out = new Uint8Array(labels.length);
  const counts = new Uint8Array(256);
  const seen: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      seen.length = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          const label = labels[yy * width + xx];
          if (counts[label] === 0) seen.push(label);
          counts[label] += 1;
        }
      }
      const own = labels[y * width + x];
      let best = own;
      let bestCount = 0;
      for (const label of seen) {
        if (counts[label] > bestCount) { bestCount = counts[label]; best = label; }
        counts[label] = 0;
      }
      out[y * width + x] = bestCount >= 5 ? best : own;
    }
  }
  return out;
}

/**
 * Splits a label map into 4-connected regions. Regions smaller than
 * `minArea` pixels join the neighbouring region they touch most.
 */
export function connectedRegions(labels: Uint8Array, width: number, height: number, minArea: number) {
  const ids = new Int32Array(labels.length).fill(-1);
  const regions: Region[] = [];
  const stack = new Int32Array(labels.length);
  for (let start = 0; start < labels.length; start += 1) {
    if (ids[start] !== -1) continue;
    const label = labels[start];
    const id = regions.length;
    const box = { x0: width, y0: height, x1: 0, y1: 0 };
    let area = 0;
    let top = 0;
    stack[top++] = start;
    ids[start] = id;
    while (top > 0) {
      const index = stack[--top];
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      if (x < box.x0) box.x0 = x;
      if (y < box.y0) box.y0 = y;
      if (x + 1 > box.x1) box.x1 = x + 1;
      if (y + 1 > box.y1) box.y1 = y + 1;
      if (x > 0 && ids[index - 1] === -1 && labels[index - 1] === label) { ids[index - 1] = id; stack[top++] = index - 1; }
      if (x < width - 1 && ids[index + 1] === -1 && labels[index + 1] === label) { ids[index + 1] = id; stack[top++] = index + 1; }
      if (y > 0 && ids[index - width] === -1 && labels[index - width] === label) { ids[index - width] = id; stack[top++] = index - width; }
      if (y < height - 1 && ids[index + width] === -1 && labels[index + width] === label) { ids[index + width] = id; stack[top++] = index + width; }
    }
    regions.push({ thing: label, area, box });
  }

  // Small regions: adopt the largest neighbouring region they touch.
  const parent = regions.map((_, id) => id);
  const find = (id: number): number => (parent[id] === id ? id : (parent[id] = find(parent[id])));
  const order = regions.map((_, id) => id).sort((a, b) => regions[a].area - regions[b].area);
  for (const id of order) {
    if (regions[id].area >= minArea) break;
    const { box } = regions[id];
    const touches = new Map<number, number>();
    for (let y = box.y0; y < box.y1; y += 1) {
      for (let x = box.x0; x < box.x1; x += 1) {
        const index = y * width + x;
        if (ids[index] !== id) continue;
        for (const neighbour of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]) {
          if (neighbour < 0) continue;
          const other = find(ids[neighbour]);
          if (other !== find(id)) touches.set(other, (touches.get(other) ?? 0) + 1);
        }
      }
    }
    let target = -1;
    let most = 0;
    for (const [other, count] of touches) {
      if (count > most) { most = count; target = other; }
    }
    if (target < 0) continue;
    const root = find(target);
    parent[id] = root;
    const merged = regions[root];
    merged.area += regions[id].area;
    merged.box = union(merged.box, box);
  }

  const remap = new Int32Array(regions.length).fill(-1);
  const kept: Region[] = [];
  regions.forEach((_, id) => {
    const root = find(id);
    if (remap[root] === -1) {
      remap[root] = kept.length;
      kept.push(regions[root]);
    }
    remap[id] = remap[root];
  });
  const map = new Uint16Array(labels.length);
  for (let index = 0; index < labels.length; index += 1) map[index] = remap[ids[index]];
  return { map, regions: kept };
}

/**
 * D-FINE / RT-DETR outputs: `[1, queries, classes]` logits and
 * `[1, queries, 4]` centre boxes, both normalised. Keeps confident queries
 * and suppresses same-class overlaps.
 */
export function readDetections(logits: ArrayLike<number>, boxes: ArrayLike<number>, queries: number, classes: number, threshold: number) {
  const found: Detection[] = [];
  for (let query = 0; query < queries; query += 1) {
    let best = 0;
    let bestLogit = -Infinity;
    for (let label = 0; label < classes; label += 1) {
      const value = logits[query * classes + label];
      if (value > bestLogit) { bestLogit = value; best = label; }
    }
    const score = 1 / (1 + Math.exp(-bestLogit));
    if (score < threshold) continue;
    const cx = boxes[query * 4];
    const cy = boxes[query * 4 + 1];
    const w = boxes[query * 4 + 2];
    const h = boxes[query * 4 + 3];
    found.push({
      label: best,
      score,
      box: { x0: clamp01(cx - w / 2), y0: clamp01(cy - h / 2), x1: clamp01(cx + w / 2), y1: clamp01(cy + h / 2) },
    });
  }
  found.sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const detection of found) {
    if (kept.some((other) => other.label === detection.label && iou(other.box, detection.box) > 0.5)) continue;
    kept.push(detection);
  }
  return kept;
}

/**
 * Paints detected objects into the region map as inscribed ellipses, smaller
 * objects last so they stay on top. Returns the added regions.
 */
export function stampDetections(map: Uint16Array, width: number, height: number, detections: readonly Detection[], firstObjectThing: number) {
  const added: Region[] = [];
  const order = [...detections].sort((a, b) => area(b.box) - area(a.box));
  let next = 0;
  for (let index = 0; index < map.length; index += 1) if (map[index] >= next) next = map[index] + 1;
  for (const detection of order) {
    const x0 = detection.box.x0 * width;
    const y0 = detection.box.y0 * height;
    const x1 = detection.box.x1 * width;
    const y1 = detection.box.y1 * height;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.max(0.5, ((x1 - x0) / 2) * 0.94);
    const ry = Math.max(0.5, ((y1 - y0) / 2) * 0.94);
    const id = next++;
    const box = { x0: width, y0: height, x1: 0, y1: 0 };
    let count = 0;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y += 1) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        map[y * width + x] = id;
        count += 1;
        if (x < box.x0) box.x0 = x;
        if (y < box.y0) box.y0 = y;
        if (x + 1 > box.x1) box.x1 = x + 1;
        if (y + 1 > box.y1) box.y1 = y + 1;
      }
    }
    added.push({ thing: firstObjectThing + detection.label, area: count, box });
  }
  return added;
}

/** Recounts areas after objects covered parts of scene regions. */
export function recountAreas(map: Uint16Array, regions: Region[]) {
  for (const region of regions) region.area = 0;
  for (let index = 0; index < map.length; index += 1) {
    const region = regions[map[index]];
    if (region) region.area += 1;
  }
}

/** Square crop around a box (map units) with some context, in frame pixels. */
export function cropWindow(box: Box, scaleX: number, scaleY: number, frameWidth: number, frameHeight: number): Box {
  const cx = ((box.x0 + box.x1) / 2) * scaleX;
  const cy = ((box.y0 + box.y1) / 2) * scaleY;
  const longest = Math.max((box.x1 - box.x0) * scaleX, (box.y1 - box.y0) * scaleY) * 1.1;
  const side = Math.min(Math.max(32, longest), frameWidth, frameHeight);
  const x0 = Math.min(frameWidth - side, Math.max(0, cx - side / 2));
  const y0 = Math.min(frameHeight - side, Math.max(0, cy - side / 2));
  return { x0, y0, x1: x0 + side, y1: y0 + side };
}

/** Softmax over cosine similarities (CLIP logit scale 100). */
export function phraseProbabilities(image: ArrayLike<number>, imageOffset: number, phrases: Int8Array, first: number, count: number, dim: number) {
  let norm = 0;
  for (let k = 0; k < dim; k += 1) norm += image[imageOffset + k] ** 2;
  norm = Math.sqrt(norm) || 1;
  const scores = new Float32Array(count);
  let max = -Infinity;
  for (let candidate = 0; candidate < count; candidate += 1) {
    let dot = 0;
    const base = (first + candidate) * dim;
    for (let k = 0; k < dim; k += 1) dot += image[imageOffset + k] * phrases[base + k];
    scores[candidate] = (100 * dot) / (norm * 127);
    if (scores[candidate] > max) max = scores[candidate];
  }
  let sum = 0;
  for (let candidate = 0; candidate < count; candidate += 1) sum += scores[candidate] = Math.exp(scores[candidate] - max);
  for (let candidate = 0; candidate < count; candidate += 1) scores[candidate] /= sum;
  return scores;
}

export function iou(a: Box, b: Box) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / (area(a) + area(b) - inter);
}

function area(box: Box) {
  return Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0);
}

function union(a: Box, b: Box): Box {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
