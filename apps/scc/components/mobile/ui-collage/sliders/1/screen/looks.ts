// Vertical clones of slider controls, oldest to newest. Geometry is designed at a 20 px column
// (`u` = width / 20) and scales with it. Each look draws a whole batch of sliders: flat parts share
// one Path2D and one fill/stroke call, gradient and bevel parts are sprites painted once per size.
// Every track, trough, frame and pill spans exactly the box's whole-pixel top to bottom (strokes
// are inset half a pixel), so ends line up across looks; thumbs are sized from `reach` and travel
// within the shared inset, so none crosses those ends.
import { reach, type LookId } from "../model/looks";
import { blit, stretch, type Kit } from "./kit";

export type Box = {
  /** Left edge of the column. */
  x: number;
  cx: number;
  top: number;
  bottom: number;
  row: number;
  /** 0–1 shown value. */
  value: number;
  /** Thumb centre, snapped to device pixels. */
  thumb: number;
};

export type Geometry = { w: number; u: number; inset: number };

type Draw = (context: CanvasRenderingContext2D, boxes: readonly Box[], g: Geometry, kit: Kit) => void;

export type { LookId };

const fill = (context: CanvasRenderingContext2D, path: Path2D, color: string) => {
  context.fillStyle = color;
  context.fill(path);
};

const stroke = (context: CanvasRenderingContext2D, path: Path2D, color: string, width = 1) => {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke(path);
};

const circle = (path: Path2D, x: number, y: number, r: number) => {
  path.moveTo(x + r, y);
  path.arc(x, y, r, 0, Math.PI * 2);
};

/** Vertical rail with round ends; skipped when empty. */
const rail = (path: Path2D, cx: number, y0: number, y1: number, width: number) => {
  if (y1 - y0 <= 0) return;
  path.roundRect(cx - width / 2, y0, width, y1 - y0, Math.min(width / 2, (y1 - y0) / 2));
};

/** Even widths centre on a column's whole-pixel centre line. */
const even = (value: number) => Math.max(2, 2 * Math.round(value / 2));

/** Thumb sprite length along the track, from the look's reach. */
const along = (id: LookId, w: number) => 2 * reach[id] * w;

/** Eleven 1 px tick marks along the thumb's travel, on whole pixels. */
const ticks = (path: Path2D, box: Box, g: Geometry, x: number, length: number) => {
  const y0 = box.top + g.inset;
  const y1 = box.bottom - g.inset;
  const left = Math.round(x);
  const size = Math.max(1, Math.round(length));
  for (let k = 0; k <= 10; k += 1) path.rect(left, Math.round(y0 + ((y1 - y0) * k) / 10), size, 1);
};

/** Fixed-pixel Windows channels: 4 px, or 2 px in very narrow columns. */
const channelWidth = (u: number) => (u >= 0.75 ? 4 : 2);

const vertical = (context: CanvasRenderingContext2D, h: number, stops: [number, string][]) => {
  const gradient = context.createLinearGradient(0, 0, 0, h);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};

const horizontal = (context: CanvasRenderingContext2D, w: number, stops: [number, string][]) => {
  const gradient = context.createLinearGradient(0, 0, w, 0);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
};

/** A track sprite for `stretch`: a rounded bar with an across-the-track gradient. */
const trackSprite = (kit: Kit, key: string, width: number, stops: [number, string][], edge: string) =>
  kit.sprite(key, width, width + 2, (c, w, h) => {
    c.beginPath();
    c.roundRect(0.5, 0.5, w - 1, h - 1, (w - 1) / 2);
    c.fillStyle = horizontal(c, w, stops);
    c.fill();
    c.strokeStyle = edge;
    c.lineWidth = 1;
    c.stroke();
  });

