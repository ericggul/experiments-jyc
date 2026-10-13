import { materials, normalisedConstituents, type MaterialId } from "../model/materials.ts";
import type { Analysis } from "../inference/protocol.ts";
import { typesetFormula } from "./formula.ts";
import { buildTape, itemsInRun, rowRuns, type TapeItem } from "./tape.ts";

// The lettered field over the camera. Lettering is rebuilt only when an
// analysis or the selection arrives and cross-fades in; "over" mode then
// leaves the canvas alone, "decomposed" mode re-tints the lettering with the
// live camera each frame.

export type View = "over" | "decomposed";

export const TYPE_SIZES = { small: 10, medium: 13, large: 18 } as const;
export type TypeSize = keyof typeof TYPE_SIZES;

const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const FADE_MS = 280;
const UNSELECTED_ALPHA = 0.26;
const DECOMPOSED_FLOOR = 0.2;

const materialIds = Object.keys(materials) as MaterialId[];
const shares = new Map(materialIds.map((id, index) => {
  const constituents = normalisedConstituents(materials[id]);
  let sum = 0;
  return [id, {
    salt: index,
    formulas: constituents.map(([formula]) => formula),
    cumulative: Float64Array.from(constituents, ([, share]) => (sum += share)),
  }];
}));

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class Field {
  private readonly context: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private size: number = TYPE_SIZES.medium;
  private current: HTMLCanvasElement;
  private previous: HTMLCanvasElement;
  private mix: HTMLCanvasElement;
  private fadeStart = -Infinity;
  private analysis: Analysis | null = null;
  /** `thing|material` of the tapped region: every such region stays lit. */
  private selected: string | null = null;
  private sprites = new Map<string, HTMLCanvasElement>();
  private tapes = new Map<string, TapeItem[]>();
  private settled = false;
  private measurer: CanvasRenderingContext2D | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d")!;
    this.current = makeCanvas(1, 1);
    this.previous = makeCanvas(1, 1);
    this.mix = makeCanvas(1, 1);
  }

  get lineHeight() {
    return Math.round(this.size * 1.3);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    for (const target of [this.canvas, this.current, this.previous, this.mix]) {
      target.width = this.width;
      target.height = this.height;
    }
    this.tapes.clear();
    this.rebuild(false);
  }

  setTypeSize(size: number) {
    if (size === this.size) return;
    this.size = size;
    this.sprites.clear();
    this.tapes.clear();
    this.rebuild(false);
  }

  setAnalysis(analysis: Analysis) {
    this.analysis = analysis;
    this.rebuild(true);
  }

  /** Region index under a point in CSS pixels, if analysed. */
  regionAt(x: number, y: number) {
    const analysis = this.analysis;
    if (!analysis) return null;
    const mx = Math.min(analysis.width - 1, Math.max(0, Math.floor((x / this.width) * analysis.width)));
    const my = Math.min(analysis.height - 1, Math.max(0, Math.floor((y / this.height) * analysis.height)));
    return analysis.map[my * analysis.width + mx];
  }

  region(index: number | null) {
    return index === null ? null : this.analysis?.regions[index] ?? null;
  }

  select(key: string | null) {
    if (key === this.selected) return;
    this.selected = key;
    this.rebuild(true);
  }

  draw(video: HTMLVideoElement | null, view: View, now: number) {
    const fade = Math.min(1, (now - this.fadeStart) / FADE_MS);
    if (view === "over") {
      if (this.settled && fade >= 1) return;
      this.composeLettering(this.context, fade);
      this.settled = fade >= 1;
      return;
    }
    this.settled = false;
    const mix = this.mix.getContext("2d")!;
    this.composeLettering(mix, fade);
    const context = this.context;
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.clearRect(0, 0, this.width, this.height);
    context.drawImage(this.mix, 0, 0);
    if (video && video.readyState >= 2) {
      context.globalCompositeOperation = "source-in";
      drawCover(context, video, this.width, this.height);
    }
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = DECOMPOSED_FLOOR;
    context.drawImage(this.mix, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#000";
    context.fillRect(0, 0, this.width, this.height);
    context.globalCompositeOperation = "source-over";
  }

  /** Forces the next "over" frame to repaint, e.g. after switching views. */
  invalidate() {
    this.settled = false;
  }

  private composeLettering(target: CanvasRenderingContext2D, fade: number) {
    target.globalCompositeOperation = "source-over";
    target.clearRect(0, 0, this.width, this.height);
    if (fade < 1) {
      target.globalAlpha = 1 - fade;
      target.drawImage(this.previous, 0, 0);
    }
    target.globalAlpha = fade;
    target.drawImage(this.current, 0, 0);
    target.globalAlpha = 1;
  }

  private rebuild(fade: boolean) {
    if (fade) {
      // Freeze what is on screen now as the layer fading out.
      const now = performance.now();
      this.composeLettering(this.mix.getContext("2d")!, Math.min(1, (now - this.fadeStart) / FADE_MS));
      const previous = this.previous.getContext("2d")!;
      previous.clearRect(0, 0, this.width, this.height);
      previous.drawImage(this.mix, 0, 0);
      this.fadeStart = now;
    } else {
      this.fadeStart = -Infinity;
    }
    this.settled = false;

    const layer = this.current.getContext("2d")!;
    layer.clearRect(0, 0, this.width, this.height);
    const analysis = this.analysis;
    if (!analysis) return;

    const line = this.lineHeight;
    const step = Math.max(2, Math.round(this.size / 4));
    const gap = Math.round(this.size * 0.55);
    for (let row = 0; row * line < this.height; row += 1) {
      const y = row * line;
      const sampleY = Math.min(this.height - 1, y + line / 2);
      const runs = rowRuns(this.width, step, (x) => this.regionAt(x, sampleY) ?? 0);
      for (const run of runs) {
        const seen = analysis.regions[run.region];
        if (!seen) continue;
        layer.globalAlpha = this.selected === null || this.selected === regionKey(seen) ? 1 : UNSELECTED_ALPHA;
        for (const item of itemsInRun(this.tape(row, seen.material, gap), run)) {
          layer.drawImage(this.sprite(item.formula), Math.round(item.x), y);
        }
      }
    }
    layer.globalAlpha = 1;
  }

  private tape(row: number, material: MaterialId, gap: number) {
    const key = `${row}|${material}`;
    let tape = this.tapes.get(key);
    if (!tape) {
      const share = shares.get(material)!;
      // Each row starts its tapes a little left of the screen, row by row apart.
      const start = -((row * 37 + share.salt * 11) % (this.size * 5));
      tape = buildTape(row, share.salt, share.formulas, share.cumulative, (formula) => this.sprite(formula).width, start, this.width, gap);
      this.tapes.set(key, tape);
    }
    return tape;
  }

  private sprite(formula: string) {
    let sprite = this.sprites.get(formula);
    if (sprite) return sprite;
    const runs = typesetFormula(formula);
    const base = this.size;
    const small = Math.round(base * 0.7 * 10) / 10;
    const font = (size: number) => `500 ${size}px ${FONT_FAMILY}`;
    const measure = (this.measurer ??= makeCanvas(1, 1).getContext("2d")!);
    let width = 0;
    for (const run of runs) {
      measure.font = font(run.level === "base" ? base : small);
      width += measure.measureText(run.text).width;
    }
    sprite = makeCanvas(Math.max(1, Math.ceil(width)), this.lineHeight);
    const context = sprite.getContext("2d")!;
    context.fillStyle = "#fff";
    context.textBaseline = "alphabetic";
    const baseline = Math.round(this.lineHeight / 2 + base * 0.34);
    let x = 0;
    for (const run of runs) {
      const isBase = run.level === "base";
      context.font = font(isBase ? base : small);
      const shift = isBase ? 0 : run.level === "sub" ? base * 0.24 : -base * 0.42;
      context.fillText(run.text, x, baseline + shift);
      x += context.measureText(run.text).width;
    }
    this.sprites.set(formula, sprite);
    return sprite;
  }
}

export function regionKey(region: { thing: number; material: MaterialId }) {
  return `${region.thing}|${region.material}`;
}

/** Source rectangle of a video shown with `object-fit: cover`. */
export function coverRect(videoWidth: number, videoHeight: number, width: number, height: number) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const sw = width / scale;
  const sh = height / scale;
  return { sx: (videoWidth - sw) / 2, sy: (videoHeight - sh) / 2, sw, sh };
}

function drawCover(context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const { sx, sy, sw, sh } = coverRect(video.videoWidth, video.videoHeight, width, height);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
}
