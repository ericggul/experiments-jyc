import { cellUrl, palette, roundedInset, type Look } from "./cell-image";
import { wordFor, type CommandGroup } from "./semantic";
import { splitTokens, textRole } from "./tokens";

/**
 * Reads the clone into cells and writes each cell into the CSS background of the element that already occupies that place.
 * Nothing is drawn over the page: a cell moves, scrolls, clips and rounds exactly as its element does, because it is that
 * element's own background. Text has no element of its own, so a text part is a background layer of the block that holds it,
 * positioned at the part's line boxes relative to that block (which do not change when anything scrolls).
 */

export const UI = "data-substitution-pixel-ui";
export const CELL = "data-substitution-pixel-cell";
/** Lifts the hiding from one element for the moment its original fill and borders are read. */
export const RAW = "data-substitution-pixel-raw";

const interactive = "button, a, input, textarea, select, summary, label, [role='button'], [role='link'], [role='tab'], [role='checkbox'], [role='switch'], [role='menuitem'], [role='option']";
const skipped = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "LINK", "META"]);
const graphic = new Set(["svg", "IMG", "VIDEO", "CANVAS", "IFRAME", "INPUT", "TEXTAREA", "SELECT"]);

type Layer = { url: string; x: number; y: number; w: number; h: number } | { url: string; whole: true };
/** `borders` lists the sides the original draws a border on; they are drawn black where they are, so a divider stays one line. */
export type Paint = { fill: boolean; frame: boolean; borders: string[]; layers: Layer[]; local: boolean };

/** What the hiding sheet overrides and a cell depends on: the original fill, background image, borders and shadow. */
export type Facts = { alpha: number; image: "none" | "photo" | "gradient"; borders: string[]; shadow: boolean };

type TextEntry = { node: Text; control: Element | null; heading: boolean };
type Context = { faded: boolean; carrier: Element | null; control: Element | null; heading: boolean };

const alphaOf = (color: string) => {
  if (color === "transparent") return 0;
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 1;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? parseFloat(parts[3]) * (parts[3].endsWith("%") ? 0.01 : 1) : 1;
};