// DJ mixer channel fader: a narrow black slot between grey scale marks, and a ribbed rubber cap
// with a white index line.
const dj: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const slot = new Path2D();
  const marks = new Path2D();
  const slotWidth = even(2 * u);
  for (const box of boxes) {
    slot.rect(box.cx - slotWidth / 2, box.top, slotWidth, box.bottom - box.top);
    ticks(marks, box, g, box.cx - slotWidth / 2 - 1 - Math.max(1, Math.round(4.5 * u)), 4.5 * u);
    ticks(marks, box, g, box.cx + slotWidth / 2 + 1, 4.5 * u);
  }
  fill(context, marks, "#9a9a9a");
  fill(context, slot, "#161616");
  const cap = kit.sprite("dj", 18 * u, along("dj", w), (c, cw, ch) => {
    c.beginPath();
    c.roundRect(0.5, 0.5, cw - 1, ch - 1, 2 * u);
    c.fillStyle = vertical(c, ch, [
      [0, "#6a6a6a"],
      [0.12, "#4a4a4a"],
      [0.88, "#262626"],
      [1, "#121212"],
    ]);
    c.fill();
    c.strokeStyle = "#000";
    c.lineWidth = 1;
    c.stroke();
    const ribs = u >= 0.75 ? [-3, -2, -1, 1, 2, 3] : [-2, 2];
    const spacing = (ch / 2 - 2 * u) / (ribs.length / 2 + 0.5);
    for (const step of ribs) {
      const y = ch / 2 + step * spacing;
      c.fillStyle = "#0b0b0b";
      c.fillRect(2 * u, y - 0.6 * u, cw - 4 * u, Math.max(0.8, 0.8 * u));
      c.fillStyle = "#5c5c5c";
      c.fillRect(2 * u, y + 0.2 * u, cw - 4 * u, Math.max(0.6, 0.5 * u));
    }
    c.fillStyle = "#f4f4f4";
    c.fillRect(1.5 * u, ch / 2 - Math.max(0.5, 0.75 * u), cw - 3 * u, Math.max(1, 1.5 * u));
  });
  for (const box of boxes) blit(context, kit, cap, box.cx, box.thumb);
};

// Windows 95/98 trackbar: a 4 px sunken channel (grey/black over light grey/white), black tick
// marks on the right, and a #C0C0C0 thumb with a 3D bevel pointing at the ticks.
const win95: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const white = new Path2D();
  const grey = new Path2D();
  const light = new Path2D();
  const black = new Path2D();
  const marks = new Path2D();
  const cw = channelWidth(u);
  for (const box of boxes) {
    const x = box.x + Math.round(7.5 * u) - cw / 2;
    const y0 = box.top;
    const h = box.bottom - box.top;
    white.rect(x, y0, cw, h);
    grey.rect(x, y0, cw - 1, h - 1);
    if (cw === 4) {
      light.rect(x + 1, y0 + 1, 2, h - 2);
      black.rect(x + 1, y0 + 1, 1, h - 3);
      black.rect(x + 1, y0 + 1, 2, 1);
    }
    ticks(marks, box, g, box.x + Math.round(18 * u), 2 * u);
  }
  fill(context, white, "#fff");
  fill(context, grey, "#808080");
  fill(context, light, "#dfdfdf");
  fill(context, black, "#000");
  fill(context, marks, "#000");
  const thumb = kit.sprite("win95", 16 * u, along("win95", w), (c, tw, th) => {
    const body = tw - th / 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(body, 0);
    c.lineTo(tw, th / 2);
    c.lineTo(body, th);
    c.lineTo(0, th);
    c.closePath();
    c.fillStyle = "#c0c0c0";
    c.fill();
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0.5, th - 1);
    c.lineTo(0.5, 0.5);
    c.lineTo(body, 0.5);
    c.lineTo(tw - 1, th / 2);
    c.strokeStyle = "#fff";
    c.stroke();
    c.beginPath();
    c.moveTo(tw - 1.5, th / 2);
    c.lineTo(body, th - 1.5);
    c.lineTo(1, th - 1.5);
    c.strokeStyle = "#808080";
    c.stroke();
    c.beginPath();
    c.moveTo(tw - 0.5, th / 2);
    c.lineTo(body, th - 0.5);
    c.lineTo(0, th - 0.5);
    c.strokeStyle = "#000";
    c.stroke();
  });
  for (const box of boxes) blit(context, kit, thumb, box.x + Math.round(2 * u) + thumb.w / 2, box.thumb);
};

