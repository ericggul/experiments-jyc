import * as THREE from "three";
import type { CameraMonolithFrame } from "../transport";

export const FRAME_ATLAS_COLUMNS = 16;
export const FRAME_ATLAS_ROWS = 16;
export const FRAME_ATLAS_TILE_SIZE = 128;
export const FRAME_ATLAS_CAPACITY = FRAME_ATLAS_COLUMNS * FRAME_ATLAS_ROWS;

export class FrameAtlas {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private nextTile = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = FRAME_ATLAS_COLUMNS * FRAME_ATLAS_TILE_SIZE;
    this.canvas.height = FRAME_ATLAS_ROWS * FRAME_ATLAS_TILE_SIZE;
    const context = this.canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Camera monolith atlas requires Canvas 2D.");
    this.context = context;
    context.fillStyle = "#0d0e0d";
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  write(frame: CameraMonolithFrame) {
    const bitmap = frame.image;
    const tile = this.nextTile;
    this.nextTile = (this.nextTile + 1) % FRAME_ATLAS_CAPACITY;

    const x = (tile % FRAME_ATLAS_COLUMNS) * FRAME_ATLAS_TILE_SIZE;
    const y = Math.floor(tile / FRAME_ATLAS_COLUMNS) * FRAME_ATLAS_TILE_SIZE;
    try {
      this.context.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        x,
        y,
        FRAME_ATLAS_TILE_SIZE,
        FRAME_ATLAS_TILE_SIZE,
      );
    } finally {
      bitmap.close();
    }
    this.texture.needsUpdate = true;
    return tile;
  }

  dispose() {
    this.texture.dispose();
  }
}
