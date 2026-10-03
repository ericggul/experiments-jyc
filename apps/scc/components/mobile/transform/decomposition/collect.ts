/**
 * The smallest visible things an interface is drawn from:
 * - `text`: one text node (React splits "50" and "min" into two),
 * - `graphic`: an icon, image, video, canvas, or frame,
 * - `field`: an input, textarea, or select with its own box,
 * - `box`: an element's own fill, border, or shadow, without its contents.
 */
export type AtomKind = "text" | "graphic" | "field" | "box";
export type Atom = { node: Node; anchor: Element; kind: AtomKind; index: number };

const graphic = "img, svg, video, canvas, iframe, picture";
const field = "input:not([type='hidden']), textarea, select";

const visibleColor = (color: string) => {
  if (color === "transparent") return false;
  const parts = color.match(/rgba?\(([^)]+)\)/)?.[1].split(/[\s,/]+/).filter(Boolean);
  return !parts || parts.length < 4 || Number(parts[3]) > 0.04;
};

function isBox(style: CSSStyleDeclaration, rect: DOMRect) {
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.width * rect.height > window.innerWidth * window.innerHeight * 0.5) return false;
  if (visibleColor(style.backgroundColor) || style.backgroundImage !== "none" || style.boxShadow !== "none") return true;
  return (["Top", "Right", "Bottom", "Left"] as const).some((side) =>
    parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 &&
    style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none" &&
    visibleColor(style.getPropertyValue(`border-${side.toLowerCase()}-color`)));
}

/** All atoms under `root`, in document order (a box precedes what it contains). */
export function collectAtoms(root: Element, exclude: string, sourceAttribute: string) {
  const atoms: Atom[] = [];
  const range = document.createRange();

  const visit = (element: Element) => {
    if (element.matches(exclude)) return;
    const style = window.getComputedStyle(element);
    if (style.display === "none") return;
    if (!element.hasAttribute(sourceAttribute) && Number(style.opacity) < 0.05) return;
    const shown = style.visibility !== "hidden";

    if (element.matches(graphic) || element.matches(field)) {
      const rect = element.getBoundingClientRect();
      const minimum = element.matches("svg") ? 6 : 4;
      if (shown && rect.width >= minimum && rect.height >= minimum) {
        atoms.push({ node: element, anchor: element, kind: element.matches(field) ? "field" : "graphic", index: 0 });
      }
      return;
    }

    if (shown && element !== root && isBox(style, element.getBoundingClientRect())) {
      atoms.push({ node: element, anchor: element, kind: "box", index: 0 });
    }

    let textIndex = 0;
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        visit(child as Element);
      } else if (shown && child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        range.selectNodeContents(child);
        const rect = range.getBoundingClientRect();
        if (rect.width >= 1 && rect.height >= 1) atoms.push({ node: child, anchor: element, kind: "text", index: textIndex });
        textIndex++;
      }
    }
  };

  visit(root);
  range.detach();
  return atoms;
}

const covers = (element: Element) => {
  const style = window.getComputedStyle(element);
  if (!/^(fixed|absolute)$/.test(style.position) && !element.matches("dialog[open], [aria-modal='true']")) return false;
  const rect = element.getBoundingClientRect();
  const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return width > 0 && height > 0 && width * height >= window.innerWidth * window.innerHeight * 0.75;
};

/**
 * The interface currently in front. A positioned element covering most of the
 * viewport under its centre (a modal backdrop, story viewer, sheet) and holding
 * several atoms replaces the page behind it; otherwise the whole body.
 */
export function collectActiveInterface(exclude: string, sourceAttribute: string) {
  const hit = document
    .elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    .find((element) => !element.closest(exclude));
  for (let element = hit ?? null; element && element !== document.body; element = element.parentElement) {
    if (!covers(element)) continue;
    const atoms = collectAtoms(element, exclude, sourceAttribute);
    if (atoms.length >= 3) return { layer: element, atoms };
  }
  return { layer: document.body as Element, atoms: collectAtoms(document.body, exclude, sourceAttribute) };
}