// Mac OS 8/9 Platinum: a rounded dark-grey well with a black rim, and a light grey beveled
// rectangular thumb with three grip ridges.
const platinum: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const well = new Path2D();
  const width = even(5 * u);
  for (const box of boxes) rail(well, box.cx, box.top + 0.5, box.bottom - 0.5, width - 1);
  fill(context, well, "#8c8c8c");
  stroke(context, well, "#2a2a2a");
  const thumb = kit.sprite("platinum", 16 * u, along("platinum", w), (c, tw, th) => {
    c.beginPath();
    c.roundRect(0.5, 0.5, tw - 1, th - 1, 1.5 * u);
    c.fillStyle = vertical(c, th, [
      [0, "#f0f0f0"],
      [1, "#c4c4c4"],
    ]);
    c.fill();
    c.strokeStyle = "#202020";
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = "#fff";
    c.fillRect(1, 1, tw - 2, 1);
    c.fillRect(1, 1, 1, th - 2);
    c.fillStyle = "#8a8a8a";
    c.fillRect(1, th - 2, tw - 2, 1);
    c.fillRect(tw - 2, 1, 1, th - 2);
    const grips = th >= 9 ? [-1, 0, 1] : [0];
    for (const step of grips) {
      const y = Math.round(th / 2 + step * Math.max(2, Math.round(2.4 * u)));
      c.fillStyle = "#6e6e6e";
      c.fillRect(Math.round(4 * u), y - 1, tw - 2 * Math.round(4 * u), 1);
      c.fillStyle = "#fff";
      c.fillRect(Math.round(4 * u), y, tw - 2 * Math.round(4 * u), 1);
    }
  });
  for (const box of boxes) blit(context, kit, thumb, box.cx, box.thumb);
};

// Winamp 2 graphic equaliser band: a dark slot whose bar is lit green at the bottom through
// yellow to red at the top, under a small grey beveled knob.
const winamp: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const slot = new Path2D();
  const bars = new Map<number, { path: Path2D; y0: number; y1: number }>();
  const width = even(11 * u);
  const pad = Math.max(1, Math.round(2 * u));
  const bar = Math.max(2, width - 2 * pad);
  for (const box of boxes) {
    slot.rect(box.cx - width / 2, box.top, width, box.bottom - box.top);
    let row = bars.get(box.row);
    if (!row) bars.set(box.row, (row = { path: new Path2D(), y0: box.top, y1: box.bottom }));
    if (box.bottom - pad > box.thumb) row.path.rect(box.cx - bar / 2, box.thumb, bar, box.bottom - pad - box.thumb);
  }
  fill(context, slot, "#1a1a28");
  for (const [row, { path, y0, y1 }] of bars) {
    context.fillStyle = kit.gradient(`winamp:${row}:${y0}:${y1}`, () => {
      const value = context.createLinearGradient(0, y0, 0, y1);
      value.addColorStop(0, "#f0301c");
      value.addColorStop(0.45, "#e8d81c");
      value.addColorStop(1, "#22d43a");
      return value;
    });
    context.fill(path);
  }
  const knob = kit.sprite("winamp", Math.min(w, 13 * u + 1), along("winamp", w), (c, kw, kh) => {
    c.beginPath();
    c.roundRect(0.5, 0.5, kw - 1, kh - 1, u);
    c.fillStyle = vertical(c, kh, [
      [0, "#ececf4"],
      [1, "#9898a8"],
    ]);
    c.fill();
    c.strokeStyle = "#30303e";
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = "#56566a";
    c.fillRect(Math.round(2 * u), Math.floor(kh / 2), kw - 2 * Math.round(2 * u), 1);
  });
  for (const box of boxes) blit(context, kit, knob, box.cx, box.thumb);
};

