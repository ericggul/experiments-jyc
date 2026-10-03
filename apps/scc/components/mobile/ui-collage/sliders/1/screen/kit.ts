// Shared drawing state: device-pixel sprites for gradient/bevel parts, painted once per look,
// size and pixel ratio, and gradients cached per look and row.
export type Sprite = { canvas: HTMLCanvasElement; w: number; h: number };
export type Paint = (context: CanvasRenderingContext2D, w: number, h: number, ratio: number) => void;

export class Kit {
  ratio = 1;
  private sprites = new Map<string, Sprite>();
  private gradients = new Map<string, CanvasGradient>();

  setRatio(ratio: number) {
    if (ratio === this.ratio) return;
    this.ratio = ratio;
    this.sprites.clear();
  }

  /** Row gradients use absolute coordinates, so a new layout drops them. */
  clearGradients() {
    this.gradients.clear();
  }

  snap(value: number) {
    return Math.round(value * this.ratio) / this.ratio;
  }

  /** Sprite sizes round to whole CSS pixels so a blit never resamples. */
  sprite(key: string, width: number, height: number, paint: Paint): Sprite {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const id = `${key}:${w}:${h}`;
    let sprite = this.sprites.get(id);
    if (sprite) return sprite;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * this.ratio));
    canvas.height = Math.max(1, Math.round(h * this.ratio));
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(canvas.width / w, canvas.height / h);
      paint(context, w, h, this.ratio);
    }
    sprite = { canvas, w, h };
    this.sprites.set(id, sprite);
    return sprite;
  }

  gradient(key: string, make: () => CanvasGradient) {
    let gradient = this.gradients.get(key);
    if (!gradient) {
      gradient = make();
      this.gradients.set(key, gradient);
    }
    return gradient;
  }
}

/** Draws a sprite centred on (x, y), aligned to device pixels. */
export function blit(context: CanvasRenderingContext2D, kit: Kit, sprite: Sprite, x: number, y: number) {
  context.drawImage(sprite.canvas, kit.snap(x - sprite.w / 2), kit.snap(y - sprite.h / 2), sprite.w, sprite.h);
}

/**
 * Three-slice vertical stretch: the sprite's top and bottom `cap` are drawn as is and its middle
 * row is stretched between them, so a rounded gradient track costs three image copies.
 */
export function stretch(context: CanvasRenderingContext2D, kit: Kit, sprite: Sprite, cap: number, x: number, y0: number, y1: number) {
  const top = kit.snap(y0);
  const bottom = kit.snap(y1);
  const length = bottom - top;
  if (length <= 0) return;
  const { canvas } = sprite;
  const left = kit.snap(x);
  const capPixels = Math.min(Math.round(cap * kit.ratio), Math.floor((canvas.height - 1) / 2));
  const end = Math.min(capPixels / kit.ratio, length / 2);
  context.drawImage(canvas, 0, 0, canvas.width, capPixels, left, top, sprite.w, end);
  if (length > end * 2) context.drawImage(canvas, 0, capPixels, canvas.width, 1, left, top + end, sprite.w, length - end * 2);
  context.drawImage(canvas, 0, canvas.height - capPixels, canvas.width, capPixels, left, bottom - end, sprite.w, end);
}
