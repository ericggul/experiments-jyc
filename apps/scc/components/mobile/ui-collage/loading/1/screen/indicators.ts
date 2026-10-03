// Determinate clones of common circular phone loaders. Every cell adds its geometry to shared
// layers, so a frame costs one stroke/fill per layer instead of several per indicator.
export type Look =
  | "ios"
  | "iosClassic"
  | "material"
  | "wavy"
  | "appstore"
  | "pie"
  | "telegram"
  | "watch"
  | "fluent"
  | "gauge"
  | "ticks"
  | "liquid";

export const lookOrder: readonly Look[] = ["ios", "iosClassic", "material", "wavy", "appstore", "pie", "telegram", "watch", "fluent", "gauge", "ticks", "liquid"];

type Layer = {
  id: number;
  z: number;
  kind: "stroke" | "fill" | "text";
  color: string;
  /** Stroke width as a share of the indicator size. */
  width?: number;
  cap?: CanvasLineCap;
  alpha?: number;
  composite?: GlobalCompositeOperation;
  /** Text: CSS weight, family, and size as a share of the indicator size. */
  weight?: number;
  family?: string;
  fontScale?: number;
};

const layers: Layer[] = [];
function layer(spec: Omit<Layer, "id">): Layer {
  const entry = { ...spec, id: layers.length };
  layers.push(entry);
  return entry;
}

const top = -Math.PI / 2;
const turn = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

const apple = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";
const roboto = "Roboto, 'Google Sans', Arial, sans-serif";
const segoe = "'Segoe UI Variable', 'Segoe UI', Arial, sans-serif";

// Spokes are drawn in quantised opacity steps so each step is one stroke for the whole grid.
const alphaSteps = 12;
const spokeLayers = (color: string, width: number) =>
  Array.from({ length: alphaSteps + 1 }, (_, step) => layer({ z: 10, kind: "stroke", color, width, cap: "round", alpha: step / alphaSteps }));

const L = {
  ios: spokeLayers("#8e8e93", 0.09),
  iosClassic: spokeLayers("#7f7f7f", 0.075),
  iosText: layer({ z: 90, kind: "text", color: "#3c3c43", weight: 600, family: apple, fontScale: 0.17 }),
  materialTrack: layer({ z: 10, kind: "stroke", color: "#e8def8", width: 4 / 48, cap: "round" }),
  materialActive: layer({ z: 20, kind: "stroke", color: "#6750a4", width: 4 / 48, cap: "round" }),
  materialText: layer({ z: 90, kind: "text", color: "#1d1b20", weight: 500, family: roboto, fontScale: 0.2 }),
  storeWaiting: layer({ z: 10, kind: "stroke", color: "#c7c7cc", width: 0.085, cap: "butt" }),
  storeTrack: layer({ z: 10, kind: "stroke", color: "#e5e5ea", width: 0.085, cap: "butt" }),
  storeActive: layer({ z: 20, kind: "stroke", color: "#007aff", width: 0.085, cap: "butt" }),
  storeStop: layer({ z: 30, kind: "fill", color: "#007aff" }),
  storeText: layer({ z: 90, kind: "text", color: "#007aff", weight: 700, family: apple, fontScale: 0.21 }),
  pieRing: layer({ z: 10, kind: "stroke", color: "#3a3a3c", width: 0.06 }),
  pieWedge: layer({ z: 20, kind: "fill", color: "#3a3a3c" }),
  // White text in difference mode reads black on the page and light on the wedge.
  pieText: layer({ z: 91, kind: "text", color: "#fff", composite: "difference", weight: 700, family: apple, fontScale: 0.21 }),
  telegramDisc: layer({ z: 10, kind: "fill", color: "#000", alpha: 0.45 }),
  telegramArc: layer({ z: 20, kind: "stroke", color: "#fff", width: 0.05, cap: "round" }),
  telegramCross: layer({ z: 20, kind: "stroke", color: "#fff", width: 0.05, cap: "round" }),
  telegramText: layer({ z: 90, kind: "text", color: "#fff", weight: 600, family: apple, fontScale: 0.2 }),
  watchTrack: layer({ z: 10, kind: "stroke", color: "#fa114f", width: 0.2, alpha: 0.22 }),
  watchActive: layer({ z: 20, kind: "stroke", color: "#fa114f", width: 0.2, cap: "round" }),
  watchText: layer({ z: 90, kind: "text", color: "#fa114f", weight: 700, family: apple, fontScale: 0.15 }),
  fluentTrack: layer({ z: 10, kind: "stroke", color: "#e5e5e5", width: 4 / 32, cap: "round" }),
  fluentActive: layer({ z: 20, kind: "stroke", color: "#005fb8", width: 4 / 32, cap: "round" }),
  fluentText: layer({ z: 90, kind: "text", color: "#1a1a1a", weight: 600, family: segoe, fontScale: 0.2 }),
  gaugeTrack: layer({ z: 10, kind: "stroke", color: "#e5e5ea", width: 0.1, cap: "round" }),
  gaugeActive: layer({ z: 20, kind: "stroke", color: "#34c759", width: 0.1, cap: "round" }),
  gaugeText: layer({ z: 90, kind: "text", color: "#1c1c1e", weight: 700, family: apple, fontScale: 0.22 }),
  ticksOff: layer({ z: 10, kind: "stroke", color: "#d8d8d8", width: 0.035, cap: "round" }),
  ticksOn: layer({ z: 20, kind: "stroke", color: "#1a1a1a", width: 0.035, cap: "round" }),
  ticksText: layer({ z: 90, kind: "text", color: "#1a1a1a", weight: 600, family: roboto, fontScale: 0.2 }),
  liquidWater: layer({ z: 10, kind: "fill", color: "#5aa0f2" }),
  liquidRing: layer({ z: 20, kind: "stroke", color: "#2f80ed", width: 0.05 }),
  liquidText: layer({ z: 90, kind: "text", color: "#0b3d91", weight: 700, family: apple, fontScale: 0.21 }),
};