// Mac OS X Aqua (10.0–10.4): a grey cylindrical channel and a blue gel knob with a white top
// gloss and a pale bottom glow.
const aqua: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const track = trackSprite(
    kit,
    "aqua-track",
    even(6 * u),
    [
      [0, "#8a8a8a"],
      [0.35, "#c6c6c6"],
      [0.8, "#eeeeee"],
      [1, "#fafafa"],
    ],
    "#6a6a6a",
  );
  for (const box of boxes) stretch(context, kit, track, track.w / 2, box.cx - track.w / 2, box.top, box.bottom);
  const knob = kit.sprite("aqua-knob", w, along("aqua", w), (c, kw, kh, ratio) => {
    const x = kw / 2;
    const y = kh / 2 - 0.4 * u;
    const r = 0.41 * w;
    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.35)";
    c.shadowBlur = 1.2 * u * ratio;
    c.shadowOffsetY = 0.6 * u * ratio;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    const base = c.createLinearGradient(0, y - r, 0, y + r);
    base.addColorStop(0, "#1748a6");
    base.addColorStop(0.5, "#3a7de4");
    base.addColorStop(1, "#a8dcff");
    c.fillStyle = base;
    c.fill();
    c.restore();
    c.strokeStyle = "#173a7a";
    c.lineWidth = Math.max(0.75, 0.7 * u);
    c.stroke();
    const glow = c.createRadialGradient(x, y + r * 0.6, 0, x, y + r * 0.6, r * 0.7);
    glow.addColorStop(0, "rgba(210, 245, 255, 0.75)");
    glow.addColorStop(1, "rgba(210, 245, 255, 0)");
    c.fillStyle = glow;
    c.fill();
    c.beginPath();
    c.ellipse(x, y - r * 0.45, r * 0.7, r * 0.42, 0, 0, Math.PI * 2);
    const gloss = c.createLinearGradient(0, y - r * 0.87, 0, y - r * 0.03);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    c.fillStyle = gloss;
    c.fill();
  });
  for (const box of boxes) blit(context, kit, knob, box.cx, box.thumb);
};

// Windows XP Luna trackbar: a thin pale channel with a grey rim, grey ticks, and a white-to-cream
// pointed thumb with a blue-grey outline and the green Luna edge on its pointer.
const xp: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const channel = new Path2D();
  const marks = new Path2D();
  const cw = channelWidth(u);
  for (const box of boxes) {
    const x = box.x + Math.round(7 * u) - cw / 2;
    channel.roundRect(x + 0.5, box.top + 0.5, cw - 1, box.bottom - box.top - 1, Math.min(1, (cw - 1) / 2));
    ticks(marks, box, g, box.x + Math.round(17 * u), 2 * u);
  }
  fill(context, channel, "#f4f3ee");
  stroke(context, channel, "#9d9c99");
  fill(context, marks, "#9d9c99");
  const thumb = kit.sprite("xp", 15 * u, along("xp", w), (c, tw, th) => {
    const body = tw - th / 2;
    c.beginPath();
    c.moveTo(1.5, 0.5);
    c.lineTo(body, 0.5);
    c.lineTo(tw - 0.5, th / 2);
    c.lineTo(body, th - 0.5);
    c.lineTo(1.5, th - 0.5);
    c.quadraticCurveTo(0.5, th - 0.5, 0.5, th - 1.5);
    c.lineTo(0.5, 1.5);
    c.quadraticCurveTo(0.5, 0.5, 1.5, 0.5);
    c.closePath();
    c.fillStyle = vertical(c, th, [
      [0, "#ffffff"],
      [1, "#e3e3dc"],
    ]);
    c.fill();
    c.strokeStyle = "#5a7299";
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    c.moveTo(body - 0.5, 1.6);
    c.lineTo(tw - 2, th / 2);
    c.lineTo(body - 0.5, th - 1.6);
    c.strokeStyle = "#43ad43";
    c.lineWidth = Math.max(1, 1.3 * u);
    c.stroke();
  });
  for (const box of boxes) blit(context, kit, thumb, box.x + Math.round(2 * u) + thumb.w / 2, box.thumb);
};

