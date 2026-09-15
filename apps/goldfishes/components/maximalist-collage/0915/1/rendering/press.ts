import { createStratum, HEIGHT, WIDTH, type Stratum } from "../model/score";
import { makeMaterial, type MaterialImages } from "./material";

type ClickRecord = { id: number; x: number; y: number; phase: number };
const MAX_RECORDS = 2048;

/** Two fixed rasters: the accumulated print and the most recent performance. */
export class CollagePress {
  private archive = document.createElement("canvas");
  private archiveContext: CanvasRenderingContext2D;
  private context: CanvasRenderingContext2D;
  private current: Stratum | null = null;
  private timer: number | undefined;
  private nextId = 0;
  private phase = 0;
  private records: ClickRecord[] = [];
  private paused = false;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, private images: MaterialImages) {
    canvas.width = this.archive.width = WIDTH;
    canvas.height = this.archive.height = HEIGHT;
    const context = canvas.getContext("2d");
    const archiveContext = this.archive.getContext("2d");
    if (!context || !archiveContext) throw new Error("Canvas 2D is unavailable.");
    this.context = context;
    this.archiveContext = archiveContext;
    this.base();
    this.present();
  }

  private base() {
    const c = this.archiveContext;
    c.fillStyle = "#f2f1eb";
    c.fillRect(0, 0, WIDTH, HEIGHT);
    const sheets = [
      ["search", -30, -30, 1100], ["youtube", 910, 0, 770],
      ["linkedin", -35, 548, 710], ["instagram", 1190, 390, 465],
      ["chat", 619, 423, 635], ["headline", -35, 332, 1270],
      ["ticker", 0, 952, 1660],
    ] as const;
    for (const [kind, x, y, width] of sheets) {
      const image = makeMaterial(kind, 0, 0, this.images);
      c.drawImage(image, x, y, width, width * image.height / image.width);
    }
  }

  private paint(c: CanvasRenderingContext2D, stratum: Stratum, phase: number) {
    for (let index = 0; index < stratum.fragments.length; index++) {
      const fragment = stratum.fragments[index];
      // One shared cut clock; only the three image/feed voices re-cut.
      const changing = index < 3;
      const source = fragment.source + (changing ? phase * 5 : index);
      const image = makeMaterial(fragment.kind, stratum.topic, source, this.images);
      c.save();
      c.beginPath(); c.rect(fragment.x, fragment.y, fragment.width, fragment.height); c.clip();
      if (fragment.kind === "headline") c.globalCompositeOperation = "multiply";
      if (fragment.kind === "eye") c.globalAlpha = .83;
      const scaledHeight = fragment.width * image.height / image.width;
      // Crop the printed page, never squash its typography to match the cut.
      const crop = changing && scaledHeight > fragment.height
        ? Math.min(scaledHeight - fragment.height, phase * 19) : 0;
      c.drawImage(image, fragment.x, fragment.y - crop, fragment.width, scaledHeight);
      c.restore();
    }
  }

  private present() {
    this.context.clearRect(0, 0, WIDTH, HEIGHT);
    this.context.drawImage(this.archive, 0, 0);
    if (this.current) this.paint(this.context, this.current, this.phase);
    const record = this.records.at(-1);
    if (record && this.current) record.phase = this.phase;
  }

  private commit() {
    window.clearTimeout(this.timer);
    if (this.current) this.paint(this.archiveContext, this.current, this.phase);
    this.current = null;
  }

  add(x: number, y: number) {
    if (this.disposed) return;
    x = Math.round(Math.min(WIDTH, Math.max(0, x)));
    y = Math.round(Math.min(HEIGHT, Math.max(0, y)));
    // A rapid second click prints the preceding cut; no event queue or dropped clicks.
    this.commit();
    const id = this.nextId++;
    this.current = createStratum(id, x, y);
    this.phase = 0;
    this.records.push({ id, x, y, phase: 0 });
    if (this.records.length > MAX_RECORDS) this.records.shift();
    this.present();
    if (!this.paused) this.schedule();
  }

  private schedule() {
    this.timer = window.setTimeout(() => {
      if (this.disposed || this.paused || !this.current) return;
      this.phase++;
      this.present();
      if (this.phase < 3) this.schedule();
      else this.commit();
    }, 240);
  }

  setPaused(paused: boolean) {
    window.clearTimeout(this.timer);
    this.paused = paused;
    if (!paused && this.current && this.phase < 3) this.schedule();
  }

  async png() {
    return new Promise<Blob>((resolve, reject) => this.canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The image could not be saved.")), "image/png",
    ));
  }

  score() {
    return new Blob([JSON.stringify({
      version: "goldfishes-maximalist-collage-1",
      width: WIDTH, height: HEIGHT, totalStrata: this.nextId,
      retainedEvents: this.records, oldestRetainedId: this.records[0]?.id ?? null,
      note: "The last 2048 clicks and their final/current cut phases. Older pixels remain in the print. Save PNG for the exact visible image. No external feeds or screen sync.",
    }, null, 2)], { type: "application/json" });
  }

  dispose() {
    this.disposed = true;
    window.clearTimeout(this.timer);
    this.current = null;
    this.records = [];
    this.archive.width = this.archive.height = 0;
  }
}
