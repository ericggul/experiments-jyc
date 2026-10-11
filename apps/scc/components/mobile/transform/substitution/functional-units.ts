import { commandFor, type CommandGroup } from "./semantic";

/** Where a unit is drawn: its own painted box, or the text, media and painted boxes it visibly consists of. */
export type Part = Element | Text;
/** Stacking depth: 0 scrolls with the page; each fixed, sticky, full-size absolute or dialog ancestor adds one. */
export type FunctionalUnit = { element: Element; label: string | null; parts: Part[]; clips: Element[]; layer: number };

export const interactiveSelector = "button, a, input, textarea, select, summary, [role='button'], [role='link'], [role='tab'], [role='checkbox'], [role='slider']";
const content = "h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, [role='heading']";
const media = "img, video, canvas, iframe";
const surface = "[role='dialog'], [role='menu'], [role='listbox']";
const textLeaf = "span, strong, small, time, label, dt, dd, div";
const graphic = "img, video, canvas, iframe, svg, input, textarea, select, picture";
const clipping = /^(auto|scroll|hidden|clip)$/;
const excluded = "script, style, noscript, [data-substitution-overlay], [data-substitution-ui]";

const isColor = (value: string) =>
  value !== "transparent" && value !== "none" && !/^rgba?\(0, 0, 0, 0\)$/.test(value) && !/^rgba\(.*, 0\)$/.test(value);

/** Whether the element draws a visible box of its own (fill, border, or shadow). */
function painted(style: CSSStyleDeclaration) {
  if (isColor(style.backgroundColor) || style.backgroundImage !== "none" || style.boxShadow !== "none") return true;
  return (["Top", "Right", "Bottom", "Left"] as const).some((side) =>
    parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
    style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none" &&
    isColor(style.getPropertyValue(`border-${side.toLowerCase()}-color`)));
}

function selectUnits() {
  const selected: Element[] = [];
  for (const element of document.body.querySelectorAll("*")) {
    if (element.closest(excluded)) continue;
    if (element.matches(interactiveSelector)) {
      if (element.parentElement?.closest(interactiveSelector)) continue;
    } else if (element.matches(surface)) {
      if (element.parentElement?.closest(surface)) continue;
    } else if (element.matches(media)) {
      if (element.parentElement?.closest(interactiveSelector)) continue;
      const rect = element.getBoundingClientRect();
      if (element.tagName.toLowerCase() !== "video" && (rect.width < 64 || rect.height < 48)) continue;
    } else if (element.matches(content)) {
      if (element.parentElement?.closest(interactiveSelector) || element.parentElement?.closest(content)) continue;
    } else if (element.matches(textLeaf)) {
      if (element.parentElement?.closest(interactiveSelector) || element.parentElement?.closest(content)) continue;
      if (!Array.from(element.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())) continue;
      if (Array.from(element.children).some((child) => child.textContent?.trim() || child.matches(interactiveSelector) || child.matches(content) || child.matches(media))) continue;
    } else {
      continue;
    }
    selected.push(element);
  }
  return selected;
}

/**
 * One unit per action target or coherent content surface, each drawn at the size it is seen.
 * Must run while the clone's own styles are visible: fills and borders decide each unit's box.
 */
export function collectFunctionalUnits(clone: string, group: CommandGroup): FunctionalUnit[] {
  const styles = new Map<Element, CSSStyleDeclaration>();
  const styleOf = (element: Element) => {
    let style = styles.get(element);
    if (!style) styles.set(element, (style = window.getComputedStyle(element)));
    return style;
  };
  const viewportArea = window.innerWidth * window.innerHeight;
  const hidden = (element: Element) => {
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
      const style = styleOf(node);
      if (style.visibility === "hidden" || style.opacity === "0" || style.display === "none") return true;
    }
    return false;
  };

  const placement = (element: Element) => {
    const clips: Element[] = [];
    let layer = 0;
    for (let node: Element | null = element; node && node !== document.documentElement; node = node.parentElement) {
      const style = styleOf(node);
      if (node !== element && (clipping.test(style.overflowX) || clipping.test(style.overflowY))) clips.push(node);
      // Each fixed, sticky, full-size absolute or dialog ancestor lifts the element one stacking level.
      if (style.position === "fixed" || style.position === "sticky" || node.matches(surface)) layer++;
      else if (style.position === "absolute") {
        const box = node.getBoundingClientRect();
        if (box.width * box.height > viewportArea * 0.5) layer++;
      }
    }
    return { clips, layer };
  };

  const candidates = selectUnits();
  const unitSet = new Set(candidates);
  // How many candidates each ancestor holds; a wrapper may lend its box only to its single unit.
  const held = new Map<Element, number>();
  for (const candidate of candidates) {
    for (let node = candidate.parentElement; node && node !== document.body; node = node.parentElement) held.set(node, (held.get(node) ?? 0) + 1);
  }
  const units: FunctionalUnit[] = [];
  const claimed = new Set<Element>();

  for (const element of candidates) {
    if (hidden(element)) continue;
    const label = commandFor(element, clone, group);
    if (!label) continue;

    let parts: Part[] | null = null;
    const field = element.matches("input, textarea, select");
    if (painted(styleOf(element)) || (!field && element.matches(graphic))) parts = [element];
    else {
      // A control whose painted field is its wrapper (a search input inside a grey label) takes the wrapper's box.
      for (let wrapper = element.parentElement, depth = 0; wrapper && depth < 3 && wrapper !== document.body && wrapper.tagName !== "MAIN"; wrapper = wrapper.parentElement, depth++) {
        if (claimed.has(wrapper) || (held.get(wrapper) ?? 0) > 1) break;
        const box = wrapper.getBoundingClientRect();
        if (box.width * box.height > viewportArea * 0.5) break;
        if (painted(styleOf(wrapper))) {
          parts = [wrapper];
          claimed.add(wrapper);
          break;
        }
      }
    }
    if (!parts && field) parts = [element];
    if (!parts) {
      // Otherwise the visible ink: text runs, graphics, and painted boxes inside it.
      parts = [];
      const visit = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent?.trim()) parts!.push(child as Text);
          } else if (child instanceof Element) {
            if (hidden(child)) continue;
            if (child.matches(graphic) || painted(styleOf(child))) parts!.push(child);
            else visit(child);
          }
        }
      };
      visit(element);
      if (!parts.length) parts = [element];
    }

    const { clips, layer } = placement(element);
    units.push({ element, label, parts, clips, layer });
  }

  // Painted surfaces of fixed chrome that are not units themselves (a header bar, a floating tab pill) still hide what scrolls beneath them.
  for (const element of document.body.querySelectorAll("*")) {
    if (unitSet.has(element) || claimed.has(element) || element.closest(excluded) || element.closest("svg")) continue;
    if (!painted(styleOf(element)) || hidden(element)) continue;
    let insideUnit = false;
    for (let node = element.parentElement; node && !insideUnit; node = node.parentElement) insideUnit = unitSet.has(node);
    if (insideUnit) continue;
    const { clips, layer } = placement(element);
    if (layer) units.push({ element, label: null, parts: [element], clips, layer });
  }

  return units;
}

/** The unit's visible bounds right now: the union of its parts. */
export function unitRect(unit: FunctionalUnit, range: Range) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const part of unit.parts) {
    if (!part.isConnected) continue;
    let rect: DOMRect;
    if (part instanceof Text) {
      range.selectNodeContents(part);
      rect = range.getBoundingClientRect();
    } else rect = part.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}