// Windows 7 Aero trackbar: a 4 px light channel with a grey rim and a rectangular thumb with the
// split glossy grey gradient and a white inner highlight.
const win7: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const channel = new Path2D();
  const cw = channelWidth(u);
  for (const box of boxes) channel.rect(box.cx - cw / 2 + 0.5, box.top + 0.5, cw - 1, box.bottom - box.top - 1);
  fill(context, channel, "#e7eaea");
  stroke(context, channel, "#acaeb0");
  const thumb = kit.sprite("win7", 17 * u, along("win7", w), (c, tw, th) => {
    c.beginPath();
    c.roundRect(0.5, 0.5, tw - 1, th - 1, 1.5 * u);
    c.fillStyle = vertical(c, th, [
      [0, "#f2f2f2"],
      [0.45, "#ebebeb"],
      [0.5, "#dddddd"],
      [1, "#cfcfcf"],
    ]);
    c.fill();
    c.strokeStyle = "#707070";
    c.lineWidth = 1;
    c.stroke();
    if (th < 6) return;
    c.beginPath();
    c.roundRect(1.5, 1.5, tw - 3, th - 3, u);
    c.strokeStyle = "rgba(255, 255, 255, 0.8)";
    c.stroke();
  });
  for (const box of boxes) blit(context, kit, thumb, box.cx, box.thumb);
};

// Android 4 Holo seek bar: a thin grey track, Holo blue #33B5E5 progress, and a blue dot inside a
// translucent blue halo.
const holo: Draw = (context, boxes, g) => {
  const { w } = g;
  const track = new Path2D();
  const progress = new Path2D();
  const halo = new Path2D();
  const dot = new Path2D();
  const width = even(0.15 * w);
  for (const box of boxes) {
    track.rect(box.cx - width / 2, box.top, width, box.thumb - box.top);
    progress.rect(box.cx - width / 2, box.thumb, width, box.bottom - box.thumb);
    circle(halo, box.cx, box.thumb, reach.holo * w);
    circle(dot, box.cx, box.thumb, 0.16 * w);
  }
  fill(context, track, "#c4c4c4");
  fill(context, progress, "#33b5e5");
  fill(context, halo, "rgba(51, 181, 229, 0.3)");
  fill(context, dot, "#33b5e5");
};

// iOS 6 UISlider: a rounded inset white maximum track, a glossy blue gradient minimum track, and
// a silver knob with a soft drop shadow.
const ios6: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const width = even(8 * u);
  const track = trackSprite(
    kit,
    "ios6-max",
    width,
    [
      [0, "#bcbcbc"],
      [0.3, "#e8e8e8"],
      [1, "#ffffff"],
    ],
    "#8e8e8e",
  );
  const filled = trackSprite(
    kit,
    "ios6-min",
    width,
    [
      [0, "#1e4ea2"],
      [0.35, "#3a7ae0"],
      [1, "#7cb4f8"],
    ],
    "#25509a",
  );
  const knob = kit.sprite("ios6-knob", 1.1 * w, along("ios6", w), (c, kw, kh, ratio) => {
    const x = kw / 2;
    const y = kh / 2 - 0.5 * u;
    const r = 0.45 * w;
    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.45)";
    c.shadowBlur = 1.6 * u * ratio;
    c.shadowOffsetY = 0.8 * u * ratio;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = vertical(c, kh, [
      [0.1, "#fdfdfd"],
      [0.5, "#dadada"],
      [0.9, "#b2b2b2"],
    ]);
    c.fill();
    c.restore();
    c.strokeStyle = "rgba(0, 0, 0, 0.3)";
    c.lineWidth = Math.max(0.5, 0.5 * u);
    c.stroke();
    c.beginPath();
    c.arc(x, y, r - 1, Math.PI * 1.1, Math.PI * 1.9);
    c.strokeStyle = "rgba(255, 255, 255, 0.9)";
    c.stroke();
  });
  for (const box of boxes) {
    stretch(context, kit, track, width / 2, box.cx - width / 2, box.top, box.bottom);
    stretch(context, kit, filled, width / 2, box.cx - width / 2, Math.max(box.top, box.thumb - width / 2), box.bottom);
  }
  for (const box of boxes) blit(context, kit, knob, box.cx, box.thumb);
};

