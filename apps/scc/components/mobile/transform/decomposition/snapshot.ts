import type { Atom } from "./collect";

/**
 * Computed properties frozen onto a copy, so it keeps its appearance once lifted
 * out of the ancestors whose selectors styled it. Class names stay for
 * pseudo-elements and keyframes; inline values win over them.
 */
const boxProperties = [
  "display", "position", "top", "right", "bottom", "left", "z-index", "float",
  "box-sizing", "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius",
  "overflow-x", "overflow-y", "text-overflow", "white-space", "word-break", "overflow-wrap",
  "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "order",
  "align-items", "align-self", "align-content", "justify-content", "justify-items", "justify-self", "row-gap", "column-gap",
  "grid-template-columns", "grid-template-rows", "grid-auto-flow", "grid-auto-columns", "grid-auto-rows",
  "grid-column-start", "grid-column-end", "grid-row-start", "grid-row-end",
  "background-color", "background-image", "background-size", "background-position", "background-repeat", "background-clip",
  "font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variant-numeric",
  "line-height", "letter-spacing", "text-align", "text-transform", "text-indent", "vertical-align",
  "text-decoration-line", "text-decoration-color", "-webkit-line-clamp", "-webkit-box-orient", "list-style-type",
  "transform", "transform-origin", "filter", "backdrop-filter", "box-shadow", "text-shadow", "clip-path", "mix-blend-mode",
  "object-fit", "object-position", "aspect-ratio", "cursor", "pointer-events",
];
const paintProperties = ["color", "opacity", "visibility", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"];
const allProperties = [...boxProperties, ...paintProperties];


function freeze(source: Element, copy: Element) {
  const computed = window.getComputedStyle(source);
  const target = (copy as HTMLElement | SVGElement).style;
  const properties = source instanceof SVGElement && !(source instanceof SVGSVGElement) ? paintProperties : allProperties;
  for (const property of properties) target.setProperty(property, computed.getPropertyValue(property));
  if (computed.position === "fixed") target.setProperty("position", "absolute");
  if (computed.position === "sticky") target.setProperty("position", "relative");

  copy.removeAttribute("id");
  copy.removeAttribute("autofocus");
  if (copy instanceof HTMLInputElement && copy.type === "radio" && copy.name) copy.name = `decomposition-${copy.name}`;
  if (copy instanceof HTMLImageElement) copy.loading = "eager";
  if (source instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
    try {
      copy.getContext("2d")?.drawImage(source, 0, 0);
    } catch {
      // A tainted or lost canvas stays blank.
    }
  }
  if (source instanceof HTMLVideoElement && copy instanceof HTMLVideoElement) {
    copy.muted = true;
    copy.playsInline = true;
    copy.currentTime = source.currentTime;
    if (!source.paused) void copy.play().catch(() => undefined);
  }

  for (let index = 0; index < source.children.length; index++) {
    const child = copy.children[index];
    if (child) freeze(source.children[index], child);
  }
}

const textProperties = [
  "color", "-webkit-text-fill-color", "font-family", "font-size", "font-weight", "font-style", "font-stretch",
  "font-variant-numeric", "line-height", "letter-spacing", "word-spacing", "text-transform",
  "text-decoration-line", "text-decoration-color", "text-shadow", "white-space",
];
const shapeProperties = boxProperties.filter((property) => /^(border|background|box-shadow|filter|clip-path)/.test(property));

const sized = (node: HTMLElement, width: number, height: number) => {
  node.style.boxSizing = "border-box";
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
  node.style.margin = "0";
  return { node, width, height };
};

/** A detached, self-styled copy of one atom at its current size. */
export function snapshotAtom(atom: Atom) {
  if (atom.kind === "text") {
    const range = document.createRange();
    range.selectNodeContents(atom.node);
    const rect = range.getBoundingClientRect();
    range.detach();
    const computed = window.getComputedStyle(atom.anchor);
    const span = document.createElement("span");
    span.textContent = atom.node.textContent?.trim() ?? "";
    for (const property of textProperties) span.style.setProperty(property, computed.getPropertyValue(property));
    span.style.display = "block";
    span.style.overflow = "visible";
    const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.25;
    if (rect.height < lineHeight * 1.5) span.style.whiteSpace = "nowrap";
    return sized(span, Math.ceil(rect.width) + 1, rect.height);
  }

  const element = atom.anchor;
  const rect = element.getBoundingClientRect();
  if (atom.kind === "box") {
    const computed = window.getComputedStyle(element);
    const box = document.createElement("div");
    for (const property of shapeProperties) box.style.setProperty(property, computed.getPropertyValue(property));
    return sized(box, rect.width, rect.height);
  }

  const copy = element.cloneNode(true) as HTMLElement;
  freeze(element, copy);
  const style = copy.style;
  style.display = element instanceof SVGSVGElement || /^inline(?!-)/.test(style.display) ? "block" : style.display;
  style.position = "relative";
  style.inset = "auto";
  style.transform = "none";
  style.opacity = "1";
  return sized(copy, rect.width, rect.height);
}

/** Element-child indices from `root` down to `node`. */
export function pathTo(root: Element, node: Element) {
  const path: number[] = [];
  for (let element: Element | null = node; element && element !== root; element = element.parentElement) {
    const parent: Element | null = element.parentElement;
    if (!parent) return [];
    path.unshift(Array.prototype.indexOf.call(parent.children, element));
  }
  return path;
}

/** The deepest element of `root` the path still reaches. */
export function resolvePath(root: Element, path: readonly number[]) {
  let element = root;
  for (const index of path) {
    const child = element.children[index];
    if (!child) break;
    element = child;
  }
  return element;
}
