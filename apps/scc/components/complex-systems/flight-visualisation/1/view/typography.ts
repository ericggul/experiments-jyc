/**
 * viz1090 renders every string in 12px Terminus (bold for status boxes). Terminus is
 * monospaced, so text extents come from one measured advance rather than per-string
 * layout, which keeps label physics cheap.
 */

import { FONT_FAMILY, FONT_URLS } from "../config";

const BASE_SIZE = 12;

let fontsPromise: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  if (typeof FontFace === "undefined") return Promise.resolve();
  const faces = [
    new FontFace(FONT_FAMILY, `url(${FONT_URLS.regular})`, { weight: "400" }),
    new FontFace(FONT_FAMILY, `url(${FONT_URLS.bold})`, { weight: "700" }),
  ];
  fontsPromise = Promise.all(
    faces.map((face) =>
      face.load().then((loaded) => {
        document.fonts.add(loaded);
      }),
    ),
  )
    .then(() => undefined)
    .catch(() => undefined);
  return fontsPromise;
}

export class Typography {
  ui = 1;
  size = BASE_SIZE;
  regular = "";
  bold = "";
  charWidth = 6;
  boldCharWidth = 6;
  lineHeight = BASE_SIZE;
  /** Increments on every configure (scale change or font arrival). */
  version = 0;

  configure(context: CanvasRenderingContext2D, ui: number) {
    this.ui = ui;
    this.size = BASE_SIZE * ui;
    this.lineHeight = this.size;
    this.regular = `400 ${this.size}px ${FONT_FAMILY}, ui-monospace, monospace`;
    this.bold = `700 ${this.size}px ${FONT_FAMILY}, ui-monospace, monospace`;
    context.font = this.regular;
    this.charWidth = context.measureText("0000000000").width / 10;
    context.font = this.bold;
    this.boldCharWidth = context.measureText("0000000000").width / 10;
    this.version++;
  }

  width(text: string) {
    return text.length * this.charWidth;
  }
}