// iOS 7+ UISlider: a 2 pt grey maximum track, #007AFF minimum track, and a plain white knob
// lifted by a soft shadow and a hairline.
const ios7: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const track = new Path2D();
  const filled = new Path2D();
  const width = even(0.1 * w);
  for (const box of boxes) {
    rail(track, box.cx, box.top, box.thumb, width);
    rail(filled, box.cx, box.thumb, box.bottom, width);
  }
  fill(context, track, "#b7b7b7");
  fill(context, filled, "#007aff");
  const knob = kit.sprite("ios7", w, along("ios7", w), (c, kw, kh, ratio) => {
    const x = kw / 2;
    const y = kh / 2 - 0.5 * u;
    const r = 0.42 * w;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.18)";
    c.shadowBlur = 1.8 * u * ratio;
    c.shadowOffsetY = 1 * u * ratio;
    c.fillStyle = "#fff";
    c.fill();
    c.restore();
    c.strokeStyle = "rgba(0, 0, 0, 0.06)";
    c.lineWidth = 0.5;
    c.stroke();
  });
  for (const box of boxes) blit(context, kit, knob, box.cx, box.thumb);
};

// iOS Control Center slider: a full-height pill of light material that fills white from the
// bottom, no knob.
const control: Draw = (context, boxes, g) => {
  const { w } = g;
  const pill = new Path2D();
  const level = new Path2D();
  for (const box of boxes) {
    const h = box.bottom - box.top;
    pill.roundRect(box.x + 0.5, box.top + 0.5, w - 1, h - 1, (w - 1) / 2);
    const y = Math.round(box.bottom - box.value * h);
    if (y < box.bottom) level.rect(box.x, y, w, box.bottom - y);
  }
  fill(context, pill, "#d4d4d9");
  context.save();
  context.clip(pill);
  fill(context, level, "#fff");
  context.restore();
  stroke(context, pill, "rgba(0, 0, 0, 0.12)");
};

// Material Design 2 slider (MDC): a thin track at 24% primary, a #6200EE active track, and a
// solid primary circle thumb.
const material2: Draw = (context, boxes, g) => {
  const { w } = g;
  const track = new Path2D();
  const active = new Path2D();
  const thumbs = new Path2D();
  const width = even(0.15 * w);
  for (const box of boxes) {
    track.rect(box.cx - width / 2, box.top, width, box.thumb - box.top);
    active.rect(box.cx - width / 2, box.thumb, width, box.bottom - box.thumb);
    circle(thumbs, box.cx, box.thumb, reach.material2 * w);
  }
  fill(context, track, "#d9c2fb");
  fill(context, active, "#6200ee");
  fill(context, thumbs, "#6200ee");
};