const drawOrder = [...layers].sort((a, b) => a.z - b.z || a.id - b.id);
const percentLabels = Array.from({ length: 101 }, (_, value) => `${value}%`);

export class Batch {
  private paths: (Path2D | null)[] = [];
  private textX: number[][] = layers.map(() => []);
  private textY: number[][] = layers.map(() => []);
  private textValue: string[][] = layers.map(() => []);

  begin() {
    this.paths = layers.map(() => null);
    for (let index = 0; index < layers.length; index += 1) {
      this.textX[index]!.length = 0;
      this.textY[index]!.length = 0;
      this.textValue[index]!.length = 0;
    }
  }

  path(entry: Layer) {
    return (this.paths[entry.id] ??= new Path2D());
  }

  text(entry: Layer, x: number, y: number, progress: number) {
    this.textX[entry.id]!.push(x);
    this.textY[entry.id]!.push(y);
    this.textValue[entry.id]!.push(percentLabels[Math.floor(progress * 100)]!);
  }

  flush(context: CanvasRenderingContext2D, size: number) {
    context.lineJoin = "round";
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const entry of drawOrder) {
      const path = this.paths[entry.id];
      const count = this.textX[entry.id]!.length;
      if (!path && count === 0) continue;
      context.globalAlpha = entry.alpha ?? 1;
      context.globalCompositeOperation = entry.composite ?? "source-over";
      if (entry.kind === "text") {
        context.fillStyle = entry.color;
        context.font = `${entry.weight} ${Math.max(7, Math.round(size * entry.fontScale! * 2) / 2)}px ${entry.family}`;
        const xs = this.textX[entry.id]!;
        const ys = this.textY[entry.id]!;
        const values = this.textValue[entry.id]!;
        for (let index = 0; index < count; index += 1) context.fillText(values[index]!, xs[index]!, ys[index]!);
      } else if (entry.kind === "stroke") {
        context.strokeStyle = entry.color;
        context.lineWidth = Math.max(1, (entry.width ?? 0.05) * size);
        context.lineCap = entry.cap ?? "butt";
        context.stroke(path!);
      } else {
        context.fillStyle = entry.color;
        context.fill(path!);
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
}

function arc(path: Path2D, x: number, y: number, radius: number, from: number, to: number) {
  path.moveTo(x + Math.cos(from) * radius, y + Math.sin(from) * radius);
  path.arc(x, y, radius, from, to);
}

type Add = (batch: Batch, x: number, y: number, size: number, progress: number, time: number, percent: boolean) => void;

// UIActivityIndicatorView. Reached spokes keep the stepping shimmer but never fall below half
// opacity; unreached spokes stay a faint track, so the filled share reads from 0% to 100%.
function spokes(steps: Layer[], count: number, inner: number, width: number): Add {
  return (batch, x, y, size, progress, time, percent) => {
    const r1 = size * inner;
    const r2 = size * 0.5 - (size * width) / 2;
    const head = Math.floor(time * count) % count;
    for (let spoke = 0; spoke < count; spoke += 1) {
      const reached = clamp(progress * count - spoke);
      const shimmer = progress >= 1 ? 1 : 1 - (((head - spoke + count) % count) / count) * 0.5;
      const alpha = 0.1 + (shimmer - 0.1) * reached;
      const path = batch.path(steps[Math.round(alpha * alphaSteps)]!);
      const angle = top + (spoke / count) * turn;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      path.moveTo(x + cos * r1, y + sin * r1);
      path.lineTo(x + cos * r2, y + sin * r2);
    }
    if (percent) batch.text(L.iosText, x, y, progress);
  };
}

// Track arcs leave a gap (in px) on both sides of the active arc, as Material 3 and WinUI do.
function ring(track: Layer, active: Layer, radius: number, stroke: number, gapPx: number, start = top, span = turn) {
  return (batch: Batch, x: number, y: number, size: number, progress: number) => {
    const r = size * radius;
    const gap = progress > 0 && progress < 1 ? (gapPx * size + stroke * size) / r : 0;
    const sweep = progress * span;
    if (progress < 1 && span - sweep - gap * (span === turn ? 2 : 1) > 0) {
      arc(batch.path(track), x, y, r, start + sweep + gap, start + span - (span === turn && progress > 0 ? gap : 0));
    }
    if (sweep > 0) arc(batch.path(active), x, y, r, start, start + sweep);
  };
}

const materialRing = ring(L.materialTrack, L.materialActive, 20 / 48 - 2 / 48, 4 / 48, 4 / 48);
const fluentRing = ring(L.fluentTrack, L.fluentActive, 0.5 - 2 / 32, 4 / 32, 0);
const watchRing = ring(L.watchTrack, L.watchActive, 0.4, 0, 0);
const gaugeRing = ring(L.gaugeTrack, L.gaugeActive, 0.45, 0, 0, Math.PI * 0.75, Math.PI * 1.5);

const adds: Record<Look, Add> = {
  ios: spokes(L.ios, 8, 0.25, 0.09),
  iosClassic: spokes(L.iosClassic, 12, 0.27, 0.075),

  // Material 3 CircularProgressIndicator: 48 dp container, 40 dp ring, 4 dp stroke, 4 dp gap.
  material: (batch, x, y, size, progress, _time, percent) => {
    materialRing(batch, x, y, size, progress);
    if (percent) batch.text(L.materialText, x, y, progress);
  },

  // Material 3 Expressive CircularWavyProgressIndicator: a travelling sine (≈15 dp wavelength,
  // 1.6 dp amplitude) on the active arc that flattens near 0% and 100%.
  wavy: (batch, x, y, size, progress, time, percent) => {
    const unit = size / 48;
    const radius = 18.4 * unit;
    const amplitude = 1.6 * unit * smoothstep(0.04, 0.12, progress) * (1 - smoothstep(0.9, 0.97, progress));
    const waves = Math.max(3, Math.round((turn * radius) / (15 * unit)));
    const sweep = progress * turn;
    const gap = progress > 0 && progress < 1 ? (8 * unit) / radius : 0;
    if (progress < 1 && turn - sweep - 2 * gap > 0) arc(batch.path(L.materialTrack), x, y, radius, top + sweep + gap, top + turn - gap);
    if (sweep > 0) {
      const path = batch.path(L.materialActive);
      const steps = Math.max(6, Math.ceil((sweep * radius) / 2));
      const phase = time * turn;
      for (let step = 0; step <= steps; step += 1) {
        const angle = (sweep * step) / steps;
        const r = radius + amplitude * Math.sin(angle * waves - phase);
        const px = x + Math.cos(top + angle) * r;
        const py = y + Math.sin(top + angle) * r;
        if (step === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
    }
    if (percent) batch.text(L.materialText, x, y, progress);
  },

  // App Store download: grey spinning "waiting" arc before the first byte, then a thin ring,
  // the blue arc, and the rounded stop square (replaced by the number when shown).
  appstore: (batch, x, y, size, progress, time, percent) => {
    const radius = size * (0.5 - 0.0425);
    if (progress <= 0) {
      const start = top + (time % 1) * turn;
      arc(batch.path(L.storeWaiting), x, y, radius, start, start + turn * 0.8);
      return;
    }
    arc(batch.path(L.storeTrack), x, y, radius, 0, turn);
    arc(batch.path(L.storeActive), x, y, radius, top, top + progress * turn);
    if (percent) batch.text(L.storeText, x, y, progress);
    else {
      const side = size * 0.3;
      batch.path(L.storeStop).roundRect(x - side / 2, y - side / 2, side, side, size * 0.05);
    }
  },

  // iOS pie (Files, AirDrop, attachments): outline ring and an inset wedge.
  pie: (batch, x, y, size, progress, _time, percent) => {
    const radius = size * 0.47;
    arc(batch.path(L.pieRing), x, y, radius, 0, turn);
    if (progress > 0) {
      const wedge = size * 0.38;
      const path = batch.path(L.pieWedge);
      if (progress >= 1) arc(path, x, y, wedge, 0, turn);
      else {
        path.moveTo(x, y);
        path.arc(x, y, wedge, top, top + progress * turn);
        path.closePath();
      }
    }
    if (percent) batch.text(L.pieText, x, y, progress);
  },

  // Telegram media upload: translucent black disc, a white arc that also turns, and a cancel cross.
  telegram: (batch, x, y, size, progress, time, percent) => {
    arc(batch.path(L.telegramDisc), x, y, size * 0.5, 0, turn);
    const radius = size * 0.39;
    if (progress >= 1) arc(batch.path(L.telegramArc), x, y, radius, 0, turn);
    else {
      const start = top + time * turn * 0.55;
      arc(batch.path(L.telegramArc), x, y, radius, start, start + Math.max(0.04, progress) * turn);
    }
    if (percent) batch.text(L.telegramText, x, y, progress);
    else {
      const arm = size * 0.12;
      const path = batch.path(L.telegramCross);
      path.moveTo(x - arm, y - arm);
      path.lineTo(x + arm, y + arm);
      path.moveTo(x + arm, y - arm);
      path.lineTo(x - arm, y + arm);
    }
  },

  // Apple Watch activity ring: thick round-capped ring over its own dim track.
  watch: (batch, x, y, size, progress, _time, percent) => {
    watchRing(batch, x, y, size, progress);
    if (percent) batch.text(L.watchText, x, y, progress);
  },

  // WinUI 3 ProgressRing (Windows 11): 4 px stroke on a 32 px ring, accent arc.
  fluent: (batch, x, y, size, progress, _time, percent) => {
    fluentRing(batch, x, y, size, progress);
    if (percent) batch.text(L.fluentText, x, y, progress);
  },

  // 270° gauge open at the bottom, as in phone storage and battery-care screens.
  gauge: (batch, x, y, size, progress, _time, percent) => {
    gaugeRing(batch, x, y, size, progress);
    if (percent) batch.text(L.gaugeText, x, y + size * 0.03, progress);
  },

  // Watch-face tick ring: thirty radial ticks lit clockwise.
  ticks: (batch, x, y, size, progress, _time, percent) => {
    const count = 30;
    const r1 = size * 0.35;
    const r2 = size * 0.48;
    const lit = Math.round(progress * count);
    const on = batch.path(L.ticksOn);
    const off = batch.path(L.ticksOff);
    for (let tick = 0; tick < count; tick += 1) {
      const angle = top + (tick / count) * turn;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const path = tick < lit ? on : off;
      path.moveTo(x + cos * r1, y + sin * r1);
      path.lineTo(x + cos * r2, y + sin * r2);
    }
    if (percent) batch.text(L.ticksText, x, y, progress);
  },

  // Liquid fill: a circle whose water level rises with a small travelling wave.
  liquid: (batch, x, y, size, progress, time, percent) => {
    const outer = size * 0.475;
    arc(batch.path(L.liquidRing), x, y, outer, 0, turn);
    const radius = size * 0.42;
    if (progress > 0) {
      const path = batch.path(L.liquidWater);
      if (progress >= 1) arc(path, x, y, radius, 0, turn);
      else {
        const level = radius - progress * 2 * radius;
        const amplitude = size * 0.035 * Math.sin(Math.PI * progress);
        const samples = 16;
        for (let step = 0; step <= samples; step += 1) {
          const dx = -radius + (2 * radius * step) / samples;
          const edge = Math.sqrt(Math.max(0, radius * radius - dx * dx));
          const surface = Math.max(-edge, Math.min(edge, level + amplitude * Math.sin((dx / radius) * Math.PI * 1.5 + time * 4)));
          if (step === 0) path.moveTo(x + dx, y + surface);
          else path.lineTo(x + dx, y + surface);
        }
        for (let step = samples; step >= 0; step -= 1) {
          const dx = -radius + (2 * radius * step) / samples;
          path.lineTo(x + dx, y + Math.sqrt(Math.max(0, radius * radius - dx * dx)));
        }
        path.closePath();
      }
    }
    if (percent) batch.text(L.liquidText, x, y, progress);
  },
};

export function addIndicator(batch: Batch, look: Look, x: number, y: number, size: number, progress: number, time: number, percent: boolean) {
  adds[look](batch, x, y, size, progress, time, percent);
}