function readFacts(style: CSSStyleDeclaration): Facts {
  const image = style.backgroundImage;
  return {
    alpha: alphaOf(style.backgroundColor),
    // A photograph given as a CSS background (a thumbnail div) is a part; a gradient or an SVG drawing is only a fill.
    image: image === "none" ? "none" : /url\(/.test(image) && !/\.svg|image\/svg/.test(image) ? "photo" : "gradient",
    borders: (["top", "right", "bottom", "left"] as const).filter((side) =>
      parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      style.getPropertyValue(`border-${side}-style`) !== "none" &&
      alphaOf(style.getPropertyValue(`border-${side}-color`)) > 0.1),
    shadow: style.boxShadow !== "none",
  };
}

/** Corner radius in px of a box, from its computed top-left radius (px or %). The hiding never changes radii. */
const radiusOf = (style: CSSStyleDeclaration, width: number) => {
  const value = style.borderTopLeftRadius.split(" ")[0];
  return value.endsWith("%") ? (parseFloat(value) / 100) * width : parseFloat(value) || 0;
};

/** The size of an element's border box in its own CSS pixels (unscaled by transforms on it or its ancestors). */
const boxSize = (element: Element) => element instanceof HTMLElement
  ? { width: element.offsetWidth, height: element.offsetHeight }
  : { width: element.clientWidth || element.getBoundingClientRect().width, height: element.clientHeight || element.getBoundingClientRect().height };

/** Whether a box lies within a screen of the viewport (half a screen sideways): only there are cells written. */
function nearRect(rect: DOMRect) {
  const marginY = window.innerHeight;
  const marginX = window.innerWidth * 0.5;
  return rect.bottom > -marginY && rect.top < window.innerHeight + marginY && rect.right > -marginX && rect.left < window.innerWidth + marginX;
}

/**
 * A subtree to skip: a box no taller than three screens (a post, a row) lying wholly away from the screen.
 * Its contents are read once it comes near. Taller boxes (the feed itself) are entered, since what they hold is spread out.
 */
function remote(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.height <= window.innerHeight * 3 && rect.width > 0 && !nearRect(rect);
}

/**
 * Original facts for every box element that has none cached, or sits in a subtree that changed since it was read.
 * Those elements alone are un-hidden while they are read, so the style pass touches only them.
 */
export function refreshFacts(root: Element, cache: WeakMap<Element, Facts>, changed: Set<Element>) {
  const stale: Element[] = [];
  const walk = (element: Element, dirty: boolean) => {
    if (skipped.has(element.tagName) || element.hasAttribute(UI)) return;
    dirty ||= changed.has(element);
    if (graphic.has(element.tagName) || remote(element)) return;
    if (dirty || !cache.has(element)) stale.push(element);
    for (const child of Array.from(element.children)) walk(child, dirty);
  };
  walk(root, false);
  changed.clear();
  if (!stale.length) return;
  for (const element of stale) element.setAttribute(RAW, "");
  for (const element of stale) cache.set(element, readFacts(window.getComputedStyle(element)));
  for (const element of stale) element.removeAttribute(RAW);
}

export function collect(root: Element, clone: string, group: CommandGroup, cache: WeakMap<Element, Facts>, look: Look) {
  const stroke = palette(look).stroke;
  const viewportArea = window.innerWidth * window.innerHeight;
  // Only what is on screen or within a screen of it is written; scrolling writes the rest before it arrives.
  const near = (element: Element) => nearRect(element.getBoundingClientRect());
  const paints = new Map<Element, Paint>();
  const texts = new Map<Element, TextEntry[]>();
  const styleOf = (element: Element) => window.getComputedStyle(element);
  const paintOf = (element: Element) => {
    let paint = paints.get(element);
    if (!paint) paints.set(element, (paint = { fill: false, frame: false, borders: [], layers: [], local: false }));
    return paint;
  };

  /** An element cell: the word fills the box, kept clear of rounded corners (its own, or a same-sized clipping parent's). */
  const elementCell = (element: Element, style: CSSStyleDeclaration, word: string) => {
    const { width, height } = boxSize(element);
    if (width < 1 || height < 1 || !near(element)) return;
    let radius = radiusOf(style, width);
    const parent = element.parentElement;
    if (parent) {
      const parentStyle = styleOf(parent);
      const parentBox = boxSize(parent);
      if (parentStyle.overflow !== "visible" && Math.abs(parentBox.width - width) < 2 && Math.abs(parentBox.height - height) < 2) {
        radius = Math.max(radius, radiusOf(parentStyle, parentBox.width));
      }
    }
    const inset = roundedInset(radius, width, height);
    const paint = paintOf(element);
    paint.fill = true;
    paint.frame = true;
    // Letters stay clear of the CSS frame drawn inside the box.
    const clear = Math.max(2, stroke + 1, inset);
    paint.layers.push({ url: cellUrl({ width, height, word, framed: false, insetX: clear, insetY: clear, look }), whole: true });
  };

  const visit = (element: Element, context: Context): number => {
    if (skipped.has(element.tagName) || element.hasAttribute(UI) || remote(element)) return 0;
    const style = styleOf(element);
    // Overlays a browser extension lays over every page sit at the top of the z range; they are not the interface.
    if (style.display === "none" || parseInt(style.zIndex, 10) >= 2147483000) return 0;
    const faded = context.faded || parseFloat(style.opacity) === 0;
    const shown = !faded && style.visibility === "visible";
    const tag = element.tagName;
    const control = element.matches(interactive) ? element : context.control;

    if (tag === "svg" || tag === "IMG" || tag === "VIDEO") {
      if (!shown) return 0;
      const { width, height } = boxSize(element);
      if (width < 1 || height < 1) return 0;
      if (tag === "svg") {
        elementCell(element, style, wordFor("icon", control, clone, group));
      } else {
        // A small square picture rounded into a circle, by itself or by the box clipping it, is someone's face.
        const parent = element.parentElement;
        const round = width <= 120 && Math.abs(width - height) < 2 && (radiusOf(style, width) >= width * 0.4 ||
          Boolean(parent && radiusOf(styleOf(parent), boxSize(parent).width) >= width * 0.4));
        elementCell(element, style, wordFor(tag === "IMG" && round ? "avatar" : "media", control, clone, group));
      }
      return 1;
    }
    if (tag === "CANVAS" || tag === "IFRAME") return 0;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (!shown || ["hidden", "checkbox", "radio", "range"].includes((element as HTMLInputElement).type)) return 0;
      elementCell(element, style, wordFor("field", control, clone, group));
      return 1;
    }

    const inline = style.display === "inline" || style.display === "contents";
    const carrier = inline ? context.carrier : element;
    const heading = context.heading || /^H[1-6]$/.test(tag) || element.getAttribute("role") === "heading";
    const next: Context = { faded, carrier, control, heading };

    let atoms = 0;
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!shown || !carrier || !child.textContent?.trim()) continue;
        let list = texts.get(carrier);
        if (!list) texts.set(carrier, (list = []));
        list.push({ node: child as Text, control, heading });
        atoms++;
      } else if (child instanceof Element) atoms += visit(child, next);
    }

    const facts = cache.get(element);
    if (!shown || inline || !facts) return atoms;
    // The element's own box: a photograph background is a part itself; an opaque fill hides what passes under it, as in the
    // original; borders stay where they are; a shadowed or small translucent box is outlined.
    if (facts.image === "photo") {
      elementCell(element, style, wordFor("media", control, clone, group));
      return atoms + 1;
    }
    const edged = facts.borders.length > 0 || facts.shadow;
    // Light-mode chips are a 5 % tint of black; anything fainter is not a visible box.
    if (facts.alpha < 0.03 && facts.image === "none" && !edged) return atoms;
    const { width, height } = boxSize(element);
    const area = width * height;
    if (area < 1) return atoms;
    const ground = area >= viewportArea * 0.6;
    if (!ground && !near(element)) return atoms;
    const opaque = facts.alpha >= 0.6;
    if (!opaque && !edged && area > viewportArea * 0.25) return atoms; // a scrim over media, not a box
    const paint = paintOf(element);
    paint.fill ||= opaque || (!ground && facts.alpha >= 0.03);
    if (facts.borders.length) paint.borders = facts.borders;
    else paint.frame ||= !ground;
    // An empty box (a progress bar, a placeholder, a badge without text) is a part of its own.
    if (atoms === 0 && !ground && height >= 10 && width >= 16) {
      paint.fill = true;
      elementCell(element, style, wordFor("icon", control, clone, group));
    }
    return atoms;
  };

  visit(root, { faded: false, carrier: null, control: null, heading: false });

  // Text parts: adjacent text nodes are one run (React splits `@{handle} · {time}` into several nodes); a run is split by job.
  const range = document.createRange();
  for (const [carrier, entries] of texts) {
    const size = boxSize(carrier);
    if (!size.width || !size.height || !near(carrier)) continue;
    const box = carrier.getBoundingClientRect();
    const scaleX = box.width / size.width || 1;
    const scaleY = box.height / size.height || 1;
    const carrierStyle = styleOf(carrier);
    const scrolls = /(auto|scroll|hidden)/.test(carrierStyle.overflowX + carrierStyle.overflowY) &&
      (carrier.scrollHeight > carrier.clientHeight || carrier.scrollWidth > carrier.clientWidth);
    const paint = paintOf(carrier);
    if (scrolls) paint.local = true;
    const offsetX = scrolls ? carrier.scrollLeft - carrier.clientLeft : 0;
    const offsetY = scrolls ? carrier.scrollTop - carrier.clientTop : 0;

    let index = 0;
    while (index < entries.length) {
      const run = [entries[index]];
      while (index + run.length < entries.length) {
        const candidate = entries[index + run.length];
        let between = run[run.length - 1].node.nextSibling;
        while (between && between.nodeType === Node.COMMENT_NODE) between = between.nextSibling;
        if (between !== candidate.node) break;
        run.push(candidate);
      }
      index += run.length;

      const full = run.map((entry) => entry.node.data).join("");
      const locate = (offset: number) => {
        for (const entry of run) {
          if (offset <= entry.node.data.length) return { node: entry.node, offset };
          offset -= entry.node.data.length;
        }
        const last = run[run.length - 1].node;
        return { node: last, offset: last.data.length };
      };
      const bold = parseInt(styleOf(run[0].node.parentElement!).fontWeight, 10) >= 600;
      const { control, heading } = run[0];

      for (const token of splitTokens(full)) {
        const start = locate(token.start);
        const end = locate(token.end);
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        const word = wordFor(textRole(token.text, { bold, heading, interactive: Boolean(control) }), control, clone, group);
        // One cell per line the part occupies: glyph boxes on the same line are joined.
        const lines: { left: number; top: number; right: number; bottom: number }[] = [];
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width < 0.5 || rect.height < 0.5) continue;
          const line = lines.find((other) => Math.min(other.bottom, rect.bottom) - Math.max(other.top, rect.top) > Math.min(other.bottom - other.top, rect.height) * 0.5);
          if (line) {
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
            line.top = Math.min(line.top, rect.top);
            line.bottom = Math.max(line.bottom, rect.bottom);
          } else lines.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
        }
        for (const line of lines) {
          let x = (line.left - box.left) / scaleX + offsetX;
          let y = (line.top - box.top) / scaleY + offsetY;
          let w = (line.right - line.left) / scaleX;
          let h = (line.bottom - line.top) / scaleY;
          // A line box taller than a tight control (a count in a 20 px button) would lose its frame at the box edge, where the
          // background ends; the cell is kept inside the box instead.
          if (!scrolls) {
            const right = Math.min(x + w, size.width);
            const bottom = Math.min(y + h, size.height);
            x = Math.max(0, x);
            y = Math.max(0, y);
            w = right - x;
            h = bottom - y;
            if (w < 1 || h < 1) continue;
          }
          const inset = stroke + (h >= 12 ? 0.5 : 0) || 0.5;
          paint.layers.unshift({ url: cellUrl({ width: w, height: h, word, framed: true, insetX: inset + 0.5, insetY: inset, look }), x, y, w, h });
        }
      }
    }
  }
  range.detach();
  return paints;
}