// Chrome's default <input type=range> (Chrome 83+ form controls): a #EFEFEF track with a #B2B2B2
// rim, #0075FF fill, and a solid #0075FF circle thumb.
const chrome: Draw = (context, boxes, g) => {
  const { w } = g;
  const track = new Path2D();
  const filled = new Path2D();
  const thumbs = new Path2D();
  const width = Math.max(4, even(0.2 * w));
  for (const box of boxes) {
    rail(track, box.cx, box.top + 0.5, box.bottom - 0.5, width - 1);
    rail(filled, box.cx, box.thumb, box.bottom, width);
    circle(thumbs, box.cx, box.thumb, reach.chrome * w);
  }
  fill(context, track, "#efefef");
  stroke(context, track, "#b2b2b2");
  fill(context, filled, "#0075ff");
  fill(context, thumbs, "#0075ff");
};

// Windows 11 Fluent slider: a 4 px grey rail, accent #005FB8 fill, and a white round thumb with a
// faint rim and an accent inner dot.
const win11: Draw = (context, boxes, g, kit) => {
  const { u, w } = g;
  const rails = new Path2D();
  const filled = new Path2D();
  const width = even(0.2 * w);
  for (const box of boxes) {
    rail(rails, box.cx, box.top, box.bottom, width);
    rail(filled, box.cx, box.thumb, box.bottom, width);
  }
  fill(context, rails, "#8d8d8d");
  fill(context, filled, "#005fb8");
  const size = along("win11", w);
  const thumb = kit.sprite("win11", size, size, (c, sw, sh, ratio) => {
    const x = sw / 2;
    const y = sh / 2;
    const r = 0.45 * w;
    c.beginPath();
    c.arc(x, y, r - 0.5, 0, Math.PI * 2);
    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.16)";
    c.shadowBlur = u * ratio;
    c.shadowOffsetY = 0.5 * u * ratio;
    c.fillStyle = "#fff";
    c.fill();
    c.restore();
    c.strokeStyle = "rgba(0, 0, 0, 0.1)";
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    c.arc(x, y, 0.26 * w, 0, Math.PI * 2);
    c.fillStyle = "#005fb8";
    c.fill();
  });
  for (const box of boxes) blit(context, kit, thumb, box.cx, box.thumb);
};

// Material 3 slider (2024): a thick rounded track split by gaps around a full-width bar handle,
// #6750A4 active below, #E8DEF8 inactive above, and a stop dot at the inactive end.
const material3: Draw = (context, boxes, g) => {
  const { w } = g;
  const inactive = new Path2D();
  const accent = new Path2D();
  const width = Math.max(4, even(0.4 * w));
  const thick = even(0.2 * w);
  const gap = Math.max(2, Math.round(0.15 * w));
  const outer = width / 2;
  const inner = Math.max(1, width * 0.2);
  const dot = Math.max(1, width * 0.2);
  for (const box of boxes) {
    const upper = box.thumb - thick / 2 - gap;
    const lower = box.thumb + thick / 2 + gap;
    if (upper - box.top > 0.5) inactive.roundRect(box.cx - width / 2, box.top, width, upper - box.top, [outer, outer, inner, inner]);
    if (box.bottom - lower > 0.5) accent.roundRect(box.cx - width / 2, lower, width, box.bottom - lower, [inner, inner, outer, outer]);
    if (upper > box.top + width) circle(accent, box.cx, box.top + width / 2, dot);
    accent.roundRect(box.cx - w / 2, box.thumb - thick / 2, w, thick, thick / 2);
  }
  fill(context, inactive, "#e8def8");
  fill(context, accent, "#6750a4");
};

export const looks: readonly { id: LookId; draw: Draw }[] = [
  { id: "dj", draw: dj },
  { id: "win95", draw: win95 },
  { id: "platinum", draw: platinum },
  { id: "winamp", draw: winamp },
  { id: "aqua", draw: aqua },
  { id: "xp", draw: xp },
  { id: "win7", draw: win7 },
  { id: "holo", draw: holo },
  { id: "ios6", draw: ios6 },
  { id: "ios7", draw: ios7 },
  { id: "control", draw: control },
  { id: "material2", draw: material2 },
  { id: "chrome", draw: chrome },
  { id: "win11", draw: win11 },
  { id: "material3", draw: material3 },
];
