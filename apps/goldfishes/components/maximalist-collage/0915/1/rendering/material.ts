import type { FragmentKind } from "../model/score";

export const topics = ["ARTIFICIAL INTELLIGENCE", "THE NEXT BIG THING", "HUMAN CONNECTION", "INFINITE GROWTH", "YOUR NEW REALITY", "PERSONAL BRAND", "AUTOMATE EVERYTHING", "ONE MORE UPDATE"] as const;
export const atlasUrl = "/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png";
// Public-domain photograph; full credit is in the experiment document.
export const portraitUrl = "/images/0908/tech-power-faces/003.jpg";

type Ctx = CanvasRenderingContext2D;
export type MaterialImages = { atlas: HTMLImageElement | null; portrait: HTMLImageElement | null };
const blue = "#0a66c2";
const ink = "#151515";

function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function text(c: Ctx, value: string, x: number, y: number, size = 18, color = ink, weight = 400, family = "Arial, sans-serif") {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${family}`;
  c.fillText(value, x, y);
}
function round(c: Ctx, x: number, y: number, w: number, h: number, radius: number, color: string) {
  c.fillStyle = color;
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill();
}
function circle(c: Ctx, x: number, y: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
function wrap(c: Ctx, value: string, x: number, y: number, width: number, size = 18, color = ink, weight = 400, maxLines = 4) {
  c.font = `${weight} ${size}px Arial, sans-serif`;
  let line = ""; let row = 0;
  for (const word of value.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (c.measureText(candidate).width > width && line) {
      text(c, line, x, y + row * size * 1.22, size, color, weight);
      line = word; row++;
      if (row >= maxLines) return;
    } else line = candidate;
  }
  if (row < maxLines) text(c, line, x, y + row * size * 1.22, size, color, weight);
}
function imageTile(c: Ctx, images: MaterialImages, index: number, x: number, y: number, w: number, h: number) {
  const image = images.atlas;
  rect(c, x, y, w, h, "#1b2228");
  if (!image) { text(c, "IMAGE UNAVAILABLE", x + 12, y + h / 2, 13, "#d8d8d8"); return; }
  const tile = ((index % 36) + 36) % 36;
  const sw = image.naturalWidth / 6, sh = image.naturalHeight / 6;
  const ratio = Math.max(w / sw, h / sh);
  const cropW = w / ratio, cropH = h / ratio;
  c.drawImage(image, tile % 6 * sw + (sw - cropW) / 2, Math.floor(tile / 6) * sh + (sh - cropH) / 2, cropW, cropH, x, y, w, h);
}
function face(c: Ctx, images: MaterialImages, x: number, y: number, size: number) {
  c.save(); c.beginPath(); c.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); c.clip();
  if (images.portrait) {
    const image = images.portrait;
    const s = Math.min(image.naturalWidth, image.naturalHeight);
    c.drawImage(image, (image.naturalWidth - s) / 2, 0, s, s, x, y, size, size);
  } else circle(c, x + size / 2, y + size / 2, size / 2, blue);
  c.restore();
}
function youtube(c: Ctx, topic: string, source: number, images: MaterialImages) {
  rect(c, 0, 0, 600, 480, "#fff");
  text(c, "☰", 15, 34, 25);
  round(c, 56, 14, 40, 28, 8, "#ff0033"); text(c, "▶", 68, 34, 17, "white");
  text(c, "YouTube", 101, 36, 28, ink, 700);
  round(c, 261, 12, 300, 34, 17, "#f1f1f1"); text(c, "Search", 280, 35, 17, "#777");
  rect(c, 0, 58, 600, 1, "#ddd");
  ["All", "For you", "Recently uploaded", "Watched"].forEach((s, i) => {
    round(c, 15 + i * 145, 71, 135, 28, 6, i === 0 ? ink : "#eee");
    text(c, s, 25 + i * 145, 91, 14, i === 0 ? "white" : ink);
  });
  imageTile(c, images, source, 14, 115, 572, 280);
  rect(c, 23, 139, 345, 103, source % 2 ? "#ffef00" : "#fff");
  wrap(c, topic, 33, 182, 323, 44, "#111", 900, 2);
  round(c, 518, 359, 55, 25, 3, "#111"); text(c, "12:48", 523, 378, 16, "#fff");
  face(c, images, 16, 411, 38);
  wrap(c, `This changes EVERYTHING. ${topic}`, 66, 427, 510, 21, ink, 700, 1);
  text(c, `Future Daily · ${source + 2}.8M views · 2 hours ago`, 66, 456, 15, "#666");
}
function linkedin(c: Ctx, topic: string, source: number, images: MaterialImages) {
  rect(c, 0, 0, 600, 560, "#fff");
  rect(c, 0, 0, 600, 55, "#f3f2ef");
  round(c, 13, 10, 36, 36, 3, blue); text(c, "in", 17, 39, 30, "#fff", 700);
  round(c, 61, 12, 205, 32, 3, "#e0e9ef"); text(c, "Search", 74, 35, 16, "#555");
  text(c, "Home     My Network     Jobs", 304, 35, 16, "#555");
  text(c, "Suggested for you", 18, 86, 14, "#666"); text(c, "•••", 550, 85, 20);
  circle(c, 44, 130, 24, blue); text(c, "f", 37, 140, 31, "white", 700);
  text(c, "Future of Work", 80, 124, 21, ink, 700); text(c, "+ Follow", 480, 124, 18, blue, 700);
  text(c, "Ideas worth sharing · Promoted", 80, 148, 14, "#666");
  wrap(c, `I'm thrilled to announce the next chapter. ${topic} is more than a technology. It's a mindset.`, 20, 187, 557, 22, ink, 400, 3);
  text(c, "Agree?  #innovation  #growth  #future", 20, 271, 17, blue);
  imageTile(c, images, source + 9, 0, 288, 600, 179);
  text(c, `${(source + 1) * 317} reactions`, 22, 493, 15, "#666"); text(c, "128 comments · 42 reposts", 363, 493, 14, "#666");
  rect(c, 18, 506, 564, 1, "#ddd"); text(c, "Like          Comment          Repost          Send", 27, 541, 19, "#666", 700);
}
function instagram(c: Ctx, topic: string, source: number, images: MaterialImages) {
  rect(c, 0, 0, 430, 610, "#fff");
  text(c, "Instagram", 16, 43, 34, ink, 700, "Georgia, serif"); text(c, "♡     ⌁", 322, 40, 31);
  for (let i = 0; i < 5; i++) {
    circle(c, 46 + i * 83, 98, 30, i % 2 ? "#fa3d88" : "#ff6731");
    circle(c, 46 + i * 83, 98, 26, "#fff");
    face(c, images, 23 + i * 83, 75, 46);
    text(c, ["you", "future", "for.you", "daily.ai", "another.you"][i], 19 + i * 83, 144, 12);
  }
  text(c, "for.you.daily", 17, 181, 18, ink, 700); text(c, "•••", 380, 181, 17);
  imageTile(c, images, source + 18, 0, 195, 430, 290);
  rect(c, 18, 313, 394, 68, "#fff000");
  text(c, "YOUR FUTURE IS HERE", 27, 357, 29, ink, 900);
  text(c, "♡  ◯  ⌁", 17, 523, 31); text(c, "⌑", 390, 521, 29);
  text(c, `${(source + 2) * 1403} likes`, 18, 552, 17, ink, 700);
  wrap(c, `for.you.daily  ${topic.toLowerCase()}. Made for you.`, 18, 581, 396, 17, ink, 400, 2);
}
function search(c: Ctx, topic: string, source: number, images: MaterialImages) {
  rect(c, 0, 0, 720, 490, "#fff");
  const colors = ["#4285f4", "#ea4335", "#fbbc05", "#4285f4", "#34a853", "#ea4335"];
  Array.from("Google").forEach((s, i) => text(c, s, 15 + i * 20, 44, 33, colors[i], 600));
  round(c, 164, 13, 527, 41, 22, "#edf2fa"); text(c, topic.toLowerCase(), 187, 40, 19);
  text(c, "All     Images     Videos     News     Shopping     More", 164, 86, 17, "#555");
  rect(c, 205, 98, 64, 3, "#4285f4");
  for (let i = 0; i < 9; i++) {
    const x = 12 + (i % 3) * 238, y = 120 + Math.floor(i / 3) * 125;
    imageTile(c, images, source + i * 3, x, y, 225, 95);
    text(c, ["The future, explained", "Everything you need to know", "A new era begins"][i % 3], x, y + 115, 13);
  }
}
function notification(c: Ctx, topic: string, source: number) {
  round(c, 0, 0, 620, 112, 20, "#f1f1f3");
  round(c, 19, 21, 60, 60, 13, source % 2 ? blue : "#ed226e");
  text(c, source % 2 ? "in" : "♡", 29, 65, 39, "white", 700);
  text(c, source % 2 ? "LinkedIn" : "Instagram", 96, 33, 18, ink, 700);
  text(c, "now", 565, 33, 14, "#737373");
  text(c, ["You're getting noticed", "You have 99+ new notifications", "People are talking about you"][source % 3], 96, 60, 22, ink, 700);
  text(c, `${topic.toLowerCase()} · see what you missed`, 96, 86, 16, "#555");
}
function chat(c: Ctx, topic: string, source: number) {
  rect(c, 0, 0, 570, 470, "#fff");
  text(c, "ChatGPT  ⌄", 19, 39, 24, ink, 600); text(c, "•••", 517, 38, 21);
  round(c, 100, 76, 445, 75, 22, "#eee");
  wrap(c, `Make ${topic.toLowerCase()} sound more human.`, 120, 104, 402, 18, ink, 400, 2);
  text(c, "Absolutely. Here's a more human version:", 22, 194, 21);
  wrap(c, ["The future isn't coming. It's already here. A world where every connection becomes a possibility, every idea becomes an opportunity, and every moment is made for you.", "In today's rapidly evolving digital landscape, staying ahead means embracing change. Unlock your potential. Transform the way you work. Make every moment count.", "Imagine a world without limits. More productive. More connected. More you. This is your moment to create something extraordinary."][source % 3], 22, 233, 525, 24, ink, 400, 6);
  text(c, "↻     ♧     ♡     ♧", 23, 410, 21, "#666");
  round(c, 14, 429, 542, 37, 18, "#f0f0f0"); text(c, "Ask anything", 33, 454, 16, "#777");
}

/** Locally authored platform fragments, not live feeds or screenshot replicas. */
export function makeMaterial(kind: FragmentKind, topicIndex: number, source: number, images: MaterialImages) {
  const sizes: Record<FragmentKind, readonly [number, number]> = {
    youtube: [600, 480], linkedin: [600, 560], instagram: [430, 610], search: [720, 490],
    notification: [620, 112], chat: [570, 470], headline: [1050, 180], ticker: [1200, 55], eye: [640, 200],
  };
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = sizes[kind];
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2D is unavailable.");
  const topic = topics[((topicIndex % topics.length) + topics.length) % topics.length];
  if (kind === "youtube") youtube(c, topic, source, images);
  if (kind === "linkedin") linkedin(c, topic, source, images);
  if (kind === "instagram") instagram(c, topic, source, images);
  if (kind === "search") search(c, topic, source, images);
  if (kind === "notification") notification(c, topic, source);
  if (kind === "chat") chat(c, topic, source);
  if (kind === "headline") {
    text(c, ["FOR YOU", "RECOMMENDED", "YOU MAY ALSO LIKE", "PROMOTED", "KEEP WATCHING", "TRENDING NOW", "GENERATING…", "ONE MORE TIME"][topicIndex % 8], -9, 143, 143, ["#ff3b00", blue, "#fa0085", "#171717"][source % 4], 900, "Arial Black, Arial, sans-serif");
  }
  if (kind === "ticker") {
    rect(c, 0, 0, 1200, 55, source % 2 ? "#ff4b00" : "#dfff00");
    text(c, `${topic} ↗ +128.4%   •   ${topic} ↗ +128.4%   •   ${topic}`, 0, 39, 32, "#111", 900);
  }
  if (kind === "eye") {
    if (images.portrait) {
      const image = images.portrait;
      c.drawImage(image, 0, image.naturalHeight * .18, image.naturalWidth, image.naturalHeight * .32, 0, 0, 640, 200);
    } else { rect(c, 0, 0, 640, 200, "#ccc"); text(c, "IMAGE UNAVAILABLE", 24, 112, 30); }
  }
  return canvas;
}
