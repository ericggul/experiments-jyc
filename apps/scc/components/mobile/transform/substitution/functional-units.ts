import { commandFor, type CommandGroup } from "./semantic";

export type FunctionalUnit = { element: Element; label: string };

export const interactiveSelector = "button, a, input, textarea, select, summary, [role='button'], [role='link'], [role='tab'], [role='checkbox'], [role='slider']";
const content = "h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, [role='heading']";
const media = "img, video, canvas, iframe";
const surface = "[role='dialog'], [role='menu'], [role='listbox']";
const textLeaf = "span, strong, small, time, label, dt, dd, div";

/** One rectangle per action target or coherent content surface, not per DOM box. */
export function collectFunctionalUnits(clone: string, group: CommandGroup): FunctionalUnit[] {
  const units: FunctionalUnit[] = [];
  const elements = document.body.querySelectorAll("*");

  for (const element of elements) {
    if (element.closest("script, style, noscript, [data-substitution-overlay], [data-substitution-ui]")) continue;

    const isInteractive = element.matches(interactiveSelector);
    if (isInteractive) {
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

    const label = commandFor(element, clone, group);
    if (label) units.push({ element, label });
  }

  return units;
}