const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const sides = ["top", "right", "bottom", "left"] as const;

/**
 * The cell as values of the element's own (non-inherited) custom properties, which the stylesheet turns into its background,
 * shadow and border colours. Setting them restyles that element only.
 */
export function cellProperties(paint: Paint, look: Look): Record<string, string> {
  const { paper, frame, stroke } = palette(look);
  // A frame is an inset shadow at the chosen weight. Original border sides keep their own width in the frame colour, and are
  // thickened beyond it by an inset shadow on that side alone, so no box changes size.
  const shadows: string[] = [];
  if (paint.frame && stroke) shadows.push(`inset 0 0 0 ${px(stroke)} ${frame}`);
  if (stroke > 1) {
    const extra = px(stroke - 1);
    const inward = { top: `inset 0 ${extra} 0 0`, bottom: `inset 0 -${extra} 0 0`, left: `inset ${extra} 0 0 0`, right: `inset -${extra} 0 0 0` };
    for (const side of paint.borders) shadows.push(`${inward[side as keyof typeof inward]} ${frame}`);
  }
  const properties: Record<string, string> = {
    "--substitution-pixel-fill": paint.fill ? paper : "transparent",
    "--substitution-pixel-frame": shadows.join(", ") || "none",
    "--substitution-pixel-image": paint.layers.length ? paint.layers.map((layer) => layer.url).join(", ") : "none",
    "--substitution-pixel-position": paint.layers.map((layer) => ("whole" in layer ? "0 0" : `${px(layer.x)} ${px(layer.y)}`)).join(", ") || "0 0",
    "--substitution-pixel-size": paint.layers.map((layer) => ("whole" in layer ? "100% 100%" : `${px(layer.w)} ${px(layer.h)}`)).join(", ") || "auto",
    "--substitution-pixel-origin": paint.local ? "padding-box" : "border-box",
    "--substitution-pixel-attachment": paint.local ? "local" : "scroll",
  };
  for (const side of sides) properties[`--substitution-pixel-border-${side}`] = paint.borders.includes(side) ? frame : "transparent";
  return properties;
}
